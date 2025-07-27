@echo off
echo Enhanced Todo App MySQL Database Initialization
echo ===============================================

REM Database Configuration
set DB_HOST=localhost
set DB_PORT=3306
set DB_NAME=enhanced_todo_app
set DB_USER=root
set DB_PASSWORD=123456

echo Configuration:
echo    Database: %DB_NAME%
echo    Host: %DB_HOST%:%DB_PORT%
echo    User: %DB_USER%
echo.

REM Check if MySQL is available
mysql --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: MySQL command not found. Please ensure MySQL is installed and added to PATH
    pause
    exit /b 1
)

REM Ask for confirmation
set /p continue="Continue with database initialization? (y/N): "
if /i not "%continue%"=="y" (
    echo Cancelled initialization
    pause
    exit /b 1
)

REM Execute SQL script
echo Executing database initialization script...
mysql -h %DB_HOST% -P %DB_PORT% -u %DB_USER% -p%DB_PASSWORD% < database\init.sql

if errorlevel 1 (
    echo ERROR: Database initialization failed!
    echo Please check MySQL connection configuration and permissions
    pause
    exit /b 1
) else (
    echo SUCCESS: Database initialization completed!
    echo.
    echo Created tables:
    mysql -h %DB_HOST% -P %DB_PORT% -u %DB_USER% -p%DB_PASSWORD% -e "USE %DB_NAME%; SHOW TABLES;"
    
    echo.
    echo Next steps:
    echo    1. cd backend
    echo    2. npm install
    echo    3. npm start
    echo.
)

pause