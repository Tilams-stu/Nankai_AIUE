export type ReportLifecycleStatus =
  | "draft"
  | "validation_failed"
  | "pending_review"
  | "returned"
  | "uploaded"
  | "upload_failed"
  | "archived"
  | "revoked";

export type UserVisibleUploadStatus =
  | "not_started"
  | "processing"
  | "submitted_pending_confirmation"
  | "failed_needs_investigation";

export interface UploadStatus {
  reportStatus: ReportLifecycleStatus;
  userVisibleStatus: UserVisibleUploadStatus;
  lastUpdatedAtIso?: string;
  workflowRunId?: string;
  reportVersion?: string;
  lastAuditRecordPath?: string;
  lastPayloadHash?: string;
  lastSessionId?: string;
  lastMessage?: string;
  lastHttpStatus?: number;
  lastReportFingerprint?: string;
  reportDispatchCount?: number;
  lastReportTrigger?: "meaningful_self_evidence" | "session_end" | "safety_change";
}

export const initialUploadStatus: UploadStatus = {
  reportStatus: "draft",
  userVisibleStatus: "not_started"
};

export function toUserVisibleUploadStatus(reportStatus: ReportLifecycleStatus): UserVisibleUploadStatus {
  switch (reportStatus) {
    case "pending_review":
      return "processing";
    case "uploaded":
      return "submitted_pending_confirmation";
    case "upload_failed":
    case "validation_failed":
    case "returned":
      return "failed_needs_investigation";
    default:
      return "not_started";
  }
}

export function toUploadStatusLabel(status: UserVisibleUploadStatus): string {
  switch (status) {
    case "not_started":
      return "未开始";
    case "processing":
      return "处理中";
    case "submitted_pending_confirmation":
      return "已提交待确认";
    case "failed_needs_investigation":
      return "失败待排查";
    default:
      return "未开始";
  }
}
