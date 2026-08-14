import type { AppState } from "../app/appState.js";
import type { AssessmentFieldKey } from "../domain/assessmentFields.js";
import type {
  ConversationCompletionStatus,
  ConversationPolicy,
  ConversationResponseMode,
  SafetyPromptStatus
} from "../domain/conversationPolicy.js";
import { sanitizePlainText } from "../utils/sanitizeText.js";

const LOW_INFORMATION_PATTERNS = [
  /^嗯+$/,
  /^啊+$/,
  /^好的?$/,
  /^行+$/,
  /^可以+$/,
  /^还行$/,
  /^还好$/,
  /^一般$/,
  /^没了?$/,
  /^没有了?$/,
  /^差不多$/,
  /^就这样$/,
  /^先这样$/,
  /^不知道$/,
  /^不太清楚$/,
  /^随便$/,
  /^都行$/,
  /^不说$/,
  /^不想说$/,
  /^暂时没有$/
];

function isCaptured(status: string): boolean {
  return ["collected", "partially_collected", "refused"].includes(status);
}

function hasFieldValue(state: AppState, key: AssessmentFieldKey): boolean {
  const field = state.session.assessment.fields[key];
  return isCaptured(field.status) || sanitizePlainText(field.value).length > 0;
}

function wasAskedRecently(state: AppState, key: AssessmentFieldKey, maxTurnsAgo = 2): boolean {
  const field = state.session.assessment.fields[key];
  if (typeof field.lastAskedTurn !== "number") {
    return false;
  }
  return state.session.dialogueStage.currentTurn - field.lastAskedTurn <= maxTurnsAgo;
}

function hasMinimumSufficientInfo(state: AppState): boolean {
  const chiefComplaint = hasFieldValue(state, "chief_complaint");
  const duration = hasFieldValue(state, "duration");
  const stateSignals = ["emotion_state", "cognition_state", "behavior_state", "somatic_state", "sleep_appetite"].some((key) =>
    hasFieldValue(state, key as AssessmentFieldKey)
  );
  const functionalImpact = hasFieldValue(state, "functional_impact");
  const safetyReady =
    ["completed", "incomplete", "refused"].includes(state.safety.screeningStatus) ||
    state.session.assessment.fields.risk_disclosure.status === "refused" ||
    state.session.assessment.fields.risk_disclosure.status === "collected";

  return chiefComplaint && (duration || stateSignals) && (functionalImpact || safetyReady);
}

function hasCoreConversationInfo(state: AppState): boolean {
  const chiefComplaint = hasFieldValue(state, "chief_complaint");
  const duration = hasFieldValue(state, "duration");
  const stateSignals = ["emotion_state", "cognition_state", "behavior_state", "somatic_state", "sleep_appetite"].some((key) =>
    hasFieldValue(state, key as AssessmentFieldKey)
  );
  return chiefComplaint && (duration || stateSignals) && hasFieldValue(state, "functional_impact");
}

function hasResolvedSafety(state: AppState): boolean {
  return ["completed", "incomplete", "refused"].includes(state.safety.screeningStatus) ||
    state.session.assessment.fields.risk_disclosure.status === "refused";
}

function isLowInformationText(text: string): boolean {
  const normalized = sanitizePlainText(text).replace(/[，。,！？!?、\s]/g, "");
  if (!normalized) return true;
  if (normalized.length <= 2) return true;
  return LOW_INFORMATION_PATTERNS.some((pattern) => pattern.test(normalized));
}

function countLowInformationTurns(state: AppState): number {
  const userTurns = state.transcript.entries
    .filter((entry) => entry.role === "user" && entry.status === "final" && !entry.hidden)
    .slice(-6);

  let count = 0;
  for (let index = userTurns.length - 1; index >= 0; index -= 1) {
    if (!isLowInformationText(userTurns[index].content)) {
      break;
    }
    count += 1;
  }
  return count;
}

function isClosingAcknowledgement(state: AppState): boolean {
  const latestUserTurn = state.transcript.entries
    .filter((entry) => entry.role === "user" && entry.status === "final" && !entry.hidden)
    .at(-1);
  if (!latestUserTurn) return false;

  const normalized = sanitizePlainText(latestUserTurn.content).replace(/[，。,！？!?、\s]/g, "");
  return /^(好|好的|好吧|行|可以|嗯|嗯嗯|知道了|明白了|就这样|先这样|到这里|没了|没有了|基本上没有了|这个基本上没有了|没什么了|没别的了|不用了|差不多了|那今天先这样)$/.test(normalized);
}

function buildReason(completionStatus: ConversationCompletionStatus, lowInformationTurns: number): string {
  if (completionStatus === "awaiting_safety") {
    return "安全确认尚未完成";
  }
  if (completionStatus === "completed") {
    return "用户已经给出可收尾确认";
  }
  if (completionStatus === "ready_to_close") {
    return "核心信息已足够，适合收束";
  }
  if (lowInformationTurns >= 2) {
    return "连续低信息回应过多，应转向总结";
  }
  return "继续自然对话";
}

