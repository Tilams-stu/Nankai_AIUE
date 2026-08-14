$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$proxyPort = "8894"
$mockPort = "8898"
$blockedModelId = "mock-model-no-permission-001"

$env:MENTAL_LLM_MOCK_CHAT_PORT = $mockPort
$env:MENTAL_LLM_MOCK_BLOCKED_MODEL_ID = $blockedModelId
$env:MENTAL_LLM_PORT = $proxyPort
$env:NANKAI_API_KEY = "mock-key"
$env:NANKAI_BASE_URL = "http://127.0.0.1:$mockPort/api/proxy/api/v1"

$mockProcess = Start-Process -FilePath "python" `
  -ArgumentList @("-m", "server.mock_chat_upstream") `
  -WorkingDirectory $projectRoot `
  -PassThru `
  -WindowStyle Hidden

$proxyProcess = Start-Process -FilePath "python" `
  -ArgumentList @("-m", "server.proxy_server") `
  -WorkingDirectory $projectRoot `
  -PassThru `
  -WindowStyle Hidden

try {
  $proxyReady = $false
  for ($attempt = 0; $attempt -lt 20; $attempt++) {
    Start-Sleep -Milliseconds 500
    try {
      $indexResponse = Invoke-WebRequest -Uri "http://127.0.0.1:$proxyPort/" -UseBasicParsing
      if ($indexResponse.StatusCode -eq 200) {
        $proxyReady = $true
        break
      }
    } catch {}
  }

  if (-not $proxyReady) {
    throw "Proxy did not become ready on port $proxyPort"
  }

  $body = @{
    bot_id = "mock-bot"
    user_id = "mock-user"
    user_name = "Mock User"
    stream = $true
    auto_save_history = $true
    additional_messages = @(@{
      role = "user"
      content = "hello"
      content_type = "text"
    })
  } | ConvertTo-Json -Depth 5

  $response = Invoke-WebRequest `
    -Uri "http://127.0.0.1:$proxyPort/api/chat" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body `
    -UseBasicParsing

  if ($response.StatusCode -ne 200) {
    throw "Expected chat proxy status 200, got $($response.StatusCode)"
  }

  $events = @($response.Content -split "`n" | Where-Object { $_ -like "data:*" })
  if ($events.Count -lt 1) {
    throw "Expected at least one SSE event from proxy"
  }

  $jsonLine = $events | Where-Object { $_ -notmatch "\[DONE\]" } | Select-Object -First 1
  if (-not $jsonLine) {
    throw "Expected structured error SSE event before [DONE]"
  }

  $payload = ($jsonLine -replace "^data:\s*", "") | ConvertFrom-Json
  if ($payload.error.code -ne "upstream_model_no_permission") {
    throw "Expected upstream_model_no_permission, got $($payload.error.code)"
  }
  if ($payload.error.model_ids[0] -ne $blockedModelId) {
    throw "Expected blocked model id $blockedModelId, got $($payload.error.model_ids[0])"
  }
  if (-not $payload.message) {
    throw "Expected structured user-facing message in SSE payload"
  }

  Write-Output "UPSTREAM_MODEL_PERMISSION_ERROR_PASS"
} finally {
  if ($proxyProcess -and -not $proxyProcess.HasExited) {
    Stop-Process -Id $proxyProcess.Id -Force
    $proxyProcess.WaitForExit()
  }
  if ($mockProcess -and -not $mockProcess.HasExited) {
    Stop-Process -Id $mockProcess.Id -Force
    $mockProcess.WaitForExit()
  }
}
