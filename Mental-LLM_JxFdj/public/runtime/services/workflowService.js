import { toGatewayReportSubmission, toReportToFeishuInput } from "../contracts/workflowContract.js";
import { createWorkflowPayloadService } from "./workflowPayloadService.js";
async function readWorkflowError(response) {
    try {
        const data = await response.json();
        if (data && typeof data.error === "string")
            return data.error;
        if (data && typeof data.message === "string")
            return data.message;
    }
    catch { }
    return "Workflow temporarily unavailable.";
}
export function createWorkflowService(fetchImpl = fetch) {
    const workflowPayloadService = createWorkflowPayloadService();
    return {
        mapPayload(payload) {
            return toReportToFeishuInput(payload);
        },
        mapGatewaySubmission(payload, sessionSnapshot) {
            return toGatewayReportSubmission(payload, sessionSnapshot);
        },
        async submit(gatewayUrl, payload, sessionSnapshot) {
            const validation = workflowPayloadService.validatePayload(payload);
            if (!validation.ok) {
                return {
                    ok: false,
                    userVisibleStatus: "failed_needs_investigation",
                    message: validation.errors.join(", ")
                };
            }
            const body = toGatewayReportSubmission(payload, sessionSnapshot);
            let response;
            try {
                response = await fetchImpl(gatewayUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body)
                });
            }
            catch (error) {
                const message = error instanceof Error ? error.message : "Workflow temporarily unavailable.";
                return {
                    ok: false,
                    userVisibleStatus: "failed_needs_investigation",
                    message
                };
            }
            if (!response.ok) {
                return {
                    ok: false,
                    userVisibleStatus: "failed_needs_investigation",
                    httpStatus: response.status,
                    message: await readWorkflowError(response)
                };
            }
            let responseData = undefined;
            try {
                responseData = await response.json();
            }
            catch { }
            return {
                ok: true,
                userVisibleStatus: "submitted_pending_confirmation",
                httpStatus: response.status,
                workflowRunId: responseData && typeof responseData === "object" && "run_id" in responseData
                    ? String(responseData.run_id)
                    : undefined,
                reportVersion: responseData && typeof responseData === "object" && "report_version" in responseData
                    ? String(responseData.report_version)
                    : undefined,
                auditRecordPath: responseData && typeof responseData === "object" && "audit_record_path" in responseData
                    ? String(responseData.audit_record_path)
                    : undefined,
                payloadHash: responseData && typeof responseData === "object" && "payload_hash" in responseData
                    ? String(responseData.payload_hash)
                    : undefined,
                sessionId: responseData && typeof responseData === "object" && "session_id" in responseData
                    ? String(responseData.session_id)
                    : undefined,
                snapshotAccepted: responseData && typeof responseData === "object" && "snapshot_received" in responseData
                    ? Boolean(responseData.snapshot_received)
                    : undefined,
                snapshotSchemaVersion: responseData && typeof responseData === "object" && "snapshot_schema_version" in responseData
                    ? String(responseData.snapshot_schema_version)
                    : undefined,
                gatewayMode: responseData && typeof responseData === "object" && "mode" in responseData
                    ? String(responseData.mode)
                    : undefined,
                responseData
            };
        }
    };
}
