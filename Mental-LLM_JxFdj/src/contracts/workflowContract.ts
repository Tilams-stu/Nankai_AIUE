import type { SessionSnapshotV1 } from "./sessionSnapshotContract.js";

export type NonDiagnosticSeverityLevel =
  | "not_assessed"
  | "no_immediate_risk_disclosed"
  | "needs_follow_up"
  | "suggest_real_world_support"
  | "pending_manual_review";

export interface AgentReportPayload {
  REPORT_MARKDOWN: string;
  SEVERITY_LEVEL: NonDiagnosticSeverityLevel;
  STUDENT_ID: string;
  TIME: string;
}

export interface ReportToFeishuWorkflowInput {
  input: string;
  SEVERITY_LEVEL: NonDiagnosticSeverityLevel;
  Student_ID: string;
  time: string;
}

export interface GatewayReportSubmission extends ReportToFeishuWorkflowInput {
  session_snapshot?: SessionSnapshotV1;
}

export const REPORT_TO_FEISHU_FIELD_MAP = {
  input: "REPORT_MARKDOWN",
  SEVERITY_LEVEL: "SEVERITY_LEVEL",
  Student_ID: "STUDENT_ID",
  time: "TIME"
} as const;

export function toReportToFeishuInput(payload: AgentReportPayload): ReportToFeishuWorkflowInput {
  return {
    input: payload.REPORT_MARKDOWN,
    SEVERITY_LEVEL: payload.SEVERITY_LEVEL,
    Student_ID: payload.STUDENT_ID,
    time: payload.TIME
  };
}

export function toGatewayReportSubmission(
  payload: AgentReportPayload,
  sessionSnapshot?: SessionSnapshotV1
): GatewayReportSubmission {
  return {
    ...toReportToFeishuInput(payload),
    ...(sessionSnapshot ? { session_snapshot: sessionSnapshot } : {})
  };
}
