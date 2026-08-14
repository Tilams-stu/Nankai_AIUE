import type { ActiveView } from "../domain/session.js";
import {
  type DialogueNextAction,
  type DialogueStageCode,
  type DialogueStageState,
  createInitialDialogueStageState,
  getDialogueStageLabel,
  getDialogueStageMetadata
} from "../domain/dialogueStage.js";
import type { ConsentStatus } from "../domain/session.js";
import type { AssessmentState } from "../domain/assessmentFields.js";
import { createInitialInteractionState, type InteractionState } from "../domain/interactionState.js";
import type { SafetyStatus } from "../domain/safetyStatus.js";
import type { TranscriptEntry } from "../domain/transcript.js";
import type { UserVisibleUploadStatus } from "../domain/uploadStatus.js";
import { createConversationPolicyService } from "./conversationPolicyService.js";

export interface DialogueStageEvent {
  type:
    | "session_created"
    | "consent_updated"
    | "user_turn_recorded"
    | "agent_turn_recorded"
    | "report_generated"
    | "upload_submitted";
  consentStatus: ConsentStatus;
  assessmentState: AssessmentState;
  interactionState?: InteractionState;
  safetyState: SafetyStatus;
  activeView: ActiveView;
  uploadStatus?: UserVisibleUploadStatus;
  transcriptEntries?: TranscriptEntry[];
  dialogueStageState?: DialogueStageState;
  now?: Date;
}

export interface DialogueStageService {
  createInitialDialogueStageState(now?: Date): DialogueStageState;
  advanceDialogueStage(state: DialogueStageState, event: DialogueStageEvent): DialogueStageState;
  getCurrentDialogueStageLabel(state: DialogueStageState): string;
  getNextDialogueAction(state: DialogueStageState): DialogueNextAction;
}

const conversationPolicyService = createConversationPolicyService();

function markCompleted(completedStages: DialogueStageCode[], code: DialogueStageCode): DialogueStageCode[] {
  return completedStages.includes(code) ? completedStages : [...completedStages, code];
}

function resolveCrisisStage(safetyState: SafetyStatus): DialogueStageCode | null {
  switch (safetyState.workflowLabel) {
    case "R3":
      return "C4_emergency_disposition";
    case "R2":
      return "C2_risk_assess";
    case "RX":
      return "C1_risk_clarify";
    case "R1":
      return "C3_support_connect";
    default:
      return null;
  }
}

function resolveNormalStage(event: DialogueStageEvent): DialogueStageCode {
  if (event.type === "report_generated" || event.type === "upload_submitted") {
    return "D12_report_upload";
  }

  if (event.consentStatus !== "accepted") {
    return event.type === "session_created" ? "D0_session_init" : "D1_boundary_notice";
  }

  const policy = conversationPolicyService.buildConversationPolicy({
    activeView: event.activeView,
    session: {
      assessment: event.assessmentState,
      consentStatus: event.consentStatus,
      dialogueStage: event.dialogueStageState || createInitialDialogueStageState(event.now),
      interaction: event.interactionState || createInitialInteractionState(event.now)
    },
    safety: event.safetyState,
    transcript: {
      entries: event.transcriptEntries || []
    },
    upload: {
      reportStatus: event.uploadStatus === "submitted_pending_confirmation" ? "uploaded" : "draft"
    }
  } as any);

  if (policy.responseMode === "safety_check") {
    return "D7_safety_check";
  }
  if (policy.completionStatus === "awaiting_safety") {
    return "D7_safety_check";
  }
  if (policy.responseMode === "summarize") {
    return "D10_summary_confirm";
  }
  if (policy.responseMode === "close") {
    return "D11_feedback_next_step";
  }

  switch (policy.targetField) {
    case "chief_complaint":
      return "D2_open_concern";
    case "duration":
      return "D3_concern_detail";
    case "emotion_state":
      return "D5_state_review";
    case "functional_impact":
      return "D6_functional_impact";
    default:
      break;
  }

  if (event.activeView === "gad7") {
    return "D8_scale_or_supplement";
  }

  // D4 remains an audit label for an open, unstructured exchange. It no longer
  // means campus context is required before the conversation can move on.
  return "D4_campus_context";
}

export function createDialogueStageService(): DialogueStageService {
  return {
    createInitialDialogueStageState(now = new Date()) {
      return createInitialDialogueStageState(now);
    },
    advanceDialogueStage(state, event) {
      const now = event.now || new Date();
      const crisisStage = resolveCrisisStage(event.safetyState);
      const nextStage = crisisStage || resolveNormalStage(event);
      const previousStage = state.currentStage;
      const nextCompleted =
        nextStage === previousStage ? state.completedStages : markCompleted(state.completedStages, previousStage);
      const metadata = getDialogueStageMetadata(nextStage);

      return {
        currentStage: nextStage,
        completedStages: nextCompleted,
        currentTurn: event.type === "user_turn_recorded" ? state.currentTurn + 1 : state.currentTurn,
        lastUpdatedAtIso: now.toISOString(),
        lastEventType: event.type,
        nextAction: metadata.nextAction,
        lastReason: `${getDialogueStageLabel(previousStage)} -> ${metadata.label}`
      };
    },
    getCurrentDialogueStageLabel(state) {
      return getDialogueStageLabel(state.currentStage);
    },
    getNextDialogueAction(state) {
      return state.nextAction;
    }
  };
}
