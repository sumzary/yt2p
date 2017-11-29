@echo off
setlocal
cd "%~dp0data"
call luajit "%~n0.lua" %*
