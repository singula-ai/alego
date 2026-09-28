; Compile against the production directory transaction using a private payload and target.
Unicode true
RequestExecutionLevel user
SilentInstall silent
Name "Desktop directory replacement smoke"
OutFile "${OUTPUT_FILE}"
LoadLanguageFile "${NSISDIR}\Contrib\Language files\English.nlf"
LangString decompressionFailed ${LANG_ENGLISH} "Payload extraction failed"

!macro installApplicationFiles
  !insertmacro alegoExtractPayload "${PAYLOAD_FILE}"
!macroend
!ifdef SOURCE_DLL
  LoadLanguageFile "${NSISDIR}\Contrib\Language files\SimpChinese.nlf"
  !include "..\..\installer\strings.nsh"
  !define ALEGO_INSTALLER_LOG_DIR "${REPORT_DIR}"
  !include "..\..\scripts\installer.nsh"
!else
  !include "..\..\scripts\installer-directories.nsh"
!endif

Section
  InitPluginsDir
  !ifdef SOURCE_DLL
    File "/oname=$PLUGINSDIR\window-frame.dll" "${SOURCE_DLL}"
  !endif
  StrCpy $INSTDIR "${TARGET_DIR}"
  !insertmacro alegoStageApplication
  !ifdef CANCELLED
    SetErrorLevel 2
    Call alegoCleanupDirectories
    Quit
  !endif
  !ifdef MISSING_STAGE
    ; A missing source makes the second rename fail after the old directory moved.
    RMDir /r "\\?\$alegoNewDirectory"
  !endif
  Call alegoPromoteDirectories
  IfErrors failed
  !insertmacro alegoFinishDirectories
  SetErrorLevel 0
  Quit
  failed:
  SetErrorLevel 2
  Quit
SectionEnd
