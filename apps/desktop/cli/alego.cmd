@echo off
setlocal DisableDelayedExpansion
set "ELECTRON_RUN_AS_NODE=1"
"%~dp0..\..\..\..\Alego.exe" --expose-internals "%~dp0..\..\..\app.asar\alego\node_modules\@singula-ai\alego-desktop-host\lib\cli.js" %*
exit /b %errorlevel%
