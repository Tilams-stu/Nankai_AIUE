import { getAssessmentFieldLabel } from "../domain/assessmentFields.js";
import { createConversationPolicyService } from "./conversationPolicyService.js";
import { getDialogueStageLabel } from "../domain/dialogueStage.js";
import { CONVERSATION_CONTEXT_SCHEMA_VERSION } from "../domain/conversationContext.js";
import { sanitizePlainText } from "../utils/sanitizeText.js";
import { createResponsePlanningService } from "./responsePlanningService.js";
const conversationPolicyService = createConversationPolicyService();
const responsePlanningService = createResponsePlanningService();
function isCapturedStatus(status) {
    return ["collected", "partially_collected", "refused"].includes(status);
}
function buildFieldSnapshot(key, state) {
    const field = state.session.assessment.fields[key];
    return {
        key,
        label: getAssessmentFieldLabel(key),
        value: sanitizePlainText(field.value),
        status: field.status,
        evidenceCount: field.evidence.length,
        lastUpdatedAtIso: field.lastUpdatedAtIso
    };
}
function collectMissingFieldKeys(state) {
    return Object.keys(state.session.assessment.fields).filter((key) => {
        const field = state.session.assessment.fields[key];
        return !isCapturedStatus(field.status);
    });
}
function collectConfirmedFieldKeys(state) {
    return Object.keys(state.session.assessment.fields).filter((key) => {
        const field = state.session.assessment.fields[key];
        return isCapturedStatus(field.status);
    });
}
function buildNextQuestionPriority() {
    // Missing assessment fields are report metadata, never a student-facing task list.
    return [];
}
function buildAvoidRepeatingFields(state) {
    const recentlyAsked = Object.values(state.session.assessment.fields)
        .filter((field) => typeof field.lastAskedTurn === "number" && state.session.dialogueStage.currentTurn - field.lastAskedTurn <= 3)
        .map((field) => field.key);
    return Array.from(new Set([...collectConfirmedFieldKeys(state), ...recentlyAsked]));
}
function buildRecentText(entries, role) {
    return entries
        .filter((entry) => entry.role === role && entry.status === "final" && !entry.hidden)
        .slice(-4)
        .map((entry) => sanitizePlainText(entry.content).slice(0, 160))
        .filter((text) => text.length > 0);
}
function buildRecentDialogueTurns(entries) {
    return entries
        .filter((entry) => (entry.role === "user" || entry.role === "agent") && entry.status === "final" && !entry.hidden)
        .slice(-8)
        .map((entry) => ({
        id: entry.id,
        role: entry.role,
        text: sanitizePlainText(entry.content).slice(0, 240),
        createdAtIso: entry.createdAtIso
    }))
        .filter((entry) => entry.text.length > 0);
}
function buildNextRequiredAction(state) {
    const policy = conversationPolicyService.buildConversationPolicy(state);
    if (state.safety.safetyConfirmation !== "confirmed_safe" &&
        (state.session.interaction.mode === "safety" || policy.responseMode === "safety_route")) {
        return "ask_safety_follow_up";
    }
    if (state.safety.resourceNoticeNeeded) {
        return "prioritize_real_world_support";
    }
    if (state.session.interaction.mode === "closing" || policy.responseMode === "close") {
        return "summarize_for_confirmation";
    }
    if (policy.responseMode === "respond") {
        return "respond_without_follow_up";
    }
    return "continue_natural_conversation";
}
export function createConversationContextService() {
    return {
        buildConversationContextPacket(state) {
            const confirmedKeys = collectConfirmedFieldKeys(state);
            const missingKeys = collectMissingFieldKeys(state);
            return {
                schemaVersion: CONVERSATION_CONTEXT_SCHEMA_VERSION,
                sessionId: state.session.id,
                activeView: state.activeView,
                consentStatus: state.session.consentStatus,
                userControl: state.session.userControl,
                currentStage: state.session.dialogueStage.currentStage,
                currentStageLabel: getDialogueStageLabel(state.session.dialogueStage.currentStage),
                confirmedFields: confirmedKeys.map((key) => buildFieldSnapshot(key, state)),
                missingFields: missingKeys.map((key) => buildFieldSnapshot(key, state)),
                safety: {
                    screeningStatus: state.safety.screeningStatus,
                    summary: state.safety.summary,
                    workflowLabel: state.safety.workflowLabel,
                    safetyConfirmation: state.safety.safetyConfirmation,
                    resourceNoticeNeeded: state.safety.resourceNoticeNeeded,
                    reviewerRequired: state.safety.reviewerRequired,
                    nextRequiredAction: buildNextRequiredAction(state)
                },
                nextQuestionPriority: buildNextQuestionPriority(),
                avoidRepeatingFields: buildAvoidRepeatingFields(state),
                recentUserEvidence: buildRecentText(state.transcript.entries, "user"),
                recentAgentEvidence: buildRecentText(state.transcript.entries, "agent"),
                recentDialogueTurns: buildRecentDialogueTurns(state.transcript.entries),
                interaction: {
                    ...state.session.interaction,
                    boundaries: state.session.interaction.boundaries.map((boundary) => ({ ...boundary }))
                },
                responsePlan: responsePlanningService.build({
                    interaction: state.session.interaction,
                    safety: state.safety
                }),
                conversationPolicy: conversationPolicyService.buildConversationPolicy(state),
                generatedAtIso: new Date().toISOString(),
                sourceOfTruth: "local_structured_state"
            };
        }
    };
}
