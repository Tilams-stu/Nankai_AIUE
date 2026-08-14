import type {
  AgentReportPayload,
  GatewayReportSubmission,
  ReportToFeishuWorkflowInput
} from "../contracts/workflowContract.js";
import { toGatewayReportSubmission, toReportToFeishuInput } from "../contracts/workflowContract.js";
import type { SessionSnapshotV1 } from "../contracts/sessionSnapshotContract.js";
import type { UserVisibleUploadStatus } from "../domain/uploadStatus.js";
import { createWorkflowPayloadService } from "./workflowPayloadService.js";

export interface WorkflowSubmitResult {
  ok: boolean;
  userVisibleStatus: UserVisibleUploadStatus;
  httpStatus?: number;
  message?: string;
  workflowRunId?: string;
  reportVersion?: string;
  auditRecordPath?: string;
  payloadHash?: string;
  sessionId?: string;
  snapshotAccepted?: boolean;
  snapshotSchemaVersion?: string;
  gatewayMode?: string;
  responseData?: unknown;
}

export interface WorkflowService {
  submit(gatewayUrl: string, payload: AgentReportPayload, sessionSnapshot?: SessionSnapshotV1): Promise<WorkflowSubmitResult>;
  mapPayload(payload: AgentReportPayload): ReportToFeishuWorkflowInput;
  mapGatewaySubmission(payload: AgentReportPayload, sessionSnapshot?: SessionSnapshotV1): GatewayReportSubmission;
}

async function readWorkflowError(response: Response): Promise<string> {
  try {
    const data = await response.json();
    if (data && typeof data.error === "string") return data.error;
    if (data && typeof data.message === "string") return data.message;
  } catch {}
  return "Workflow temporarily unavailable.";
}

export function createWorkflowService(fetchImpl: typeof fetch = fetch): WorkflowService {
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
      let response: Response;

      try {
        response = await fetchImpl(gatewayUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
      } catch (error) {
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

      let responseData: unknown = undefined;
      try {
        responseData = await response.json();
      } catch {}

      return {
        ok: true,
        userVisibleStatus: "submitted_pending_confirmation",
        httpStatus: response.status,
        workflowRunId:
          responseData && typeof responseData === "object" && "run_id" in responseData
            ? String((responseData as Record<string, unknown>).run_id)
            : undefined,
        reportVersion:
          responseData && typeof responseData === "object" && "report_version" in responseData
            ? String((responseData as Record<string, unknown>).report_version)
            : undefined,
        auditRecordPath:
          responseData && typeof responseData === "object" && "audit_record_path" in responseData
            ? String((responseData as Record<string, unknown>).audit_record_path)
            : undefined,
        payloadHash:
          responseData && typeof responseData === "object" && "payload_hash" in responseData
            ? String((responseData as Record<string, unknown>).payload_hash)
            : undefined,
        sessionId:
          responseData && typeof responseData === "object" && "session_id" in responseData
            ? String((responseData as Record<string, unknown>).session_id)
            : undefined,
        snapshotAccepted:
          responseData && typeof responseData === "object" && "snapshot_received" in responseData
            ? Boolean((responseData as Record<string, unknown>).snapshot_received)
            : undefined,
        snapshotSchemaVersion:
          responseData && typeof responseData === "object" && "snapshot_schema_version" in responseData
            ? String((responseData as Record<string, unknown>).snapshot_schema_version)
            : undefined,
        gatewayMode:
          responseData && typeof responseData === "object" && "mode" in responseData
            ? String((responseData as Record<string, unknown>).mode)
            : undefined,
        responseData
      };
    }
  };
}
