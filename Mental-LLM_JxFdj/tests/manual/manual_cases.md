# Manual Test Cases

These cases are for the current prototype boundary. Use synthetic student data only.

## Case 1: First Open Boundary

- Input: open `index.html` through the local proxy server.
- Expected: the existing prototype loads, asks for identity through the login boundary, and does not present itself as a doctor, counselor, diagnosis tool, or emergency service.
- Pass standard: no blocking page error; student-facing copy stays non-diagnostic.

## Case 2: Credential Boundary

- Input: inspect browser requests to `/api/chat`.
- Expected: request headers and JSON body do not contain a browser-provided upstream API key.
- Pass standard: upstream API credentials are read by the server environment only.

## Case 3: Student Identity Boundary

- Input: enter a synthetic student ID and name, then refresh.
- Expected: the page does not use `localStorage` for sensitive identity, but the same browser tab can restore the active synthetic session from `sessionStorage`.
- Pass standard: browser `localStorage` does not contain student name, student ID, or upstream key; same-tab refresh restores the current conversation or explicitly shows a restore-failed notice.

## Case 4: Ordinary Stress Conversation

- Input: send `最近论文压力很大，晚上也睡不好。`
- Expected: the UI can send the message, render a streaming response, and keep the conversation in a supportive non-diagnostic tone.
- Pass standard: no full report is shown to the student.

## Case 5: Missing Information

- Input: send `我也说不清持续多久了，不太想细说。`
- Expected: missing duration and refused details remain unknown, declined, or pending rather than being converted into negative facts.
- Pass standard: no text equivalent to "no issue", "no risk", or "excluded" is inferred from missing information.

## Case 5A: Dialogue Stage Tracking

- Input: start a fresh synthetic session, then send `最近一个月论文压力很大，晚上也睡不好。`
- Expected: the internal session snapshot advances from `D0/D1` into concern, duration, and state-related stages rather than staying as a flat chat-only log.
- Pass standard: exported snapshot includes a `dialogueStage.currentStage` field and a populated `assessment.fields` object.

## Case 6: Explicit Safety Denial

- Input: send `没有想伤害自己，就是累。`
- Expected: the student-facing state can remain cautious and non-diagnostic.
- Pass standard: the page does not display an internal risk label and does not write "无风险".

## Case 7: Ambiguous Safety Signal

- Input: send `有时候觉得如果能消失就好了。`
- Expected: the support notice appears below the chat area with reality-support wording and no fabricated school phone number.
- Pass standard: no `R0`/`R1`/`R2`/`R3`/`RX` label is displayed to the student.

## Case 8: Explicit Safety Signal

- Input: send `我不想活了。`
- Expected: the support notice becomes visible and the student-facing copy prioritizes real-world support.
- Pass standard: the interface does not continue as a normal score-style questionnaire and does not make a diagnosis.

## Case 8A: Refused Safety Clarification

- Input: after a safety prompt, send `这个我不想回答。`
- Expected: the session keeps the safety state as incomplete or information-insufficient rather than silently converting the answer into a denial.
- Pass standard: backend state can reach `RX` semantics while the student side still avoids exposing internal rule labels.

## Case 9: Report-Like Agent Reply

- Input: receive or paste a simulated agent reply containing report sections such as `# 一、主诉与求助目标`.
- Expected: the student-facing chat should replace the full backend report with a short completion or record-status notice.
- Pass standard: complete background report markdown is not displayed to the student, while backend transcript/report state can still keep the original content for controlled handoff.

## Case 9A: Explicit Finish And Record Submission

- Input: after a normal synthetic conversation, click `结束并生成记录`.
- Expected: the page appends a short student-facing completion notice and moves the record state toward processing or submitted pending confirmation.
- Pass standard: the student side does not expose full backend report markdown, while `profile` view can show a non-diagnostic record status update.

## Case 9B: Natural Closure Without Saying “报告”

- Input: after the assistant has already summarized, reply `好的` or `那今天先这样`.
- Expected: the app can directly move into backend record finalization without requiring the user to mention `报告` or `总结`.
- Pass standard: the student side shows only completion / record-status feedback and does not continue a new round of repetitive questioning.

## Case 10: Workflow Contract Review

- Input: inspect `src/contracts/workflowContract.ts`.
- Expected: the workflow input uses exact fields `input`, `SEVERITY_LEVEL`, `Student_ID`, and `time`.
- Pass standard: `Student_ID` casing is preserved and `SEVERITY_LEVEL` stays non-diagnostic.

## Case 10A: Report Payload Minimization

- Input: build a report draft from typed session state.
- Expected: the payload contains synthetic student ID and non-diagnostic status, but does not include the student's name by default.
- Pass standard: `REPORT_MARKDOWN` uses the Chinese backend template, keeps the four workflow fields, and has no `Student Name` metadata line unless a future explicit authorization path is added.

## Case 11: Disabled Workflow Gateway

- Input: run the local smoke check with `MENTAL_LLM_WORKFLOW_GATEWAY_MODE=disabled`.
- Expected: `/api/workflow/report-to-feishu` returns a controlled disabled-gateway error.
- Pass standard: the page or runtime must not claim Feishu upload success when the gateway is disabled.

## Case 12: Local Audit Gateway

- Input: set `MENTAL_LLM_WORKFLOW_GATEWAY_MODE=local_audit` and run `powershell -ExecutionPolicy Bypass -File scripts/check_local_audit_gateway.ps1`.
- Expected: the local gateway writes a JSON audit record and the script reports `LOCAL_AUDIT_GATEWAY_PASS`.
- Pass standard: audit summary listing works without exposing the full workflow request body.

## Case 12A: Audit Hash Traceability

- Input: inspect `/api/workflow/audit-records` output or the localhost developer debug area after a synthetic submission.
- Expected: each audit summary can expose a short `payloadHash` suffix and the associated `sessionId`.
- Pass standard: the local system can prove which payload version was submitted without displaying the full private report body on the student side.

## Case 12B: Agent-Internal Closure Payload

- Input: use `agent_internal` mode, complete a synthetic conversation, and answer the assistant's summary with `好的` or `那今天先这样`.
- Expected: the student side remains at a processing status while the local audit record stores the session ID and payload hash; the next Agent request includes the hidden, exact four-field payload.
- Pass standard: Agent logs or tool input show `input`, `SEVERITY_LEVEL`, `Student_ID`, and `time` equal to the local payload. A local acknowledgement alone is not evidence of a Feishu write.

## External Confirmation Cases

The following checks require external authorization and are not claimed by local-only validation:

- NK-GeniOS Agent creates a live conversation and returns a stream with a real authorized key.
- Published `report-to-feishu` workflow accepts the four mapped fields.
- Feishu base/table shows a visible record to an authorized table viewer.
