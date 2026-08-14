param(
  [int]$Port = 8000
)

$ErrorActionPreference = "Stop"
$ngrok = Get-Command ngrok.exe -ErrorAction SilentlyContinue
if (-not $ngrok) {
  throw "ngrok.exe was not found. Install Ngrok and reopen PowerShell."
}

try {
  Invoke-WebRequest -Uri "http://127.0.0.1:$Port/" -UseBasicParsing -TimeoutSec 5 | Out-Null
} catch {
  throw "Local project is not responding on port $Port. Start scripts/start_local.ps1 first."
}

Write-Host "Starting temporary HTTP tunnel to http://127.0.0.1:$Port/"
Write-Host "Stop with Ctrl+C. Do not share the URL beyond the intended testers."
Write-Host "If Ngrok asks for authentication, run: ngrok config add-authtoken <YOUR_TOKEN>"
& $ngrok.Source http $Port
exit $LASTEXITCODE
