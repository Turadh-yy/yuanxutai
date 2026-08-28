@echo off
chcp 65001 >nul
title 圆序台 - 一键部署
echo ==========================================
echo  圆序台 一键更新部署
echo ==========================================
echo.
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo [错误] 未找到 Node.js，请先安装
  pause
  exit /b 1
)

node update.js

echo.
pause
