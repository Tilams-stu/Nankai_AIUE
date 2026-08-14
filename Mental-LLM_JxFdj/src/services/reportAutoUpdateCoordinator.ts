import type { AppState } from "../app/appState.js";

export type ReportUpdateTrigger =
  | "meaningful_self_evidence"
  | "supplemental_scale_result"
  | "session_end"
  | "safety_change";
export type ReportUpdateKind = "create" | "update" | "final_update";

export interface ReportAutoUpdateDecision {
  shouldDispatch: boolean;
  kind?: ReportUpdateKind;
  reason: "new_evidence" | "session_end" | "safety_change" | "unchanged_payload" | "missing_student_id";
  fingerprint: string;
}

export interface ReportAutoUpdateCoordinator {
  createFingerprint(state: AppState): string;
  decide(input: { state: AppState; trigger: ReportUpdateTrigger; fingerprint?: string }): ReportAutoUpdateDecision;
}

function compact(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, 240);
}

export function createReportAutoUpdateCoordinator(): ReportAutoUpdateCoordinator {
  return {
    createFingerprint(state) {
      const fields = Object.values(state.session.assessment.fields).map((field) => [
        field.key,
        field.status,
        compact(field.value),
        field.evidence.map((item) => compact(item.excerpt)).join("|")
      ]);
      const safety = [
        state.safety.workflowLabel,
        state.safety.summary,
        state.safety.safetyConfirmation,
        state.safety.peakWorkflowLabel,
        state.safety.peakSummary,
        state.safety.screeningStatus
      ].join("|");
      return JSON.stringify([state.session.identity.userId, fields, safety]);
    },
    decide({ state, trigger, fingerprint }) {
      const resolvedFingerprint = fingerprint || this.createFingerprint(state);
      if (!state.session.identity.userId.trim()) {
        return { shouldDispatch: false, reason: "missing_student_id", fingerprint: resolvedFingerprint };
      }
      if (trigger !== "session_end" && state.upload.lastReportFingerprint === resolvedFingerprint) {
        return { shouldDispatch: false, reason: "unchanged_payload", fingerprint: resolvedFingerprint };
      }
      return {
        shouldDispatch: true,
        kind: trigger === "session_end" ? "final_update" : state.upload.lastReportFingerprint ? "update" : "create",
        reason: trigger === "session_end" ? "session_end" : trigger === "safety_change" ? "safety_change" : "new_evidence",
        fingerprint: resolvedFingerprint
      };
    }
  };
}
