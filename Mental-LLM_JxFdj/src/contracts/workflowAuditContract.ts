export interface WorkflowAuditSummary {
  schemaVersion: string;
  createdAtIso: string;
  workflow: string;
  mode: string;
  auditRecordPath: string;
  severity?: string;
  studentIdSuffix?: string;
  markdownLength?: number;
  payloadHash?: string;
  sessionId?: string;
  snapshotReceived?: boolean;
  snapshotSchemaVersion?: string | null;
}

export interface WorkflowAuditListResponse {
  records: WorkflowAuditSummary[];
}
