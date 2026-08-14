$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$port = "8891"

$env:MENTAL_LLM_PORT = $port
$env:NANKAI_API_KEY = ""
Remove-Item Env:MENTAL_LLM_WORKFLOW_GATEWAY_MODE -ErrorAction SilentlyContinue

$process = Start-Process -FilePath "python" `
  -ArgumentList @("-m", "server.proxy_server") `
  -WorkingDirectory $projectRoot `
  -PassThru `
  -WindowStyle Hidden

try {
  $serverReady = $false
  for ($attempt = 0; $attempt -lt 20; $attempt++) {
    Start-Sleep -Milliseconds 500
    try {
      $statusResponse = Invoke-WebRequest -Uri "http://127.0.0.1:$port/api/workflow/status" -UseBasicParsing
      if ($statusResponse.StatusCode -eq 200) {
        $serverReady = $true
        break
      }
    } catch {}
  }
  if (-not $serverReady) {
    throw "Agent-internal default-path server did not become ready on port $port"
  }

  $statusJson = $statusResponse.Content | ConvertFrom-Json
  if ($statusJson.mode -ne "agent_internal") {
    throw "Expected default workflow status mode agent_internal, got $($statusJson.mode)"
  }
  if ($statusJson.enabled -ne $true) {
    throw "Expected default workflow status enabled true"
  }

  $reportMarkdown = @'
# 心理健康对话初步评估报告（后台自动上传稿）

## 一、基本信息
- 会话 ID：session-direct-use
- 学生 ID：2412769
- 是否模拟身份：是
- 生成时间：2026-07-29 17:10:00
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
    time = "2026-07-29 17:10:00"
    session_snapshot = @{
      schemaVersion = "session_snapshot_v1"
      exportedAtIso = "2026-07-29T09:10:00.000Z"
      state = @{
        activeView = "chat"
        session = @{
          id = "session-direct-use"
          activeView = "chat"
          consentStatus = "accepted"
          userControl = "continue"
          informationStatus = "confirmed"
          identity = @{
            userId = "2412769"
            userName = "Synthetic User"
            synthetic = $true
          }
          startedAtIso = "2026-07-29T08:00:00.000Z"
        }
        safety = @{
          summary = "needs_follow_up"
          signalStatus = "ambiguous"
          ideation = "passive"
          plan = "unknown"
          meansAccess = "unknown"
          timing = "unknown"
          behaviorOrInjury = "unknown"
          priorAttempt = "unknown"
          harmToOthers = "unknown"
          severeMentalStateSignal = "unknown"
          aloneNow = "unknown"
          trustedPersonAvailable = "unknown"
          canStaySafe = "unknown"
          workflowLabel = "R1"
          missingInformationState = "pending_review"
        }
        transcript = @{
          entries = @()
        }
        upload = @{
          reportStatus = "pending_review"
          userVisibleStatus = "processing"
        }
      }
    }
  } | ConvertTo-Json -Depth 8

  $response = Invoke-WebRequest `
    -Uri "http://127.0.0.1:$port/api/workflow/report-to-feishu" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body `
    -UseBasicParsing

  if ($response.StatusCode -ne 200) {
    throw "Expected agent_internal default-path status 200, got $($response.StatusCode)"
  }

  $json = $response.Content | ConvertFrom-Json
  if ($json.mode -ne "agent_internal") {
    throw "Expected agent_internal response mode, got $($json.mode)"
  }
  if (-not $json.ok) {
    throw "Expected ok=true for agent_internal response"
  }
  if (-not $json.audit_record_path) {
    throw "Expected audit_record_path in agent_internal response"
  }

  $recordPath = Join-Path $projectRoot $json.audit_record_path
  if (-not (Test-Path $recordPath)) {
    throw "Expected audit record file at $recordPath"
  }

  $record = Get-Content $recordPath -Raw | ConvertFrom-Json
  if ($record.mode -ne "agent_internal") {
    throw "Expected audit record mode agent_internal, got $($record.mode)"
  }
  if ($record.summary.snapshotReceived -ne $true) {
    throw "Expected snapshotReceived true in agent_internal audit record"
  }

  Write-Output "AGENT_INTERNAL_DEFAULT_PATH_PASS"
} finally {
  if ($process -and -not $process.HasExited) {
    Stop-Process -Id $process.Id -Force
    $process.WaitForExit()
  }
}
