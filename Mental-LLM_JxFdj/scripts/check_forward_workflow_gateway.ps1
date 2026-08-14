$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$proxyPort = "8891"
$mockPort = "8899"
$mockToken = "mock-token"

$env:MENTAL_LLM_MOCK_WORKFLOW_PORT = $mockPort
$env:MENTAL_LLM_MOCK_WORKFLOW_TOKEN = $mockToken
$env:MENTAL_LLM_PORT = $proxyPort
$env:NANKAI_API_KEY = ""
$env:MENTAL_LLM_WORKFLOW_GATEWAY_MODE = "forward"
$env:MENTAL_LLM_WORKFLOW_GATEWAY_URL = "http://127.0.0.1:$mockPort/workflow/report-to-feishu"
$env:MENTAL_LLM_WORKFLOW_GATEWAY_TIMEOUT_SECONDS = "20"
$env:MENTAL_LLM_WORKFLOW_GATEWAY_AUTH_HEADER = "Authorization"
$env:MENTAL_LLM_WORKFLOW_GATEWAY_AUTH_SCHEME = "Bearer"
$env:MENTAL_LLM_WORKFLOW_GATEWAY_AUTH_TOKEN = $mockToken

$mockProcess = Start-Process -FilePath "python" `
  -ArgumentList @("-m", "server.mock_workflow_gateway") `
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
      $statusResponse = Invoke-WebRequest -Uri "http://127.0.0.1:$proxyPort/api/workflow/status" -UseBasicParsing
      if ($statusResponse.StatusCode -eq 200) {
        $proxyReady = $true
        break
      }
    } catch {}
  }

  if (-not $proxyReady) {
    throw "Proxy workflow gateway did not become ready on port $proxyPort"
  }

  $statusJson = (Invoke-WebRequest -Uri "http://127.0.0.1:$proxyPort/api/workflow/status" -UseBasicParsing).Content | ConvertFrom-Json
  if ($statusJson.mode -ne "forward") {
    throw "Expected forward mode, got $($statusJson.mode)"
  }
  if ($statusJson.enabled -ne $true) {
    throw "Expected enabled true in forward mode"
  }
  if ($statusJson.target_origin -ne "http://127.0.0.1:$mockPort") {
    throw "Expected target_origin http://127.0.0.1:$mockPort, got $($statusJson.target_origin)"
  }

  $reportMarkdown = @'
# 心理健康对话初步评估报告（后台自动上传稿）

## 一、基本信息
- 会话 ID：session-forward
- 学生 ID：2412769
- 是否模拟身份：是
- 生成时间：2026-07-25 21:00:00
- 当前阶段：D11_feedback_next_step
- 报告版本：cn_non_diagnostic_v1
- 上传状态：处理中

## 二、使用范围与局限
本记录仅基于本次文本对话中的信息整理，用于初步筛查与后台留档，不构成医学诊断，也不能替代心理咨询、精神科评估或紧急服务。

## 三、主诉与时间线
- 主要困扰：论文压力大（已收集）
- 持续时间：一个月（已收集）
- 校园情境：未提供（未询问）

## 七、安全风险与处置
- 安全筛查状态：completed
- 安全摘要：需要进一步确认
- 工作流标签：R1（仅用于系统分流，不代表临床风险分级）
- 触发规则：无
- 资源提示需求：需要

## 八、信息缺口
- 功能影响：未询问
- 支持系统与既往求助：未询问

## 十、自动报告上传
- 工作流标签：R1
- 安全摘要：需要进一步确认
- 最近上传提示：无
- 审计记录：未生成
'@

  $body = @{
    input = $reportMarkdown
    SEVERITY_LEVEL = "needs_follow_up"
    Student_ID = "2023001"
    time = "2026-07-25 21:00:00"
    session_snapshot = @{
      schemaVersion = "session_snapshot_v1"
      exportedAtIso = "2026-07-25T12:00:00.000Z"
      state = @{
        activeView = "chat"
      }
    }
  } | ConvertTo-Json -Depth 6

  $response = Invoke-WebRequest `
    -Uri "http://127.0.0.1:$proxyPort/api/workflow/report-to-feishu" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body `
    -UseBasicParsing

  if ($response.StatusCode -ne 200) {
    throw "Expected workflow forward status 200, got $($response.StatusCode)"
  }

  $json = $response.Content | ConvertFrom-Json
  if ($json.mode -ne "forward") {
    throw "Expected forward response mode, got $($json.mode)"
  }
  if ($json.forward_status -ne 200) {
    throw "Expected forward_status 200, got $($json.forward_status)"
  }
  if ($json.target_origin -ne "http://127.0.0.1:$mockPort") {
    throw "Expected response target_origin http://127.0.0.1:$mockPort, got $($json.target_origin)"
  }
  if ($json.run_id -ne "mock_forward_run_001") {
    throw "Expected upstream run_id mock_forward_run_001, got $($json.run_id)"
  }
  if ($json.report_version -ne "forward_mock_v1") {
    throw "Expected upstream report_version forward_mock_v1, got $($json.report_version)"
  }
  if ($json.snapshot_received -ne $true) {
    throw "Expected snapshot_received true"
  }
  if ($json.snapshot_schema_version -ne "session_snapshot_v1") {
    throw "Expected session_snapshot_v1, got $($json.snapshot_schema_version)"
  }

  Write-Output "FORWARD_WORKFLOW_GATEWAY_PASS"
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
