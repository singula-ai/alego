@echo off
setlocal DisableDelayedExpansion
set "signTool=%ALEGO_DESKTOP_WINDOWS_SIGNTOOL%"
set "certificateFile=%ALEGO_DESKTOP_WINDOWS_CER_FILE%"
set "tokenPin=%ALEGO_DESKTOP_WINDOWS_TOKEN_PIN%"
set "keyContainer=%ALEGO_DESKTOP_WINDOWS_KEY_CONTAINER%"
set "targetFile=%ALEGO_DESKTOP_WINDOWS_SIGN_TARGET%"
set "appendSignature="
if "%ALEGO_DESKTOP_WINDOWS_SIGN_APPEND%"=="1" set "appendSignature=/as"
set "ALEGO_DESKTOP_WINDOWS_SIGNTOOL="
set "ALEGO_DESKTOP_WINDOWS_CER_FILE="
set "ALEGO_DESKTOP_WINDOWS_TOKEN_PIN="
set "ALEGO_DESKTOP_WINDOWS_KEY_CONTAINER="
set "ALEGO_DESKTOP_WINDOWS_SIGN_TARGET="
set "ALEGO_DESKTOP_WINDOWS_SIGN_APPEND="
set "signTool=" & set "certificateFile=" & set "tokenPin=" & set "keyContainer=" & set "targetFile=" & set "appendSignature=" & "%signTool%" sign /v /fd sha256 /f "%certificateFile%" /kc "[{{%tokenPin%}}]=%keyContainer%" /csp "eToken Base Cryptographic Provider" %appendSignature% /tr http://timestamp.digicert.com /td sha256 "%targetFile%"
exit /b %errorlevel%
