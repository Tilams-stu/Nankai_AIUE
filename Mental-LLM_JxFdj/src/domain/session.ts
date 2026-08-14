import type { AssessmentState } from "./assessmentFields.js";
import { createInitialAssessmentState } from "./assessmentFields.js";
import type { DialogueStageState } from "./dialogueStage.js";
import { createInitialDialogueStageState } from "./dialogueStage.js";
import type { InteractionState } from "./interactionState.js";
import { createInitialInteractionState } from "./interactionState.js";

export type ActiveView = "chat" | "gad7" | "profile" | "meditation";

export type ConsentStatus = "accepted" | "declined" | "partial" | "unknown";

export type UserControlState = "continue" | "pause" | "skip" | "exit" | "correct";

export type InformationStatus =
  | "confirmed"
  | "uncertain"
  | "refused"
  | "not_asked"
  | "conflicting"
  | "not_applicable";

export interface SessionIdentity {
  userId: string;
  userName?: string;
  synthetic: boolean;
}

export interface SessionState {
  id: string;
  activeView: ActiveView;
  consentStatus: ConsentStatus;
  userControl: UserControlState;
  informationStatus: InformationStatus;
  identity: SessionIdentity;
  startedAtIso: string;
  dialogueStage: DialogueStageState;
  interaction: InteractionState;
  assessment: AssessmentState;
}

export function createSessionId(now: Date = new Date()): string {
  return `session_${now.getTime()}`;
}

export function createSyntheticIdentity(now: Date = new Date()): SessionIdentity {
  return {
    userId: `pilot_${now.getTime()}`,
    synthetic: true
  };
}

export function createSessionState(options: {
  activeView?: ActiveView;
  identity?: SessionIdentity;
  consentStatus?: ConsentStatus;
  userControl?: UserControlState;
  informationStatus?: InformationStatus;
  dialogueStage?: DialogueStageState;
  interaction?: InteractionState;
  assessment?: AssessmentState;
  now?: Date;
} = {}): SessionState {
  const now = options.now || new Date();
  return {
    id: createSessionId(now),
    activeView: options.activeView || "chat",
    consentStatus: options.consentStatus || "unknown",
    userControl: options.userControl || "continue",
    informationStatus: options.informationStatus || "not_asked",
    identity: options.identity || createSyntheticIdentity(now),
    startedAtIso: now.toISOString(),
    dialogueStage: options.dialogueStage || createInitialDialogueStageState(now),
    interaction: options.interaction || createInitialInteractionState(now),
    assessment: options.assessment || createInitialAssessmentState(now)
  };
}
