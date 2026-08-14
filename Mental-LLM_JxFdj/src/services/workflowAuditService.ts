import type { WorkflowAuditListResponse } from "../contracts/workflowAuditContract.js";

export interface WorkflowAuditService {
  listSummaries(endpoint: string, limit?: number): Promise<WorkflowAuditListResponse>;
}

async function readAuditError(response: Response): Promise<string> {
  try {
    const data = await response.json();
    if (data && typeof data.error === "string") return data.error;
    if (data && typeof data.message === "string") return data.message;
  } catch {}
  return "Audit records temporarily unavailable.";
}

export function createWorkflowAuditService(fetchImpl: typeof fetch = fetch): WorkflowAuditService {
  return {
    async listSummaries(endpoint, limit = 10) {
      const target = new URL(endpoint, window.location.origin);
      target.searchParams.set("limit", String(limit));

      const response = await fetchImpl(target.toString());
      if (!response.ok) {
        throw new Error(await readAuditError(response));
      }
      const data = (await response.json()) as WorkflowAuditListResponse;
      return {
        records: Array.isArray(data.records) ? data.records : []
      };
    }
  };
}
