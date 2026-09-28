!include "LogicLib.nsh"

Var alegoFinalDirectory
Var alegoNewDirectory
Var alegoOldDirectory
Var alegoOldMoved
Var alegoNewMoved

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
    ClearErrors
    Rename $alegoOldDirectory $alegoFinalDirectory
    ${If} ${Errors}
      ; Leave the complete backup in place if another process prevents restoration.
      DetailPrint $alegoOldDirectory
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
    Rename $alegoFinalDirectory $alegoOldDirectory
    ${If} ${Errors}
      Call alegoRollbackDirectories
      SetErrors
      Return
    ${EndIf}
    StrCpy $alegoOldMoved "1"
  ${Else}
    ; NSIS can create the destination before the install section starts.
    RMDir $alegoFinalDirectory
  ${EndIf}
  ClearErrors
  Rename $alegoNewDirectory $alegoFinalDirectory
  ${If} ${Errors}
    Call alegoRollbackDirectories
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
