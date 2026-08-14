export type InteractionMode = "support" | "free_chat" | "safety" | "medical" | "privacy" | "closing";

export type QuestionPermission = "forbidden" | "natural_follow_up" | "focused_clarify";

export type InteractionBoundaryType = "no_assessment_question" | "no_questions" | "skip_topic";

export interface InteractionBoundary {
  type: InteractionBoundaryType;
  scope: "turn" | "topic" | "session";
  active: boolean;
  sourceTurnId?: string;
}

export interface InteractionState {
  mode: InteractionMode;
  currentTopic?: string;
  questionPermission: QuestionPermission;
  assessmentPermission: "allowed";
  boundaries: InteractionBoundary[];
  lastIntent: string;
  lastSubject: string;
  lastUpdatedAtIso: string;
}

export function createInitialInteractionState(now: Date = new Date()): InteractionState {
  return {
    mode: "support",
    questionPermission: "natural_follow_up",
    assessmentPermission: "allowed",
    boundaries: [],
    lastIntent: "acknowledgement",
    lastSubject: "unknown",
    lastUpdatedAtIso: now.toISOString()
  };
}
