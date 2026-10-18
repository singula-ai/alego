!include "LogicLib.nsh"

Var alegoFinalDirectory
Var alegoNewDirectory
Var alegoOldDirectory
Var alegoOldMoved
Var alegoNewMoved
Var alegoDirectoryError
Var alegoDirectorySource
Var alegoDirectoryDestination
Var alegoRestoreError
Var alegoDirectoryLogDirectory
Var alegoRecoveryStopped

; MoveFileEx preserves the destination and exposes the Windows error before rollback changes it.
; Open files inside a directory can make its rename return access denied (5).
!macro alegoDirectoryOperation SOURCE DESTINATION RESULT PHASE
  Push $0
  Push $1
  Push $2
  StrCpy $0 0
  ${Do}
    ${If} "${DESTINATION}" == ""
      System::Call 'kernel32::RemoveDirectoryW(w "${SOURCE}") i.r1 ?e'
    ${Else}
      System::Call 'kernel32::MoveFileExW(w "${SOURCE}", w "${DESTINATION}", i 0) i.r1 ?e'
    ${EndIf}
    Pop ${RESULT}
    ${If} "${DESTINATION}" == ""
      ${If} ${RESULT} == 2
      ${OrIf} ${RESULT} == 3
        StrCpy $1 1
      ${EndIf}
    ${EndIf}
    ${If} $1 != 0
      StrCpy ${RESULT} 0
      ${ExitDo}
    ${EndIf}
    ClearErrors
    FileOpen $2 "$PLUGINSDIR\directory-operations.log" a
    ${IfNot} ${Errors}
      FileSeek $2 0 END
      FileWrite $2 "${PHASE}: Windows error: ${RESULT}$\r$\n"
      FileClose $2
    ${EndIf}
    ${If} ${RESULT} != 5
    ${AndIf} ${RESULT} != 32
    ${AndIf} ${RESULT} != 33
      ${ExitDo}
    ${EndIf}
    IntOp $0 $0 + 1
    ${If} $0 >= 10
      ${ExitDo}
    ${EndIf}
    IntOp $1 $0 * 250
    Sleep $1
  ${Loop}
  Pop $2
  Pop $1
  Pop $0
!macroend

!macro alegoReportDirectoryFailure
  ${If} $alegoRestoreError != 0
    StrCpy $alegoRecoveryStopped "1"
  ${EndIf}
  !ifmacrodef customInstallerDirectoryFailed
    !insertmacro customInstallerDirectoryFailed
  !else
    DetailPrint "Directory operation failed ($alegoDirectoryError): $alegoDirectorySource -> $alegoDirectoryDestination; restore error: $alegoRestoreError"
  !endif
!macroend

!macro alegoExtractPayload FILE
  !ifmacrodef customInstallerExtract
    !insertmacro customInstallerExtract "${FILE}"
  !else
    nsExec::ExecToStack '"$PLUGINSDIR\alego-7za.exe" x -y -bd -bb0 "-o$INSTDIR" "${FILE}"'
    Pop $R0
    Pop $R1
  !endif
  ${If} $R0 != 0
    DetailPrint $R1
    Call alegoRollbackDirectories
    !ifmacrodef customInstallerExtractFailed
      !insertmacro customInstallerExtractFailed "${FILE}"
    !else
      MessageBox MB_OK|MB_ICONEXCLAMATION "$(decompressionFailed)" /SD IDOK
    !endif
    SetErrorLevel 2
    Quit
  ${EndIf}
!macroend

!macro alegoStageApplication
  !ifdef ALEGO_INSTALLER_LOG_DIR
    ; electron-builder defines the cache name after including our function bodies, before this section expands.
    StrCpy $alegoDirectoryLogDirectory "${ALEGO_INSTALLER_LOG_DIR}"
  !endif
  StrCpy $alegoFinalDirectory $INSTDIR
  System::Call 'ole32::CoCreateGuid(g .r0) i .r1'
  ${If} $1 != 0
    SetErrorLevel 2
    Quit
  ${EndIf}
  StrCpy $alegoNewDirectory "$INSTDIR.new-$0"
  StrCpy $alegoOldDirectory "$INSTDIR.old-$0"
  StrCpy $alegoOldMoved ""
  StrCpy $alegoNewMoved ""
  StrCpy $alegoDirectoryError 0
  StrCpy $alegoRestoreError 0
  StrCpy $alegoRecoveryStopped ""
  ClearErrors
  CreateDirectory $alegoNewDirectory
  ${If} ${Errors}
    SetErrorLevel 2
    Quit
  ${EndIf}
  File /oname=$PLUGINSDIR\alego-7za.exe "${ALEGO_SEVENZIP_PATH}"
  StrCpy $INSTDIR $alegoNewDirectory
  SetOutPath $INSTDIR
  !insertmacro installApplicationFiles
  !ifdef ALEGO_SEVENZIP_LICENSE_DIR
    File /oname=7zip-installer-LICENSE.txt "${ALEGO_SEVENZIP_LICENSE_DIR}\LICENSE.txt"
    File /oname=7zip-installer-COPYING.txt "${ALEGO_SEVENZIP_LICENSE_DIR}\COPYING"
  !endif
  !ifdef UNINSTALLER_ICON
    File /oname=uninstallerIcon.ico "${UNINSTALLER_ICON}"
  !endif
  StrCpy $INSTDIR $alegoFinalDirectory
  SetOutPath $PLUGINSDIR
