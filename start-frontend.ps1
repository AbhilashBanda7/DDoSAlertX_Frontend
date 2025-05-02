# PowerShell script to start the frontend server
Write-Host "Starting Network Traffic Analysis Frontend..." -ForegroundColor Green
Write-Host "----------------------------------------------" -ForegroundColor Green

# Set API URL environment variable
$env:REACT_APP_API_URL = "https://ddosalertx-backend.onrender.com"
Write-Host "Using API URL: $env:REACT_APP_API_URL" -ForegroundColor Cyan

# Start frontend server
npm start 