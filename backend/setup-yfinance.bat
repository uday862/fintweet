@echo off
echo 🐍 Setting up YFinance for Fin-Tweet Backend...
echo.

echo 📦 Installing Python dependencies...
pip install -r requirements.txt

if %ERRORLEVEL% EQU 0 (
    echo ✅ Python dependencies installed successfully!
    echo.
    echo 🧪 Testing YFinance installation...
    python -c "import yfinance; print('✅ YFinance imported successfully!')"
    
    if %ERRORLEVEL% EQU 0 (
        echo.
        echo 🎯 YFinance setup completed successfully!
        echo 📝 You can now test the new route with: node test-yfinance-route.js
        echo.
    ) else (
        echo ❌ YFinance test failed. Please check your Python installation.
    )
) else (
    echo ❌ Failed to install Python dependencies.
    echo 📝 Make sure you have Python and pip installed.
)

pause
