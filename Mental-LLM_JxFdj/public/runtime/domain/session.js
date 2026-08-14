import { createInitialAssessmentState } from "./assessmentFields.js";
import { createInitialDialogueStageState } from "./dialogueStage.js";
import { createInitialInteractionState } from "./interactionState.js";
export function createSessionId(now = new Date()) {
    return `session_${now.getTime()}`;
}
export function createSyntheticIdentity(now = new Date()) {
    return {
        userId: `pilot_${now.getTime()}`,
        synthetic: true
    };
}
export function createSessionState(options = {}) {
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
