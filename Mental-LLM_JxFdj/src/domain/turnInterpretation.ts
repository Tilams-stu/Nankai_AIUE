export type TurnIntent =
  | "disclosure"
  | "direct_question"
  | "boundary"
  | "correction"
  | "privacy_question"
  | "closing"
  | "acknowledgement"
  | "risk_clarification"
  | "support_decision_question"
  | "third_party_support"
  | "creative_request"
  | "medical_concern";

export type ContentSubject = "self" | "third_party" | "fictional" | "quoted" | "hypothetical" | "unknown";

export type BoundaryAction = "free_chat" | "no_questions" | "skip_topic" | "resume_assessment" | "none";

export interface TurnInterpretation {
  intent: TurnIntent;
  subject: ContentSubject;
  topicAnchors: string[];
  userFacts: string[];
  boundaryAction: BoundaryAction;
  correctionTarget?: string;
  safetySignal?: "none" | "possible" | "immediate" | "explicitly_denied";
  confidence: number;
  shouldExtractAssessmentEvidence: boolean;
}
