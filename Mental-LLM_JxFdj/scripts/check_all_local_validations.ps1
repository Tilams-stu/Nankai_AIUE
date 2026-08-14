$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$npm = "npm.cmd"

Write-Output "[1/7] Running TypeScript typecheck..."
Push-Location $projectRoot
try {
  & $npm run typecheck
  if ($LASTEXITCODE -ne 0) {
    throw "npm run typecheck failed."
  }

  Write-Output "[2/7] Running smoke check..."
  & $npm run smoke
  if ($LASTEXITCODE -ne 0) {
    throw "npm run smoke failed."
  }

  Write-Output "[3/7] Running conversation continuity check..."
  & powershell -ExecutionPolicy Bypass -File (Join-Path $projectRoot "scripts\check_conversation_continuity.ps1")
  if ($LASTEXITCODE -ne 0) {
    throw "Conversation continuity check failed."
  }

  Write-Output "[4/7] Running local audit workflow check..."
  & powershell -ExecutionPolicy Bypass -File (Join-Path $projectRoot "scripts\check_local_audit_gateway.ps1")
  if ($LASTEXITCODE -ne 0) {
    throw "Local audit workflow check failed."
  }

  Write-Output "[5/7] Running forward workflow offline check..."
  & powershell -ExecutionPolicy Bypass -File (Join-Path $projectRoot "scripts\check_forward_workflow_gateway.ps1")
  if ($LASTEXITCODE -ne 0) {
    throw "Forward workflow offline check failed."
  }

  Write-Output "[6/7] Running direct-use default workflow path check..."
  & powershell -ExecutionPolicy Bypass -File (Join-Path $projectRoot "scripts\check_agent_internal_default_path.ps1")
  if ($LASTEXITCODE -ne 0) {
    throw "Agent-internal default workflow path check failed."
  }

  Write-Output "[7/7] Running structured model-permission error path check..."
  & powershell -ExecutionPolicy Bypass -File (Join-Path $projectRoot "scripts\check_upstream_model_permission_error.ps1")
  if ($LASTEXITCODE -ne 0) {
    throw "Structured model-permission error path check failed."
  }
} finally {
  Pop-Location
}

Write-Output "ALL_LOCAL_VALIDATIONS_PASS"
