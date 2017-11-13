@echo off
if [%PROCESSOR_ARCHITECTURE%] == [AMD64] goto arch64
if [%PROCESSOR_ARCHITEW6432%] == [AMD64] goto arch64

"%~dp0\mingw32\luajit.exe" %*
goto end

:arch64
"%~dp0\mingw64\luajit.exe" %*
:end
