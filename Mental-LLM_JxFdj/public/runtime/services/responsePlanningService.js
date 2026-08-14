export function createResponsePlanningService() {
    return {
        build({ interaction, safety }) {
            const base = {
                mode: interaction.mode,
                responseGoal: "support",
                factsToReflect: interaction.currentTopic ? [interaction.currentTopic] : [],
                topicAnchor: interaction.currentTopic,
                questionPermission: interaction.questionPermission,
                allowClosure: false,
                prohibitedMoves: ["field_driven_question", "questionnaire_sequence", "unverified_diagnosis", "report_disclosure"]
            };
            const safetyNeedsConfirmation = safety.workflowLabel !== "R0" && safety.safetyConfirmation !== "confirmed_safe";
            if ((interaction.mode === "safety" && safety.safetyConfirmation !== "confirmed_safe") ||
                safetyNeedsConfirmation) {
                return { ...base, responseGoal: "safety", questionPermission: "focused_clarify", allowedQuestionGoal: "immediate_safety" };
            }
            if (interaction.mode === "medical") {
                return { ...base, responseGoal: "safety", questionPermission: "focused_clarify", allowedQuestionGoal: "immediate_medical_safety" };
            }
            if (["risk_clarification", "support_decision_question", "third_party_support", "creative_request"].includes(interaction.lastIntent)) {
                return { ...base, responseGoal: "answer_directly", questionPermission: "forbidden", prohibitedMoves: [...base.prohibitedMoves, "assessment_follow_up"] };
            }
            if (interaction.mode === "privacy") {
                return { ...base, responseGoal: "answer_directly", questionPermission: "forbidden", prohibitedMoves: [...base.prohibitedMoves, "assessment_follow_up"] };
            }
            if (interaction.mode === "closing") {
                return { ...base, responseGoal: "close", questionPermission: "forbidden", allowClosure: true };
            }
            if (interaction.questionPermission === "forbidden") {
                return { ...base, responseGoal: "respect_boundary", prohibitedMoves: [...base.prohibitedMoves, "any_question"] };
            }
            return {
                ...base,
                allowedQuestionGoal: "current_topic_only"
            };
        }
    };
}
