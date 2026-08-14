$ErrorActionPreference = "Stop"

if (-not $env:NANKAI_API_KEY) {
  throw "Missing required environment variable: NANKAI_API_KEY"
}

if (-not $env:NANKAI_BOT_ID) {
  throw "Missing required environment variable: NANKAI_BOT_ID"
}

$output = & python scripts/python/run_live_scenario.py 2>&1
if ($LASTEXITCODE -ne 0) {
  throw "scripts/python/run_live_scenario.py failed: $output"
}

$joined = ($output | Out-String)
if ($joined -notmatch "ANSWER_1_START") {
  throw "Expected scenario output to contain ANSWER_1_START"
}
if ($joined -notmatch "ANSWER_4_END") {
  throw "Expected scenario output to contain ANSWER_4_END"
}

Write-Output "LIVE_SCENARIO_PASS"
