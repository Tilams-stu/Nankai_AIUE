$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$mapPath = Join-Path ([System.IO.Path]::GetTempPath()) ("aiue_conversation_map_{0}.json" -f [guid]::NewGuid().ToString("N"))
$env:MENTAL_LLM_CONVERSATION_MAP_FILE = $mapPath
$env:MENTAL_LLM_CONVERSATION_MAP_RETENTION_SECONDS = "3600"

try {
  @'
import json
import os
from server import proxy_server

session_id = "session_continuity_test"
user_id = "student_continuity_test"
bot_id = "bot_continuity_test"
conversation_id = "upstream_conversation_test"
key = proxy_server.get_conversation_map_key(session_id, user_id, bot_id)

proxy_server.persist_conversation(key, conversation_id)
assert proxy_server.load_persisted_conversation(key) == conversation_id

with open(os.environ["MENTAL_LLM_CONVERSATION_MAP_FILE"], encoding="utf-8") as handle:
    stored = json.load(handle)

serialized = json.dumps(stored, ensure_ascii=False)
assert session_id not in serialized
assert user_id not in serialized
assert bot_id not in serialized
assert stored["records"][key]["conversationId"] == conversation_id
print("CONVERSATION_CONTINUITY_PASS")
'@ | python -

  if ($LASTEXITCODE -ne 0) {
    throw "Conversation continuity check failed."
  }
} finally {
  Remove-Item -LiteralPath $mapPath -Force -ErrorAction SilentlyContinue
  Remove-Item Env:MENTAL_LLM_CONVERSATION_MAP_FILE -ErrorAction SilentlyContinue
  Remove-Item Env:MENTAL_LLM_CONVERSATION_MAP_RETENTION_SECONDS -ErrorAction SilentlyContinue
}
