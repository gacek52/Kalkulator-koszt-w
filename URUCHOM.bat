@echo off
echo ====================================
echo Kalkulator Kosztow Produkcyjnych
echo ====================================
echo.

cd /d "%~dp0"

REM Sprawdz czy Node.js jest zainstalowany
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo BLAD: Node.js nie jest zainstalowany!
    echo Pobierz i zainstaluj Node.js z: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo Sprawdzam Node.js... OK
echo.

REM Sprawdz czy istnieje folder node_modules
if not exist "node_modules" (
    echo Instaluje zaleznosci...
    echo To moze potrwac kilka minut...
    echo.
    npm install
    if %errorlevel% neq 0 (
        echo.
        echo BLAD: Nie udalo sie zainstalowac zaleznosci!
        echo Sprobuj uruchomic jako Administrator
        echo.
        pause
        exit /b 1
    )
) else (
    echo Zaleznosci juz zainstalowane... OK
)

echo.
echo Uruchamiam aplikacje...
echo Aplikacja otworzy sie w przegladarce na: http://localhost:3000
echo.
echo Aby zatrzymac serwer, nacisnij Ctrl+C
echo.

npm start

if %errorlevel% neq 0 (
    echo.
    echo BLAD: Nie udalo sie uruchomic aplikacji!
    echo.
    pause
)