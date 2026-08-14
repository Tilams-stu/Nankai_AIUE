$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")

if (-not $env:NANKAI_API_KEY) {
  throw "Missing required environment variable: NANKAI_API_KEY"
}

if (-not $env:NANKAI_BOT_ID) {
  throw "Missing required environment variable: NANKAI_BOT_ID"
}

if (-not $env:NANKAI_TEST_QUERY) {
  $env:NANKAI_TEST_QUERY = "Hello, please return a short test reply."
}

$output = & python scripts/python/test_api.py 2>&1
if ($LASTEXITCODE -ne 0) {
  $joined = ($output | Out-String)
  if ($joined -match "API service is disabled") {
    throw "Live chat blocked because API service is disabled for the current Agent publish channel. Please enable/publish the API channel for this Agent and rerun. Details: $joined"
  }
  if ($joined -match "model no permission") {
    throw "Live chat blocked by Agent model permission. Please update the model configured inside the Mental LLM Agent and rerun. Details: $joined"
  }
  throw "scripts/python/test_api.py failed: $output"
}

$lines = @($output | Where-Object { $_ -and $_.Trim().Length -gt 0 })
if ($lines.Count -lt 1) {
  throw "Expected at least one streaming response line from NK-GeniOS."
}

Write-Output "LIVE_NANKAI_CHAT_PASS"
