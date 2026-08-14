$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")

Write-Output "[0/4] Running live integration preflight..."
& powershell -ExecutionPolicy Bypass -File (Join-Path $projectRoot "scripts\check_live_integration_prerequisites.ps1")
if ($LASTEXITCODE -ne 0) {
  throw "Live integration preflight failed."
}

Write-Output "[1/4] Running live NK-GeniOS chat check..."
& powershell -ExecutionPolicy Bypass -File (Join-Path $projectRoot "scripts\check_live_nankai_chat.ps1")
if ($LASTEXITCODE -ne 0) {
  throw "Live NK-GeniOS chat check failed."
}

Write-Output "[2/4] Running live multi-turn scenario check..."
& powershell -ExecutionPolicy Bypass -File (Join-Path $projectRoot "scripts\check_live_scenario.ps1")
if ($LASTEXITCODE -ne 0) {
  throw "Live multi-turn scenario check failed."
}

Write-Output "[3/4] Running workflow path check..."
$workflowGatewayMode = [Environment]::GetEnvironmentVariable("MENTAL_LLM_WORKFLOW_GATEWAY_MODE")
if ([string]::IsNullOrWhiteSpace($workflowGatewayMode)) {
  $workflowGatewayMode = "agent_internal"
}
$workflowGatewayMode = $workflowGatewayMode.Trim()

if ($workflowGatewayMode -eq "forward") {
  & powershell -ExecutionPolicy Bypass -File (Join-Path $projectRoot "scripts\check_live_workflow_forward.ps1")
  if ($LASTEXITCODE -ne 0) {
    throw "Live workflow forward check failed."
  }
} else {
  Write-Output "Skipping live workflow forward check because the primary path is Agent-internal workflow invocation."
}

Write-Output "Manual steps still required: confirm Agent-internal report-to-feishu execution and Feishu row visibility."
Write-Output "ALL_LIVE_AUTOMATED_CHECKS_PASS"
