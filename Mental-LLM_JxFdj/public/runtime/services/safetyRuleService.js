import { initialSafetyStatus, mergePeakSafetyStatus } from "../domain/safetyStatus.js";
import { sanitizePlainText } from "../utils/sanitizeText.js";
const NEGATION_PATTERNS = /(没有|没想过|不会|并不|从没|从来没有)/;
const OTHER_PERSON_PATTERNS = /(朋友|室友|同学|他|她|他们|别人|我朋友|我室友)/;
const OTHER_PERSON_DISCLAIMER_PATTERNS = /(不是我|不是说我|说的不是我|他说|她说|我朋友说|我室友说)/;
const REFUSAL_PATTERNS = /(不想说|不方便说|不方便回答|不想回答|不回答|先不说)/;
const DIRECT_DENIAL_PATTERNS = /^(没有|没|没有了|暂时没有|目前没有|还没有|没有这类想法|没有这种想法|没想过|不会|不想|没有过|否)[。！!?.，,、\s]*$/;
const EXPLICIT_SELF_RISK_DENIAL_PATTERNS = /(不是(?:真的)?想伤害自己|不是想自杀|没有想伤害自己)/;
const PASSIVE_IDEATION_PATTERNS = /(想消失|不想醒来|活着没意思|活着没有意义|撑不住了|想躲起来)/;
const ACTIVE_SELF_HARM_PATTERNS = /(想自杀|想去死|结束生命|结束自己|结束这一切|伤害自己|自残|割腕|轻生|不想活了)/;
const PLAN_PATTERNS = /(已经想好|准备好了|计划好了|等.+就|今晚|马上|现在就|这周就|今天就)/;
const MEANS_PATTERNS = /(刀|药|绳子|跳楼|割|吞药|安眠药|工具在身边|已经买了)/;
const ATTEMPT_PATTERNS = /(已经割伤|已经吞了药|吃药过量|正在伤害自己|刚刚自残|已经动手了)/;
const PRIOR_ATTEMPT_PATTERNS = /(以前.*自残|之前.*自杀|曾经.*割腕|有过.*自杀尝试)/;
const HARM_OTHERS_PATTERNS = /(想伤害别人|想打人|想杀了他|控制不住想伤人)/;
const PSYCHOSIS_PATTERNS = /(幻听|有人命令我|听到声音让我|有人控制我|现实分不清|脑子失控)/;
const UNCERTAINTY_PATTERNS = /^(不知道|不清楚|说不准|暂时说不清)[。！!?.，,、\s]*$/;
const CURRENT_SAFETY_DENIAL_PATTERNS = /(?:现在|此刻|目前).{0,16}(?:安全|没有.{0,12}(?:伤害自己|自杀|自残)|不会.{0,12}(?:伤害自己|自杀|自残)|不打算.{0,12}(?:伤害自己|自杀|自残))/;
const NEGATED_CLAUSE_PREFIX = /(?:没有|没|不会|并不|从没|从来没有|不是)/;
function hasUnnegatedPattern(text, pattern) {
    return text.split(/[，。,；;、!?！？]/).some((segment) => {
        const value = segment.trim();
        return Boolean(value) && pattern.test(value) && !NEGATED_CLAUSE_PREFIX.test(value);
    });
}
function resolveRiskSafetyConfirmation(text) {
    return CURRENT_SAFETY_DENIAL_PATTERNS.test(text) ? "confirmed_safe" : "pending";
}
function withDefaults(status, nowIso) {
    return {
        ...status,
        safetyConfirmation: status.safetyConfirmation ||
            (status.workflowLabel !== "R0"
                ? "pending"
                : status.screeningStatus === "completed"
                    ? "confirmed_safe"
                    : "not_started"),
        peakWorkflowLabel: status.peakWorkflowLabel || status.workflowLabel || "R0",
        peakSummary: status.peakSummary || status.summary || "not_asked",
        evidence: status.evidence.map((item) => ({ ...item })),
        triggeredRuleIds: [...status.triggeredRuleIds],
        lastUpdatedAtIso: nowIso
    };
}
function createEvidenceItem(text, detection, context, nowIso) {
    return {
        id: `safety_${Date.parse(nowIso)}_${Math.random().toString(36).slice(2, 8)}`,
        ruleId: detection.ruleId,
        excerpt: sanitizePlainText(text).slice(0, 120),
        transcriptEntryId: context.transcriptEntryId,
        subject: detection.subject,
        negated: detection.negated,
        timeScope: detection.timeScope,
        confidence: detection.confidence,
        collectedAtIso: nowIso,
        note: detection.note
    };
}
function applyWorkflowPatch(status, detection) {
    const peak = detection.subject !== "other_person" && !detection.negated
        ? mergePeakSafetyStatus(status.peakWorkflowLabel || "R0", status.peakSummary || "not_asked", detection.workflowLabel, detection.summary)
        : {
            peakWorkflowLabel: status.peakWorkflowLabel || "R0",
            peakSummary: status.peakSummary || "not_asked"
        };
    const safetyConfirmation = detection.safetyConfirmation ||
        (detection.negated
            ? "confirmed_safe"
            : detection.ruleId === "CR-009"
                ? "uncertain"
                : detection.subject === "self"
                    ? "pending"
                    : status.safetyConfirmation);
    return {
        ...status,
        summary: detection.summary || status.summary,
        signalStatus: detection.signalStatus || status.signalStatus,
        ideation: detection.ideation || status.ideation,
        plan: detection.plan || status.plan,
        meansAccess: detection.meansAccess || status.meansAccess,
        timing: detection.timing || status.timing,
        behaviorOrInjury: detection.behaviorOrInjury || status.behaviorOrInjury,
        priorAttempt: detection.priorAttempt || status.priorAttempt,
        harmToOthers: detection.harmToOthers || status.harmToOthers,
        severeMentalStateSignal: detection.severeMentalStateSignal || status.severeMentalStateSignal,
        canStaySafe: detection.canStaySafe || status.canStaySafe,
        workflowLabel: detection.workflowLabel || status.workflowLabel,
        safetyConfirmation,
        peakWorkflowLabel: peak.peakWorkflowLabel,
        peakSummary: peak.peakSummary,
        reviewerRequired: detection.reviewerRequired ?? status.reviewerRequired,
        resourceNoticeNeeded: detection.resourceNoticeNeeded ?? status.resourceNoticeNeeded,
        screeningStatus: detection.screeningStatus || status.screeningStatus
    };
}
function detectSafety(text, context, safetyConfirmationPending = false) {
    const sanitized = sanitizePlainText(text);
    if (!sanitized)
        return null;
    if ((safetyConfirmationPending ||
        ["D7_safety_check", "C1_risk_clarify", "C2_risk_assess"].includes(context.currentStage || "")) &&
        (DIRECT_DENIAL_PATTERNS.test(sanitized) || EXPLICIT_SELF_RISK_DENIAL_PATTERNS.test(sanitized)) &&
        !hasUnnegatedPattern(sanitized, /(想自杀|伤害自己|不想活|想去死|自残|轻生|想消失|不想醒来|活着没意思|活着没有意义|撑不住了|想躲起来)/)) {
        return {
            ruleId: "CR-011",
            subject: "self",
            negated: true,
            timeScope: "current",
            confidence: 0.84,
            summary: "no_immediate_risk_disclosed",
            signalStatus: "none",
            ideation: "denied",
            workflowLabel: "R0",
            safetyConfirmation: "confirmed_safe",
            screeningStatus: "completed",
            note: "Stage-specific direct denial."
        };
    }
    if (REFUSAL_PATTERNS.test(sanitized) && ["D7_safety_check", "C1_risk_clarify", "C2_risk_assess"].includes(context.currentStage || "")) {
        return {
            ruleId: "CR-009",
            subject: "unknown",
            negated: false,
            timeScope: "unknown",
            confidence: 0.78,
            summary: "needs_follow_up",
            signalStatus: "ambiguous",
            workflowLabel: "RX",
            reviewerRequired: true,
            resourceNoticeNeeded: true,
            screeningStatus: "incomplete",
            safetyConfirmation: "uncertain",
            note: "Risk-related refusal or incomplete clarification."
        };
    }
    if (UNCERTAINTY_PATTERNS.test(sanitized) && ["D7_safety_check", "C1_risk_clarify", "C2_risk_assess"].includes(context.currentStage || "")) {
        return {
            ruleId: "CR-009",
            subject: "unknown",
            negated: false,
            timeScope: "unknown",
            confidence: 0.72,
            summary: "needs_follow_up",
            signalStatus: "ambiguous",
            workflowLabel: "RX",
            reviewerRequired: true,
            resourceNoticeNeeded: true,
            screeningStatus: "incomplete",
            safetyConfirmation: "uncertain",
            note: "Safety clarification was uncertain."
        };
    }
    if (OTHER_PERSON_PATTERNS.test(sanitized) &&
        /(想死|不想活|自杀|轻生)/.test(sanitized) &&
        (OTHER_PERSON_DISCLAIMER_PATTERNS.test(sanitized) || !/我(想|要|会|在|已经)/.test(sanitized))) {
        return {
            ruleId: "CR-012",
            subject: "other_person",
            negated: false,
            timeScope: "unknown",
            confidence: 0.62,
            signalStatus: "ambiguous",
            note: "Quoted or reported risk from another person."
        };
    }
    if (NEGATION_PATTERNS.test(sanitized) &&
        /(想自杀|伤害自己|不想活|想去死)/.test(sanitized) &&
        !hasUnnegatedPattern(sanitized, /(想自杀|伤害自己|不想活|想去死|自残|轻生|想消失|不想醒来|活着没意思|活着没有意义|撑不住了|想躲起来)/)) {
        return {
            ruleId: "CR-011",
            subject: "self",
            negated: true,
            timeScope: "current",
            confidence: 0.88,
            summary: "no_immediate_risk_disclosed",
            signalStatus: "none",
            ideation: "denied",
            workflowLabel: "R0",
            safetyConfirmation: "confirmed_safe",
            screeningStatus: "completed",
            note: "Explicit current denial."
        };
    }
    if (ATTEMPT_PATTERNS.test(sanitized)) {
        return {
            ruleId: "CR-001",
            subject: "self",
            negated: false,
            timeScope: "current",
            confidence: 0.96,
            summary: "suggest_real_world_support",
            signalStatus: "present",
            ideation: "active",
            behaviorOrInjury: "yes",
            canStaySafe: "no",
            workflowLabel: "R3",
            safetyConfirmation: "pending",
            reviewerRequired: true,
            resourceNoticeNeeded: true,
            screeningStatus: "completed"
        };
    }
    if (HARM_OTHERS_PATTERNS.test(sanitized)) {
        return {
            ruleId: "CR-005",
            subject: "self",
            negated: false,
            timeScope: "current",
            confidence: 0.9,
            summary: "suggest_real_world_support",
            signalStatus: "present",
            harmToOthers: "yes",
            workflowLabel: "R2",
            safetyConfirmation: "pending",
            reviewerRequired: true,
            resourceNoticeNeeded: true,
            screeningStatus: "completed"
        };
    }
    if (PSYCHOSIS_PATTERNS.test(sanitized)) {
        return {
            ruleId: "CR-006",
            subject: "self",
            negated: false,
            timeScope: "current",
            confidence: 0.84,
            summary: "suggest_real_world_support",
            signalStatus: "present",
            severeMentalStateSignal: "yes",
            workflowLabel: "R2",
            safetyConfirmation: "pending",
            reviewerRequired: true,
            resourceNoticeNeeded: true,
            screeningStatus: "completed"
        };
    }
    const hasPlan = PLAN_PATTERNS.test(sanitized);
    const hasMeans = MEANS_PATTERNS.test(sanitized);
    const hasEndingIntent = /结束|去死|不想活/.test(sanitized);
    if (hasUnnegatedPattern(sanitized, ACTIVE_SELF_HARM_PATTERNS) || (hasPlan && hasMeans && hasEndingIntent)) {
        const nearTerm = /(现在|今晚|马上|今天)/.test(sanitized);
        return {
            ruleId: hasPlan || hasMeans ? "CR-003" : "CR-004",
            subject: "self",
            negated: false,
            timeScope: nearTerm ? "current" : hasPlan ? "future" : "current",
            confidence: hasPlan || hasMeans ? 0.94 : 0.86,
            summary: "suggest_real_world_support",
            signalStatus: "present",
            ideation: "active",
            plan: hasPlan ? "yes" : "unknown",
            meansAccess: hasMeans ? "yes" : "unknown",
            timing: nearTerm ? "near_term" : hasPlan ? "future_unspecified" : "unknown",
            workflowLabel: nearTerm ? "R3" : "R2",
            safetyConfirmation: resolveRiskSafetyConfirmation(sanitized),
            reviewerRequired: true,
            resourceNoticeNeeded: true,
            screeningStatus: "completed"
        };
    }
    if (hasUnnegatedPattern(sanitized, PASSIVE_IDEATION_PATTERNS)) {
        return {
            ruleId: "CR-004",
            subject: "self",
            negated: false,
            timeScope: "current",
            confidence: 0.8,
            summary: "needs_follow_up",
            signalStatus: "ambiguous",
            ideation: "passive",
            workflowLabel: "R1",
            safetyConfirmation: resolveRiskSafetyConfirmation(sanitized),
            resourceNoticeNeeded: true,
            screeningStatus: "completed"
        };
    }
    if (PRIOR_ATTEMPT_PATTERNS.test(sanitized)) {
        return {
            ruleId: "CR-002",
            subject: "self",
            negated: false,
            timeScope: "past",
            confidence: 0.77,
            summary: "needs_follow_up",
            signalStatus: "ambiguous",
            priorAttempt: "yes",
            workflowLabel: "R1",
            safetyConfirmation: resolveRiskSafetyConfirmation(sanitized),
            resourceNoticeNeeded: true,
            screeningStatus: "completed"
        };
    }
    return null;
}
export function createSafetyRuleService() {
    return {
        evaluateText(current, text, context = {}) {
            const nowIso = (context.now || new Date()).toISOString();
            const base = withDefaults(current || initialSafetyStatus, nowIso);
            const detection = detectSafety(text, context, current?.screeningStatus === "prompted");
            if (!detection)
                return { nextStatus: base, changed: false };
            const evidenceItem = createEvidenceItem(text, detection, context, nowIso);
            const nextStatus = applyWorkflowPatch(base, detection);
            nextStatus.evidence = [...base.evidence, evidenceItem];
            nextStatus.triggeredRuleIds = Array.from(new Set([...base.triggeredRuleIds, detection.ruleId]));
            nextStatus.lastUpdatedAtIso = nowIso;
            nextStatus.missingInformationState =
                nextStatus.workflowLabel === "RX"
                    ? "pending_review"
                    : nextStatus.summary === "not_asked"
                        ? base.missingInformationState
                        : "pending_review";
            return {
                nextStatus,
                changed: true
            };
        }
    };
}
