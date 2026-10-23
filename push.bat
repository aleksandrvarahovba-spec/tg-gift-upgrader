@echo off
chcp 65001 >nul
set "PATH=C:\Users\Sanya\AppData\Local\Microsoft\WinGet\Packages\Git.MinGit_Microsoft.Winget.Source_8wekyb3d8bbwe\cmd;C:\Users\Sanya\AppData\Local\Microsoft\WinGet\Packages\Git.MinGit_Microsoft.Winget.Source_8wekyb3d8bbwe\ucrt64\bin;C:\Users\Sanya\AppData\Local\Programs\nodejs;%PATH%"
cd /d "%~dp0"

echo ======================================================================
echo   ОТПРАВКА ПРОЕКТА НА GITHUB (aleksandrvarahovba-spec/tg-gift-upgrader)
echo ======================================================================
echo.
echo Введите способ отправки:
echo [1] Через GitHub Personal Access Token (Самый надежный, 100%% рабочий)
echo [2] Попробовать автоматический вход через браузер
echo.
set /p choice="Ваш выбор (1 или 2, по умолчанию 1): "

if "%choice%"=="2" (
    echo.
    echo Попытка отправки через браузер...
    git push -u origin main
    goto check
)

echo.
echo Для создания токена перейдите по ссылке (галочка 'repo'):
echo https://github.com/settings/tokens
echo.
set /p token="Вставьте ваш Personal Access Token (ghp_...): "

if "%token%"=="" (
    echo Токен не введен. Пробуем обычный push...
    git push -u origin main
) else (
    echo Устанавливаем токен и отправляем...
    git remote set-url origin https://%token%@github.com/aleksandrvarahovba-spec/tg-gift-upgrader.git
    git push -u origin main
)

:check
echo.
if %ERRORLEVEL% EQU 0 (
    echo ======================================================================
    echo   [УСПЕХ] Все файлы и render.yaml успешно отправлены на GitHub!
    echo   Теперь нажмите кнопку Retry в панели Render!
    echo ======================================================================
) else (
    echo ======================================================================
    echo   [ОШИБКА] Не удалось отправить код на GitHub.
    echo ======================================================================
)

echo.
pause
