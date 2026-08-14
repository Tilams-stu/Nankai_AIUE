$ErrorActionPreference = "Stop"

function Require-EnvVar {
  param(
    [string]$Name
  )

  $value = [Environment]::GetEnvironmentVariable($Name)
  if ([string]::IsNullOrWhiteSpace($value)) {
    throw "Missing required environment variable: $Name"
  }
  return $value.Trim()
}

function Validate-HttpUrl {
  param(
    [string]$Name,
    [string]$Value
  )

  try {
    $uri = [Uri]$Value
  } catch {
    throw "Invalid URL in environment variable: $Name"
  }

  if (-not $uri.IsAbsoluteUri) {
    throw "Expected absolute URL in environment variable: $Name"
  }

  if ($uri.Scheme -notin @("http", "https")) {
    throw "Expected http/https URL in environment variable: $Name"
  }

  return $uri
}

$nankaiApiKey = Require-EnvVar "NANKAI_API_KEY"
$nankaiBotId = Require-EnvVar "NANKAI_BOT_ID"
$workflowGatewayMode = [Environment]::GetEnvironmentVariable("MENTAL_LLM_WORKFLOW_GATEWAY_MODE")
if ([string]::IsNullOrWhiteSpace($workflowGatewayMode)) {
  $workflowGatewayMode = "agent_internal"
}
$workflowGatewayMode = $workflowGatewayMode.Trim()

$authHeader = [Environment]::GetEnvironmentVariable("MENTAL_LLM_WORKFLOW_GATEWAY_AUTH_HEADER")
if ([string]::IsNullOrWhiteSpace($authHeader)) {
  $authHeader = "Authorization"
}

$authScheme = [Environment]::GetEnvironmentVariable("MENTAL_LLM_WORKFLOW_GATEWAY_AUTH_SCHEME")
if ([string]::IsNullOrWhiteSpace($authScheme)) {
  $authScheme = "Bearer"
}

$gatewayTimeout = [Environment]::GetEnvironmentVariable("MENTAL_LLM_WORKFLOW_GATEWAY_TIMEOUT_SECONDS")
if ([string]::IsNullOrWhiteSpace($gatewayTimeout)) {
  $gatewayTimeout = "20"
}

Write-Output ("NK-GeniOS bot id: {0}" -f $nankaiBotId)
Write-Output ("Workflow mode: {0}" -f $workflowGatewayMode)

if ($workflowGatewayMode -eq "forward") {
  $workflowGatewayUrl = Require-EnvVar "MENTAL_LLM_WORKFLOW_GATEWAY_URL"
  $workflowGatewayAuthToken = Require-EnvVar "MENTAL_LLM_WORKFLOW_GATEWAY_AUTH_TOKEN"
  $gatewayUri = Validate-HttpUrl "MENTAL_LLM_WORKFLOW_GATEWAY_URL" $workflowGatewayUrl

  Write-Output ("Workflow gateway origin: {0}" -f $gatewayUri.GetLeftPart([System.UriPartial]::Authority))
  Write-Output ("Workflow auth header: {0}" -f $authHeader)
  Write-Output ("Workflow auth scheme: {0}" -f $authScheme)
  Write-Output ("Workflow timeout seconds: {0}" -f $gatewayTimeout)
} else {
  Write-Output "Workflow gateway preflight skipped because the primary path is Agent-internal workflow invocation."
}

Write-Output "LIVE_INTEGRATION_PREFLIGHT_READY"