!macroend

Function .onGUIEnd
  Call alegoCleanupDirectories
FunctionEnd

Function alegoCleanupDirectories
  ${If} $alegoRecoveryStopped == "1"
    Return
  ${EndIf}
  ${If} $alegoFinalDirectory != ""
    Call alegoRollbackDirectories
  ${EndIf}
FunctionEnd

; Only directories created or renamed by this installer are removed during rollback.
Function alegoRollbackDirectories
  SetOutPath $PLUGINSDIR
  ${If} $alegoNewMoved == "1"
    RMDir /r "\\?\$alegoFinalDirectory"
    StrCpy $alegoNewMoved ""
  ${EndIf}
  ${If} $alegoOldMoved == "1"
    !insertmacro alegoDirectoryOperation "$alegoOldDirectory" "$alegoFinalDirectory" $alegoRestoreError "restore"
    ${If} $alegoRestoreError != 0
      ; Leave the complete backup in place if another process prevents restoration.
      DetailPrint $alegoOldDirectory
      RMDir /r "\\?\$alegoNewDirectory"
      Return
    ${EndIf}
    StrCpy $alegoOldMoved ""
  ${EndIf}
  ${If} $alegoNewDirectory != ""
    RMDir /r "\\?\$alegoNewDirectory"
  ${EndIf}
  StrCpy $INSTDIR $alegoFinalDirectory
FunctionEnd

Function alegoPromoteDirectories
  !ifmacrodef InstallerPublishStage
    !insertmacro InstallerPublishStage 2
  !endif
  ; SetOutPath opens a directory handle; release it before either rename.
  SetOutPath $PLUGINSDIR
  ClearErrors
  ${If} ${FileExists} "$alegoFinalDirectory\*.*"
    StrCpy $alegoDirectorySource $alegoFinalDirectory
    StrCpy $alegoDirectoryDestination $alegoOldDirectory
    !insertmacro alegoDirectoryOperation "$alegoDirectorySource" "$alegoDirectoryDestination" $alegoDirectoryError "backup"
    ${If} $alegoDirectoryError != 0
      Call alegoRollbackDirectories
      !insertmacro alegoReportDirectoryFailure
      SetErrors
      Return
    ${EndIf}
    StrCpy $alegoOldMoved "1"
  ${Else}
    ; NSIS can create the destination before the install section starts.
    StrCpy $alegoDirectorySource $alegoFinalDirectory
    StrCpy $alegoDirectoryDestination ""
    !insertmacro alegoDirectoryOperation "$alegoDirectorySource" "" $alegoDirectoryError "remove-empty"
    ${If} $alegoDirectoryError != 0
      Call alegoRollbackDirectories
      !insertmacro alegoReportDirectoryFailure
      SetErrors
      Return
    ${EndIf}
  ${EndIf}
  ClearErrors
  StrCpy $alegoDirectorySource $alegoNewDirectory
  StrCpy $alegoDirectoryDestination $alegoFinalDirectory
  !insertmacro alegoDirectoryOperation "$alegoDirectorySource" "$alegoDirectoryDestination" $alegoDirectoryError "promote"
  ${If} $alegoDirectoryError != 0
    Call alegoRollbackDirectories
    !insertmacro alegoReportDirectoryFailure
    SetErrors
    Return
  ${EndIf}
  StrCpy $alegoNewMoved "1"
  SetOutPath $alegoFinalDirectory
  !ifmacrodef InstallerPublishStage
    !insertmacro InstallerPublishStage 3
  !endif
  ClearErrors
FunctionEnd

!macro alegoFinishDirectories
  StrCpy $alegoNewMoved ""
  ${If} $alegoOldMoved == "1"
    RMDir /r "\\?\$alegoOldDirectory"
    StrCpy $alegoOldMoved ""
  ${EndIf}
!macroend
