@echo off
chcp 65001 >nul
echo ================================================
echo  Платформа управления доступом к сетевым ресурсам
echo ================================================
echo.

where node >nul 2>&1
if %errorlevel% neq 0 (
  echo [ОШИБКА] Node.js не установлен!
  echo Скачайте с https://nodejs.org/
  pause
  exit /b 1
)

echo [OK] Node.js найден
echo.
echo Установка зависимостей...
call npm install
if %errorlevel% neq 0 (
  echo [ОШИБКА] npm install завершился с ошибкой
  pause
  exit /b 1
)

echo.
echo Запуск сервера...
echo Откройте браузер: http://localhost:3000
echo.
node server.js
pause
