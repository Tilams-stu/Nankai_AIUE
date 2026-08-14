import { sanitizePlainText } from "../utils/sanitizeText.js";
const RELATION_PATTERN = "(?:\\u5ba4\\u53cb|\\u670b\\u53cb|\\u540c\\u5b66|\\u5bb6\\u4eba|\\u7236\\u6bcd|\\u7238\\u7238|\\u5988\\u5988|\\u8001\\u5e08|\\u5bf9\\u8c61|\\u4f34\\u4fa3|\\u540c\\u4e8b)";
const THIRD_PARTY_PATTERN = new RegExp(`${RELATION_PATTERN}|\\u4ed6\\u4eec|\\u5979\\u4eec|\\u522b\\u4eba|\\u4e0d\\u662f\\u6211`);
const SELF_IMPACT_FROM_OTHER_PATTERN = new RegExp(`(?:${RELATION_PATTERN}|\\u6211(?:\\u7684)?${RELATION_PATTERN})[^\\u3002\\uff01\\uff1f!?]{0,24}(?:\\u8ba9\\u6211|\\u4f7f\\u6211|\\u4ee4\\u6211|\\u5bfc\\u81f4\\u6211|\\u5f71\\u54cd\\u6211|\\u8ba9\\u6211\\u89c9\\u5f97|\\u8ba9\\u6211\\u611f\\u5230)`);
const EXPLICIT_OTHER_PERSON_PATTERN = new RegExp(`\\u4e0d\\u662f\\u6211|\\u6211(?:\\u7684)?${RELATION_PATTERN}(?!\\u8bf4\\u8bdd)|${RELATION_PATTERN}(?:\\u8bf4(?!\\u8bdd)|\\u8868\\u793a|\\u89c9\\u5f97|\\u60f3|\\u4e0d\\u60f3)`);
const SELF_EXPERIENCE_PATTERN = new RegExp(`\\u6211(?!\\u7684?${RELATION_PATTERN}).{0,32}(?:\\u6015|\\u62c5\\u5fc3|\\u7126\\u8651|\\u7d27\\u5f20|\\u96be\\u53d7|\\u62d6\\u5ef6|\\u4e0d\\u60f3|\\u7761|\\u7d2f|\\u70e6|\\u89c9\\u5f97|\\u611f\\u5230|\\u4f1a)`);
const FICTIONAL_PATTERN = /\u5c0f\u8bf4|\u5267\u60c5|\u89d2\u8272|\u865a\u6784|\u7535\u5f71|\u6e38\u620f/;
const QUOTED_PATTERN = /\u4ed6\u8bf4|\u5979\u8bf4|\u5f15\u7528|\u8f6c\u8ff0|[\u201c\u201d\u2018\u2019\u300c\u300d\u300e\u300f"']/;
const HYPOTHETICAL_PATTERN = /\u5982\u679c|\u5047\u5982|\u5047\u8bbe|\u4e3e\u4e2a\u4f8b\u5b50/;
const FREE_CHAT_PATTERN = /\u5148\u522b\u5206\u6790|\u5148\u4e0d\u5206\u6790|\u4e0d\u7528\u5206\u6790|\u968f\u4fbf\u804a|\u5c31\u804a\u804a|\u6b63\u5e38\u4ea4\u6d41/;
const RESUME_ANALYSIS_PATTERN = /\u53ef\u4ee5\u5206\u6790\u4e86|\u53ef\u4ee5\u95ee\u4e86|\u7ee7\u7eed\u5206\u6790|\u56de\u5230\u524d\u9762\u7684\u8bdd\u9898/;
const NO_QUESTIONS_PATTERN = /\u4e0d\u8981\u95ee|\u522b\u95ee\u4e86|\u4e0d\u60f3\u56de\u7b54|\u4e0d\u65b9\u4fbf\u56de\u7b54/;
const SKIP_TOPIC_PATTERN = /\u8fd9\u4e2a\u4e0d\u60f3\u8bf4|\u8fd9\u4e2a\u5148\u4e0d\u8c08|\u8df3\u8fc7\u8fd9\u4e2a/;
const PRIVACY_PATTERN = /\u4f60\u4eec.*\u4fdd\u5b58|\u6570\u636e.*\u54ea\u91cc|\u8c01\u80fd\u770b|\u8bb0\u5f55.*\u540e\u53f0|\u9690\u79c1/;
const CLOSING_PATTERN = /\u5148\u5230\u8fd9\u91cc|\u5148\u804a\u5230\u8fd9\u91cc|\u4eca\u5929\u5c31\u5230\u8fd9\u91cc|\u4eca\u5929\u5148\u8fd9\u6837\u5427|\u5148\u8fd9\u6837\u5427|\u7ed3\u675f\u4f1a\u8bdd|\u4e0d\u804a\u4e86/;
const CORRECTION_PATTERN = /\u5176\u5b9e\u4e0d\u662f|\u521a\u624d\u8bf4\u9519|\u66f4\u6b63|\u4e0d\u5bf9/;
const SELF_RISK_CLARIFICATION_PATTERN = /\u4e0d\u662f\u771f\u7684\u60f3\u4f24\u5bb3\u81ea\u5df1|\u4e0d\u662f\u60f3\u81ea\u6740|\u53ea\u662f\u60f3\u8eb2\u8d77\u6765|\u53ea\u662f\u60f3\u6d88\u5931\u51e0\u5929|\u6ca1\u6709\u60f3\u4f24\u5bb3\u81ea\u5df1/;
const CLEAR_SELF_RISK_DENIAL_PATTERN = /\u4e0d\u662f(?:\u771f\u7684)?\u60f3\u4f24\u5bb3\u81ea\u5df1|\u4e0d\u662f\u60f3\u81ea\u6740|\u6ca1\u6709\u60f3\u4f24\u5bb3\u81ea\u5df1/;
const SUPPORT_DECISION_PATTERN = /\u5fc3\u7406\u533b\u751f|\u5fc3\u7406\u54a8\u8be2|\u4e13\u4e1a\u5e2e\u52a9|\u8981\u4e0d\u8981\u53bb\u770b|\u8981\u4e0d\u8981\u5c31\u533b|\u9700\u4e0d\u9700\u8981\u770b/;
const THIRD_PARTY_HELP_PATTERN = /\u8be5\u4e0d\u8be5\u529d|\u600e\u4e48\u5e2e\u5979|\u600e\u4e48\u5e2e\u4ed6|\u600e\u4e48\u652f\u6301\u5979|\u600e\u4e48\u652f\u6301\u4ed6|\u600e\u4e48\u5173\u5fc3/;
const CREATIVE_REQUEST_PATTERN = /\u600e\u4e48\u5199|\u600e\u4e48\u6539|\u5199\u5f97\u81ea\u7136|\u53f0\u8bcd|\u5267\u60c5|\u5c0f\u8bf4/;
const MEDICAL_CONCERN_PATTERN = /\u80f8\u53e3\u53d1\u95f7|\u80f8\u75db|\u5fc3\u614c|\u5934\u6655|\u547c\u5438\u56f0\u96be|\u660f\u5012|\u6655\u53a5|\u5fc3\u8df3\u5f88\u5feb/;
const SAFETY_PATTERN = /\u4e0d\u60f3\u6d3b|\u81ea\u6740|\u4f24\u5bb3\u81ea\u5df1|\u81ea\u6b8b|\u5df2\u7ecf\u541e\u4e86\u836f|\u73b0\u5728\u5c31/;
const IMMEDIATE_SAFETY_PATTERN = /\u6b63\u5728|\u5df2\u7ecf\u541e\u4e86\u836f|\u5df2\u7ecf\u5272\u4f24|\u73b0\u5728\u5c31/;
const ACKNOWLEDGEMENT_PATTERN = /^(\u597d|\u597d\u7684|\u55ef|\u6069|\u884c|\u53ef\u4ee5|\u77e5\u9053\u4e86)[\u3002\uff01!?\s]*$/;
function resolveSubject(text) {
    if (FICTIONAL_PATTERN.test(text))
        return "fictional";
    if (HYPOTHETICAL_PATTERN.test(text))
        return "hypothetical";
    if (QUOTED_PATTERN.test(text))
        return "quoted";
    if (SELF_IMPACT_FROM_OTHER_PATTERN.test(text))
        return "self";
    if (EXPLICIT_OTHER_PERSON_PATTERN.test(text))
        return "third_party";
    if (SELF_EXPERIENCE_PATTERN.test(text))
        return "self";
    if (THIRD_PARTY_PATTERN.test(text))
        return "third_party";
    return "self";
}
export function createTurnInterpretationService() {
    return {
        interpret(text) {
            const normalized = sanitizePlainText(text);
            const subject = resolveSubject(normalized);
            const boundaryAction = RESUME_ANALYSIS_PATTERN.test(normalized)
                ? "resume_assessment"
                : NO_QUESTIONS_PATTERN.test(normalized)
                    ? "no_questions"
                    : SKIP_TOPIC_PATTERN.test(normalized)
                        ? "skip_topic"
                        : FREE_CHAT_PATTERN.test(normalized)
                            ? "free_chat"
                            : "none";
            const riskClarification = subject === "self" && SELF_RISK_CLARIFICATION_PATTERN.test(normalized);
            const explicitlyDeniedRisk = subject === "self" && CLEAR_SELF_RISK_DENIAL_PATTERN.test(normalized);
            const intent = subject === "fictional" && CREATIVE_REQUEST_PATTERN.test(normalized)
                ? "creative_request"
                : subject === "third_party" && THIRD_PARTY_HELP_PATTERN.test(normalized)
                    ? "third_party_support"
                    : riskClarification
                        ? "risk_clarification"
                        : MEDICAL_CONCERN_PATTERN.test(normalized)
                            ? "medical_concern"
                            : SUPPORT_DECISION_PATTERN.test(normalized)
                                ? "support_decision_question"
                                : boundaryAction !== "none"
                                    ? "boundary"
                                    : PRIVACY_PATTERN.test(normalized)
                                        ? "privacy_question"
                                        : CLOSING_PATTERN.test(normalized)
                                            ? "closing"
                                            : CORRECTION_PATTERN.test(normalized)
                                                ? "correction"
                                                : ACKNOWLEDGEMENT_PATTERN.test(normalized)
                                                    ? "acknowledgement"
                                                    : /[?\uff1f]/.test(normalized)
                                                        ? "direct_question"
                                                        : "disclosure";
            const safetySignal = explicitlyDeniedRisk
                ? "explicitly_denied"
                : SAFETY_PATTERN.test(normalized)
                    ? (IMMEDIATE_SAFETY_PATTERN.test(normalized) ? "immediate" : "possible")
                    : "none";
            const userFacts = subject === "self" && intent === "disclosure" && normalized.length >= 3 ? [normalized.slice(0, 180)] : [];
            return {
                intent,
                subject,
                topicAnchors: userFacts.slice(0, 1),
                userFacts,
                boundaryAction,
                correctionTarget: intent === "correction" ? normalized.slice(0, 100) : undefined,
                safetySignal,
                confidence: subject === "self" ? 0.8 : 0.95,
                shouldExtractAssessmentEvidence: subject === "self" && intent === "disclosure" && userFacts.length > 0
            };
        }
    };
}
