param(
  [int]$Port = 8000
)

$ErrorActionPreference = "Stop"
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $projectRoot

function Import-DotEnv([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path)) {
    return
  }

  foreach ($line in Get-Content -LiteralPath $Path) {
    $trimmed = $line.Trim()
    if ([string]::IsNullOrWhiteSpace($trimmed) -or $trimmed.StartsWith("#")) {
      continue
    }

    $parts = $trimmed -split "=", 2
    if ($parts.Count -ne 2) {
      continue
    }

    $name = $parts[0].Trim()
    $value = $parts[1].Trim()
    if ($value.Length -ge 2) {
      $first = $value.Substring(0, 1)
      $last = $value.Substring($value.Length - 1, 1)
      if (($first -eq '"' -and $last -eq '"') -or ($first -eq "'" -and $last -eq "'")) {
        $value = $value.Substring(1, $value.Length - 2)
      }
    }

    if ($name -match "^[A-Za-z_][A-Za-z0-9_]*$") {
      Set-Item -Path "Env:$name" -Value $value
    }
  }
}

Import-DotEnv (Join-Path $projectRoot ".env")

$npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
if (-not $npm) {
  throw "npm.cmd was not found. Install Node.js and reopen PowerShell."
}

Write-Host "Building browser runtime modules..."
& $npm.Source run runtime:build
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) {
  throw "python was not found. Install Python 3.11+ and reopen PowerShell."
}

$env:MENTAL_LLM_PORT = $Port.ToString()
if ([string]::IsNullOrWhiteSpace($env:MENTAL_LLM_WORKFLOW_GATEWAY_MODE)) {
  $env:MENTAL_LLM_WORKFLOW_GATEWAY_MODE = "agent_internal"
}

Write-Host "Local URL: http://127.0.0.1:$Port/"
Write-Host "Stop with Ctrl+C."
& $python.Source -m server.proxy_server
exit $LASTEXITCODE