function buildResponseMode(
  state: AppState,
  completionStatus: ConversationCompletionStatus,
  minimumSufficientInfo: boolean,
  lowInformationTurns: number,
  targetField?: AssessmentFieldKey
): ConversationResponseMode {
  const safetyNeedsConfirmation =
    ["R1", "R2", "R3", "RX"].includes(state.safety.workflowLabel) &&
    state.safety.safetyConfirmation !== "confirmed_safe";
  if (safetyNeedsConfirmation) {
    return "safety_route";
  }
  if (state.session.interaction.mode === "closing" || completionStatus === "ready_to_close") {
    return "close";
  }
  void minimumSufficientInfo;
  void lowInformationTurns;
  void targetField;
  // A report can be sufficient while the user still has more to say. Missing fields never control dialogue.
  return "respond";
}

function buildCompletionStatus(
  state: AppState,
  minimumSufficientInfo: boolean,
  lowInformationTurns: number
): ConversationCompletionStatus {
  if (state.upload.reportStatus === "uploaded") {
    return "completed";
  }
  // A user may choose to finish after a summary even when they have deliberately
  // shared too little for the minimum-information threshold. Preserve the gaps
  // in the local report instead of restarting the interview with more questions.
  if (
    ["D10_summary_confirm", "D11_feedback_next_step"].includes(state.session.dialogueStage.currentStage) &&
    isClosingAcknowledgement(state)
  ) {
    return "ready_to_close";
  }
  if (minimumSufficientInfo) {
    return "sufficient";
  }
  return "gathering";
}

function buildRecentAskedTopics(state: AppState): AssessmentFieldKey[] {
  const metadataTopics = Object.values(state.session.assessment.fields)
    .filter((field) => wasAskedRecently(state, field.key, 3))
    .sort((left, right) => (right.lastAskedTurn || 0) - (left.lastAskedTurn || 0))
    .map((field) => field.key)
    .slice(0, 3);

  if (metadataTopics.length > 0) {
    return metadataTopics;
  }

  const recentAgentTurns = state.transcript.entries
    .filter((entry) => entry.role === "agent" && entry.status === "final" && !entry.hidden)
    .slice(-4)
    .map((entry) => sanitizePlainText(entry.content));

  const fieldHints: Array<{ key: AssessmentFieldKey; patterns: RegExp[] }> = [
    { key: "risk_disclosure", patterns: [/安全|风险|伤害自己|伤害他人|想活|想死|不想活/] },
    { key: "functional_impact", patterns: [/影响|学习|上课|作业|生活|效率/] },
    { key: "duration", patterns: [/多久|持续|最近|什么时候|多长时间/] },
    { key: "emotion_state", patterns: [/情绪|心情|焦虑|低落|烦躁|难过|压抑/] },
    { key: "sleep_appetite", patterns: [/睡眠|食欲|睡不着|失眠|早醒|吃不下/] },
    { key: "support_history", patterns: [/帮助|求助|支持|心理中心|家人|朋友|老师/] }
  ];

  const topics: AssessmentFieldKey[] = [];
  fieldHints.forEach((hint) => {
    if (recentAgentTurns.some((text) => hint.patterns.some((pattern) => pattern.test(text)))) {
      topics.push(hint.key);
    }
  });

  return topics.slice(0, 3);
}

function buildTargetField(state: AppState, minimumSufficientInfo: boolean): AssessmentFieldKey | undefined {
  void state;
  void minimumSufficientInfo;
  return undefined;
}

function buildSafetyPromptStatus(state: AppState): SafetyPromptStatus {
  if (state.safety.screeningStatus === "completed") {
    return "acknowledged";
  }
  if (state.safety.screeningStatus === "prompted") {
    return "needed";
  }
  if (state.session.assessment.fields.risk_disclosure.status === "not_asked") {
    return "needed";
  }
  return "not_needed";
}

export function createConversationPolicyService() {
  return {
    buildConversationPolicy(state: AppState): ConversationPolicy {
      const lowInformationTurns = countLowInformationTurns(state);
      const minimumSufficientInfo = hasMinimumSufficientInfo(state);
      const completionStatus = buildCompletionStatus(state, minimumSufficientInfo, lowInformationTurns);
      const targetField = buildTargetField(state, minimumSufficientInfo);
      const responseMode = buildResponseMode(state, completionStatus, minimumSufficientInfo, lowInformationTurns, targetField);

      return {
        responseMode,
        completionStatus,
        targetField,
        reason: buildReason(completionStatus, lowInformationTurns),
        repeatedTopic: lowInformationTurns >= 2 ? "同一主题低信息回应" : undefined,
        lowInformationTurns,
        minimumSufficientInfo,
        safetyPromptStatus: buildSafetyPromptStatus(state),
        recentAskedTopics: buildRecentAskedTopics(state)
      };
    }
  };
}
