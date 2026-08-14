# Agent Integration

## Scope

This document records the current local boundary between the student-facing prototype, the local proxy, the typed report-draft path, the future agent-owned report flow, and the published `report-to-feishu` workflow.

## Current Boundary

- The browser must not call Feishu directly.
- The browser must not claim upload success unless the Agent-owned workflow path or a controlled gateway confirms success.
- The browser may show only non-diagnostic state such as:
  - `not_started`
  - `processing`
  - `submitted_pending_confirmation`
  - `failed_needs_investigation`
- Full report markdown remains a backend or agent-owned artifact, not a student-facing view.

## Primary Integration Path

The primary project path is now:

```text
browser
-> local proxy
-> NK-GeniOS Agent
-> Agent internally calls report-to-feishu
-> Feishu base/table records the backend archive
```

This means a separate HTTP workflow gateway is not required for the main prototype closure as long as:

- the real Agent is reachable with a valid `NANKAI_API_KEY`
- the real Agent uses the intended Bot ID
- `report-to-feishu` is already callable inside that Agent
- Feishu write and viewer permissions are configured correctly

## Typed Contract

The current typed contract lives in:

- [workflowContract.ts](D:/Desktop/Software/AIUE/Mental-LLM_JxFdj/src/contracts/workflowContract.ts)

Relevant fields:

```ts
AgentReportPayload {
  REPORT_MARKDOWN: string;
  SEVERITY_LEVEL: NonDiagnosticSeverityLevel;
  STUDENT_ID: string;
  TIME: string;
}
```

```ts
GatewayReportSubmission {
  input: string;
  SEVERITY_LEVEL: NonDiagnosticSeverityLevel;
  Student_ID: string;
  time: string;
  session_snapshot?: SessionSnapshotV1;
}
```

Mapped workflow input:

```ts
ReportToFeishuWorkflowInput {
  input: string;
  SEVERITY_LEVEL: NonDiagnosticSeverityLevel;
  Student_ID: string;
  time: string;
}
```

The fixed mapping is:

- `input <- REPORT_MARKDOWN`
- `SEVERITY_LEVEL <- SEVERITY_LEVEL`
- `Student_ID <- STUDENT_ID`
- `time <- TIME`

## Current Runtime Path

Current local runtime pieces:

- [transcriptService.ts](D:/Desktop/Software/AIUE/Mental-LLM_JxFdj/src/services/transcriptService.ts)
  Typed transcript append/list helper for current chat evidence.
- [reportDraftService.ts](D:/Desktop/Software/AIUE/Mental-LLM_JxFdj/src/services/reportDraftService.ts)
  Typed backend report-draft builder.
- [reportDraftRuntime.js](D:/Desktop/Software/AIUE/Mental-LLM_JxFdj/src/app/reportDraftRuntime.js)
  Student-side bridge that reads typed transcript state and requests a typed payload.
- [workflowService.ts](D:/Desktop/Software/AIUE/Mental-LLM_JxFdj/src/services/workflowService.ts)
  Typed workflow-gateway submit helper that can include an optional `session_snapshot`.
- [uploadRuntime.js](D:/Desktop/Software/AIUE/Mental-LLM_JxFdj/src/app/uploadRuntime.js)
  Student-side upload state transitions and gateway bridge.
- [statusNoticeRuntime.js](D:/Desktop/Software/AIUE/Mental-LLM_JxFdj/src/app/statusNoticeRuntime.js)
  Student-visible record-status rendering.

Current generated browser modules:

- `/runtime/contracts/workflowAuditContract.js`
- `/runtime/contracts/workflowContract.js`
- `/runtime/services/transcriptService.js`
- `/runtime/services/reportDraftService.js`
- `/runtime/services/workflowAuditService.js`
- `/runtime/services/workflowService.js`

## What Works Now

The page can currently:

1. Reset upload state to `not_started`.
2. Move upload state to `processing`.
3. Move upload state to `submitted_pending_confirmation`.
4. Move upload state to `failed_needs_investigation`.
5. Store non-diagnostic transcript evidence in typed runtime state through `MentalSessionRuntime.appendTranscriptEntry(...)`.
6. Build a typed draft payload from current session state plus recent chat and GAD transcript excerpts through `MentalReportDraftRuntime.buildCurrentReportPayload(...)`.
7. Export a typed in-memory session snapshot through `MentalSessionRuntime.exportSnapshot()`.
8. Submit a typed payload plus optional `session_snapshot` to a future local or agent-owned workflow gateway through `MentalUploadRuntime.submitReportViaGateway(...)`.

What the page does not yet do:

1. Generate the final agent-owned or backend-owned report body with institution-specific review logic.
2. Discover a real workflow gateway URL automatically when the optional gateway path is used.
3. Submit to Feishu directly.
4. Claim final upload success without an Agent/workflow or gateway response.

## Optional Gateway Shape

The current code also supports an optional local or agent-owned HTTP gateway endpoint that:

- accepts JSON matching `ReportToFeishuWorkflowInput`
- may also accept an optional `session_snapshot` object for controlled backend handoff
- returns HTTP 2xx on accepted submission
- returns structured error content on failure when possible

This optional gateway can be backed by:

- NK-GeniOS Agent side tool invocation
- a local proxy extension
- another controlled internal integration layer

It must not be the Feishu public API directly from the browser.

The current local proxy already supports:

- `disabled`
- `mock_failure`
- `mock_success`
- `local_audit`
- `forward`

`local_audit` is a controlled local adapter mode that writes a JSON audit record and returns `audit_record_path`. It is still not the final institutional backend.

`forward` is a controlled server-side forwarding mode. In this mode the local proxy posts the workflow payload to a configured internal gateway URL read from environment variables:

- `MENTAL_LLM_WORKFLOW_GATEWAY_URL`
- `MENTAL_LLM_WORKFLOW_GATEWAY_TIMEOUT_SECONDS`
- `MENTAL_LLM_WORKFLOW_GATEWAY_AUTH_HEADER`
- `MENTAL_LLM_WORKFLOW_GATEWAY_AUTH_SCHEME`
- `MENTAL_LLM_WORKFLOW_GATEWAY_AUTH_TOKEN`

This keeps the browser contract unchanged while allowing a real gateway to be introduced without moving Feishu credentials into the client. It is now treated as an engineering fallback or later backend path, not the primary prototype requirement.

The same local adapter now also exposes `/api/workflow/audit-records` for summary-only listing. This route is intended for controlled debugging or later staff-facing tooling and should not be treated as a student-facing content API.

The current page already uses that route through `src/app/uploadDebugRuntime.js` in the localhost-only developer debug area to show a short list of recent audit summaries after synthetic submissions.

## Status Transition Rules

Current runtime rules:

- Session init / restart / exit:
  `draft / not_started`
- Safety escalation:
  `pending_review / processing`
- Gateway submit success:
  `uploaded / submitted_pending_confirmation`
- Gateway submit failure:
  `upload_failed / failed_needs_investigation`

These are student-visible status transitions only. They do not prove that a professional report was reviewed.

## Remaining Work

- Verify the real NK-GeniOS Agent can be reached with the intended Bot ID and key.
- Verify the real Agent internally calls `report-to-feishu` as expected.
- Confirm Feishu write success and viewer visibility for an authorized account.
- Replace or enrich the local draft builder with the final agent-owned or backend-owned report payload source if the current typed draft is no longer the desired backend input.
- Decide whether the optional gateway path is still needed after the Agent-internal workflow path is fully validated.
- If the optional gateway path is retained, decide how a real backend or agent gateway should retain, redact, or discard `session_snapshot`.
