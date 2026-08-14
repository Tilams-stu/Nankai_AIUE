import type { AssessmentFieldKey } from "./assessmentFields.js";

export type ConversationResponseMode =
  | "respond"
  | "clarify"
  | "safety_check"
  | "summarize"
  | "close"
  | "safety_route";

export type ConversationCompletionStatus =
  | "gathering"
  | "sufficient"
  | "awaiting_safety"
  | "ready_to_close"
  | "completed";

export type SafetyPromptStatus = "not_needed" | "needed" | "acknowledged";

export interface ConversationPolicy {
  responseMode: ConversationResponseMode;
  completionStatus: ConversationCompletionStatus;
  targetField?: AssessmentFieldKey;
  reason: string;
  repeatedTopic?: string;
  lowInformationTurns: number;
  minimumSufficientInfo: boolean;
  safetyPromptStatus: SafetyPromptStatus;
  recentAskedTopics: AssessmentFieldKey[];
}
