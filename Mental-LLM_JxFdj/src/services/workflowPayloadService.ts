import type { AgentReportPayload, NonDiagnosticSeverityLevel } from "../contracts/workflowContract.js";
import type { SafetyStatus } from "../domain/safetyStatus.js";
import { formatLocalTimestamp } from "../utils/formatTime.js";

export interface WorkflowPayloadSource {
  reportMarkdown: string;
  safety: SafetyStatus;
  studentId: string;
  now?: Date;
}

export interface WorkflowPayloadValidationResult {
  ok: boolean;
  errors: string[];
}

function toCurrentSeverityLevel(summary: SafetyStatus["summary"]): NonDiagnosticSeverityLevel {
  switch (summary) {
    case "no_immediate_risk_disclosed":
    case "needs_follow_up":
    case "suggest_real_world_support":
      return summary;
    default:
      return "not_assessed";
  }
}

function toSeverityLevel(safety: SafetyStatus): NonDiagnosticSeverityLevel {
  switch (safety.peakWorkflowLabel) {
    case "R1":
      return "needs_follow_up";
    case "R2":
    case "R3":
      return "suggest_real_world_support";
    case "RX":
      return "pending_manual_review";
    default:
      return toCurrentSeverityLevel(safety.summary);
  }
}

export interface WorkflowPayloadService {
  buildPayload(source: WorkflowPayloadSource): AgentReportPayload;
  validatePayload(payload: AgentReportPayload): WorkflowPayloadValidationResult;
}

function hasRequiredSections(reportMarkdown: string): boolean {
  return [
    "## 一、基本信息",
    "## 七、安全风险与处置",
    "## 八、信息缺口",
    "## 十、自动报告上传"
  ].every((section) => reportMarkdown.includes(section));
}

const ALLOWED_SEVERITY_LEVELS = new Set<NonDiagnosticSeverityLevel>([
  "not_assessed",
  "no_immediate_risk_disclosed",
  "needs_follow_up",
  "suggest_real_world_support",
  "pending_manual_review"
]);

export function createWorkflowPayloadService(): WorkflowPayloadService {
  return {
    buildPayload(source) {
      return {
        REPORT_MARKDOWN: source.reportMarkdown,
        SEVERITY_LEVEL: toSeverityLevel(source.safety),
        STUDENT_ID: source.studentId,
        TIME: formatLocalTimestamp(source.now || new Date())
      };
    },
    validatePayload(payload) {
      const errors: string[] = [];
      const markdown = typeof payload.REPORT_MARKDOWN === "string" ? payload.REPORT_MARKDOWN : "";
      if (markdown.trim().length < 300) {
        errors.push("report_too_short");
      }
      if (!hasRequiredSections(markdown)) {
        errors.push("missing_required_sections");
      }
      if (!markdown.includes("不构成医学诊断")) {
        errors.push("missing_non_diagnostic_disclaimer");
      }
      if (!markdown.includes("信息缺口")) {
        errors.push("missing_gap_section");
      }
      if (typeof payload.STUDENT_ID !== "string" || !payload.STUDENT_ID.trim()) {
        errors.push("missing_student_id");
      }
      if (typeof payload.TIME !== "string" || !payload.TIME.trim()) {
        errors.push("missing_time");
      }
      if (!ALLOWED_SEVERITY_LEVELS.has(payload.SEVERITY_LEVEL)) {
        errors.push("invalid_severity_level");
      }
      return {
        ok: errors.length === 0,
        errors
      };
    }
  };
}
