@echo off
set "PATH=C:\Users\Sanya\AppData\Local\Microsoft\WinGet\Packages\Git.MinGit_Microsoft.Winget.Source_8wekyb3d8bbwe\cmd;C:\Users\Sanya\AppData\Local\Microsoft\WinGet\Packages\Git.MinGit_Microsoft.Winget.Source_8wekyb3d8bbwe\ucrt64\bin;C:\Users\Sanya\AppData\Local\Programs\nodejs;%PATH%"
cd /d "C:\Users\Sanya\Documents\krutekazino"

echo ============================================================
echo   Отправка проекта на GitHub: main branch
echo ============================================================
echo.
git push -u origin main
echo.
if %ERRORLEVEL% EQU 0 (
    echo [УСПЕХ] Код и render.yaml успешно отправлены на GitHub!
    echo Теперь нажимайте кнопку Retry в панели Render.
) else (
    echo [ИНФО] Если GitHub запросил авторизацию, войдите через браузер или введите Personal Access Token.
)
timeout /t 10
