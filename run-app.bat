@echo off
echo ========================================
echo   Cost Calculator - Uruchamianie...
echo ========================================
echo.

:: Sprawdz czy jestesmy w odpowiednim folderze
if not exist "package.json" (
    echo BLAD: Nie znaleziono package.json
    echo Upewnij sie, ze uruchamiasz skrypt z folderu aplikacji
    pause
    exit /b 1
)

:: Sprawdz czy node_modules istnieje
if not exist "node_modules" (
    echo Instalowanie zaleznosci...
    call npm install
    if errorlevel 1 (
        echo BLAD: Nie udalo sie zainstalowac zaleznosci
        pause
        exit /b 1
    )
)

echo.
echo Uruchamianie backendu...
start "Backend Server (Port 3001)" cmd /k "npm run server"

:: Poczekaj 3 sekundy aby backend sie uruchomil
timeout /t 3 /nobreak >nul

echo Uruchamianie frontendu...
start "Frontend (Port 3000)" cmd /k "npm start"

:: Poczekaj 5 sekund zanim otworzysz przegladarke
timeout /t 5 /nobreak >nul

echo.
echo Otwieranie przegladarki...
start http://localhost:3000

echo.
echo ========================================
echo   Aplikacja uruchomiona!
echo ========================================
echo.
echo Backend:  http://localhost:3001
echo Frontend: http://localhost:3000
echo.
echo Aby zatrzymac aplikacje, zamknij okna
echo terminala z backendendem i frontendem.
echo.
pause
