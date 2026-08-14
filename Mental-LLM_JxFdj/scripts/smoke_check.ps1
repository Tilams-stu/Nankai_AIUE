$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$port = "8765"
$python = "python"

$env:MENTAL_LLM_PORT = $port
$env:NANKAI_API_KEY = ""
$env:MENTAL_LLM_WORKFLOW_GATEWAY_MODE = "disabled"

$process = Start-Process -FilePath $python `
  -ArgumentList @("-m", "server.proxy_server") `
  -WorkingDirectory $projectRoot `
  -PassThru `
  -WindowStyle Hidden

try {
  Start-Sleep -Seconds 2

  $indexResponse = Invoke-WebRequest -Uri "http://127.0.0.1:$port/" -UseBasicParsing
  if ($indexResponse.StatusCode -ne 200) {
    throw "Expected index status 200, got $($indexResponse.StatusCode)"
  }

  $assetPaths = @(
    "/manifest.json",
    "/src/styles/legacy-page.css",
    "/src/styles/base.css",
    "/src/styles/layout.css",
    "/src/styles/components.css",
    "/src/app/soundGridRuntime.js",
    "/src/app/modelRuntime.js",
    "/src/app/navigationRuntime.js",
    "/src/app/meditationRuntime.js",
    "/src/app/profileChartRuntime.js",
    "/src/app/formRuntime.js",
    "/src/app/messageRuntime.js",
    "/src/app/speechRuntime.js",
    "/src/app/chatRuntime.js",
    "/src/app/sessionRuntime.js",
    "/src/app/statusNoticeRuntime.js",
    "/src/app/safetyRuntime.js",
    "/src/app/sessionControlRuntime.js",
    "/src/app/uploadRuntime.js",
    "/src/app/uploadDebugRuntime.js",
    "/src/app/loginRuntime.js",
    "/src/app/reportDraftRuntime.js",
    "/src/app/pageRuntime.js",
    "/runtime/app/appState.js",
    "/runtime/contracts/workflowAuditContract.js",
    "/runtime/contracts/workflowContract.js",
    "/runtime/contracts/sessionSnapshotContract.js",
    "/runtime/domain/conversationContext.js",
    "/runtime/domain/conversationPolicy.js",
    "/runtime/services/chatService.js",
    "/runtime/services/conversationContextService.js",
    "/runtime/services/conversationPolicyService.js",
    "/runtime/services/reportDraftService.js",
    "/runtime/services/sessionService.js",
    "/runtime/services/sessionSnapshotService.js",
    "/runtime/services/transcriptService.js",
    "/runtime/services/workflowAuditService.js",
    "/runtime/services/workflowService.js",
    "/runtime/domain/session.js",
    "/runtime/domain/safetyStatus.js",
    "/runtime/domain/transcript.js",
    "/runtime/domain/uploadStatus.js",
    "/runtime/utils/sseParser.js",
    "/runtime/utils/sanitizeText.js",
    "/images/tubiao.png",
    "/models/original.glb",
    "/models/sleep.glb",
    "/models/bachelor.glb",
    "/models/sport.glb",
    "/models/shy.glb",
    "/models/no.glb",
    "/models/thumbsup.glb"
  )

  foreach ($assetPath in $assetPaths) {
    $assetResponse = Invoke-WebRequest -Uri "http://127.0.0.1:$port$assetPath" -Method Head -UseBasicParsing
    if ($assetResponse.StatusCode -ne 200) {
      throw "Expected asset $assetPath status 200, got $($assetResponse.StatusCode)"
    }
  }

  $body = @{
    bot_id = "synthetic_bot"
    user_id = "synthetic_user"
    stream = $true
    auto_save_history = $true
    additional_messages = @(@{
      role = "user"
      content = "hello"
      content_type = "text"
    })
  } | ConvertTo-Json -Depth 5

  try {
    Invoke-WebRequest `
      -Uri "http://127.0.0.1:$port/api/chat" `
      -Method POST `
      -ContentType "application/json" `
      -Body $body `
      -UseBasicParsing | Out-Null
    throw "Expected missing key request to fail"
  } catch {
    $response = $_.Exception.Response
    if ($null -eq $response) {
      throw
    }
    if ([int]$response.StatusCode -ne 500) {
      throw "Expected missing key status 500, got $([int]$response.StatusCode)"
    }
  }

  $statusResponse = Invoke-WebRequest -Uri "http://127.0.0.1:$port/api/workflow/status" -UseBasicParsing
  if ($statusResponse.StatusCode -ne 200) {
    throw "Expected workflow status 200, got $($statusResponse.StatusCode)"
  }
  $statusJson = $statusResponse.Content | ConvertFrom-Json
  if ($statusJson.mode -ne "disabled") {
    throw "Expected workflow status mode disabled, got $($statusJson.mode)"
  }
  if ($statusJson.enabled -ne $false) {
    throw "Expected workflow status enabled false"
  }

  $auditListResponse = Invoke-WebRequest -Uri "http://127.0.0.1:$port/api/workflow/audit-records?limit=3" -UseBasicParsing
  if ($auditListResponse.StatusCode -ne 200) {
    throw "Expected workflow audit-records status 200, got $($auditListResponse.StatusCode)"
  }
  $auditListJson = $auditListResponse.Content | ConvertFrom-Json
  if ($null -eq $auditListJson.records) {
    throw "Expected workflow audit-records response to include records"
  }

  $workflowBody = @{
    input = "# synthetic report"
    SEVERITY_LEVEL = "needs_follow_up"
    Student_ID = "2023001"
    time = "2026-07-25 10:00:00"
  } | ConvertTo-Json -Depth 3

  try {
    Invoke-WebRequest `
      -Uri "http://127.0.0.1:$port/api/workflow/report-to-feishu" `
      -Method POST `
      -ContentType "application/json" `
      -Body $workflowBody `
      -UseBasicParsing | Out-Null
    throw "Expected disabled workflow gateway request to fail"
  } catch {
    $response = $_.Exception.Response
    if ($null -eq $response) {
      throw
    }
    if ([int]$response.StatusCode -ne 503) {
      throw "Expected disabled workflow gateway status 503, got $([int]$response.StatusCode)"
    }
  }

  Write-Output "SMOKE_CHECK_PASS"
} finally {
  if ($process -and -not $process.HasExited) {
    Stop-Process -Id $process.Id -Force
    $process.WaitForExit()
  }
}
