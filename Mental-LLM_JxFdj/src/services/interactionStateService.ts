import type { InteractionState } from "../domain/interactionState.js";
import type { TurnInterpretation } from "../domain/turnInterpretation.js";
import type { SafetyStatus } from "../domain/safetyStatus.js";

export interface InteractionStateService {
  applyTurn(current: InteractionState, interpretation: TurnInterpretation, safety: SafetyStatus, now?: Date): InteractionState;
}

export function createInteractionStateService(): InteractionStateService {
  return {
    applyTurn(current, interpretation, safety, now = new Date()) {
      const boundaries = current.boundaries.map((boundary) => ({ ...boundary }));
      let mode = current.mode;
      let questionPermission = current.questionPermission;
      const safetyNeedsConfirmation =
        safety.workflowLabel !== "R0" && safety.safetyConfirmation !== "confirmed_safe";

      if (safetyNeedsConfirmation && interpretation.subject === "self") {
        mode = "safety";
        questionPermission = "focused_clarify";
      } else if (interpretation.intent === "medical_concern") {
        mode = "medical";
        questionPermission = "focused_clarify";
      } else if (interpretation.intent === "privacy_question") {
        mode = "privacy";
        questionPermission = "forbidden";
      } else if (["risk_clarification", "support_decision_question", "third_party_support", "creative_request"].includes(interpretation.intent)) {
        mode = "support";
        questionPermission = "forbidden";
      } else if (interpretation.intent === "closing") {
        mode = "closing";
        questionPermission = "forbidden";
      } else if (interpretation.boundaryAction === "no_questions") {
        mode = "free_chat";
        questionPermission = "forbidden";
        boundaries.push({ type: "no_questions", scope: "session", active: true });
      } else if (interpretation.boundaryAction === "skip_topic") {
        mode = "free_chat";
        questionPermission = "natural_follow_up";
        boundaries.push({ type: "skip_topic", scope: "topic", active: true });
      } else if (interpretation.boundaryAction === "free_chat") {
        mode = "free_chat";
        questionPermission = "natural_follow_up";
        boundaries.push({ type: "no_assessment_question", scope: "session", active: true });
      } else if (interpretation.boundaryAction === "resume_assessment") {
        mode = "support";
        questionPermission = "natural_follow_up";
        boundaries.forEach((boundary) => {
          if (boundary.type === "no_assessment_question" || boundary.type === "no_questions") boundary.active = false;
        });
      } else if (mode !== "free_chat") {
        mode = "support";
        questionPermission = "natural_follow_up";
      }

      return {
        ...current,
        mode,
        questionPermission,
        currentTopic: interpretation.topicAnchors[0] || current.currentTopic,
        boundaries,
        lastIntent: interpretation.intent,
        lastSubject: interpretation.subject,
        lastUpdatedAtIso: now.toISOString()
      };
    }
  };
}
