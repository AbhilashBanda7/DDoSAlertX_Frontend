# PowerShell script to start both frontend and backend servers
Write-Host "Network Traffic Analysis - Development Environment" -ForegroundColor Green
Write-Host "----------------------------------------------" -ForegroundColor Green
Write-Host "Starting development servers..." -ForegroundColor Yellow

# Define paths
$frontendPath = "$PSScriptRoot"
$backendPath = "$PSScriptRoot\..\backend"

# Start backend server
Write-Host "Starting backend server..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-Command cd '$backendPath'; python app.py"

# Wait a moment for the backend to initialize
Start-Sleep -Seconds 3

# Start frontend server
Write-Host "Starting frontend server..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-Command cd '$frontendPath'; npm start"

Write-Host "`nServers are running in separate windows." -ForegroundColor Green
Write-Host "- Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "- Backend: http://localhost:5000" -ForegroundColor White
Write-Host "`nClose the terminal windows to stop the servers." -ForegroundColor Yellow 