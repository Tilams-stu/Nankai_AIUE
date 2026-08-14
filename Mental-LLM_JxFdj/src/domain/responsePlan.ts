import type { InteractionMode, QuestionPermission } from "./interactionState.js";

export interface ResponsePlan {
  mode: InteractionMode;
  responseGoal: "support" | "answer_directly" | "safety" | "respect_boundary" | "close";
  factsToReflect: string[];
  topicAnchor?: string;
  questionPermission: QuestionPermission;
  allowedQuestionGoal?: string;
  allowClosure: boolean;
  prohibitedMoves: string[];
}
