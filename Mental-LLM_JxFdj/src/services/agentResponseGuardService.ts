import type { ConversationResponseMode } from "../domain/conversationPolicy.js";
import { sanitizePlainText } from "../utils/sanitizeText.js";

export interface AgentResponseGuardInput {
  responseMode?: ConversationResponseMode;
  responseGoal?: "support" | "answer_directly" | "safety" | "respect_boundary" | "close";
  allowedQuestionGoal?: string;
  questionPermission?: "forbidden" | "natural_follow_up" | "focused_clarify";
  allowClosure?: boolean;
  recentAgentReplies?: string[];
  text: string;
}

export interface AgentResponseGuardDecision {
  shouldRetry: boolean;
  reason?:
    | "early_closure_before_user_intent"
  | "question_after_boundary"
    | "too_many_questions"
    | "missing_safety_confirmation"
    | "duplicate_recent_reply";
}

export interface AgentResponseFallbackInput {
  responseMode?: ConversationResponseMode;
  responseGoal?: AgentResponseGuardInput["responseGoal"];
  allowedQuestionGoal?: string;
  latestUserText: string;
  factsToReflect?: string[];
  recentAgentReplies?: string[];
  avoidTexts?: string[];
}

function normalizeForComparison(value: string): string {
  return sanitizePlainText(value).replace(/[，。,；;、!?！？\s"“”‘’]/g, "");
}

function isRecentReply(candidate: string, replies: string[]): boolean {
  const normalizedCandidate = normalizeForComparison(candidate);
  if (!normalizedCandidate) return false;
  return replies.some((reply) => normalizeForComparison(reply) === normalizedCandidate);
}

function escapeFallbackAnchor(value: string): string {
  return String(value || "").replace(/[&<>"']/g, (character) => {
    const escaped = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[character as "&" | "<" | ">" | '"' | "'"];
    return escaped || character;
  });
}

function getFallbackAnchor(input: AgentResponseFallbackInput): string {
  const plannedFact = Array.isArray(input.factsToReflect)
    ? input.factsToReflect.find((fact) => typeof fact === "string" && fact.trim())
    : "";
  const anchor = String(plannedFact || input.latestUserText || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  return anchor ? escapeFallbackAnchor(anchor) : "";
}

const IMMEDIATE_SAFETY_CONFIRMATION_PATTERN =
  /(?:现在|此刻|目前).{0,20}安全吗|(?:是否|有没有|有无).{0,30}(?:已经|正在|马上|可能).{0,20}(?:伤害自己|自残|自杀|不想活|轻生)/;
const EARLY_CLOSURE_PATTERN = /\u4eca\u5929\u5148\u5230\u8fd9\u91cc|\u5148\u804a\u5230\u8fd9\u91cc|\u5148\u8fd9\u6837\u5427|\u4e4b\u540e\u60f3\u804a|\u968f\u65f6\u53ef\u4ee5\u627e\u6211/;

export interface AgentResponseGuardService {
  inspect(input: AgentResponseGuardInput): AgentResponseGuardDecision;
  buildFallback(input: AgentResponseFallbackInput): string;
}

export function createAgentResponseGuardService(): AgentResponseGuardService {
  return {
    inspect(input) {
      const text = sanitizePlainText(input.text);
      const hasQuestion = /[?\uff1f]/.test(text);
      const questionCount = (text.match(/[?\uff1f]/g) || []).length;

      if (isRecentReply(text, input.recentAgentReplies || [])) {
        return { shouldRetry: true, reason: "duplicate_recent_reply" };
      }

      if (
        input.responseGoal === "safety" &&
        input.allowedQuestionGoal === "immediate_safety" &&
        !IMMEDIATE_SAFETY_CONFIRMATION_PATTERN.test(text)
      ) {
        return { shouldRetry: true, reason: "missing_safety_confirmation" };
      }
      if (input.questionPermission === "forbidden" && hasQuestion) {
        return { shouldRetry: true, reason: "question_after_boundary" };
      }
      if (input.questionPermission !== "forbidden" && questionCount > 1) {
        return { shouldRetry: true, reason: "too_many_questions" };
      }
      if (!input.allowClosure && EARLY_CLOSURE_PATTERN.test(text)) {
        return { shouldRetry: true, reason: "early_closure_before_user_intent" };
      }
      return { shouldRetry: false };
    },
    buildFallback(input) {
      const replies = [...(input.recentAgentReplies || []), ...(input.avoidTexts || [])];
      const anchor = getFallbackAnchor(input);
      const requiresImmediateSafety =
        input.responseGoal === "safety" && input.allowedQuestionGoal === "immediate_safety";

      if (requiresImmediateSafety) {
        const contextual = anchor
          ? `我先接住你刚才提到的：“${anchor}”。在继续之前，先确认一件最重要的事：你现在安全吗？如果你已经伤害自己，或觉得自己可能马上会伤害自己，请先联系身边的人或当地紧急服务。`
          : "先确认一件最重要的事：你现在安全吗？如果你已经伤害自己，或觉得自己可能马上会伤害自己，请先联系身边的人或当地紧急服务。";
        if (!isRecentReply(contextual, replies)) return contextual;

        const repeatedSafePrompt = "我需要再确认一次：你现在安全吗？如果不能确定，请先联系身边的人或当地紧急服务。";
        if (!isRecentReply(repeatedSafePrompt, replies)) return repeatedSafePrompt;

        return "请直接告诉我：你现在安全吗？如果不能确定，请先联系身边的人或当地紧急服务。";
      }

      if (input.responseMode === "safety_check" || input.responseMode === "safety_route") {
        const safetySupport = "先确认你的安全最重要，我会先听你说，不继续追问其他内容。";
        if (!isRecentReply(safetySupport, replies)) return safetySupport;
      }

      if (anchor) {
        const contextual = `我先接住你刚才说的：“${anchor}”。我们先围绕这件事继续。`;
        if (!isRecentReply(contextual, replies)) return contextual;
        return `你刚才提到“${anchor}”，这件事值得被认真说清楚。我们先从这里继续。`;
      }

      return "我会先回应你刚才的内容，我们继续沿着这件事聊。";
    }
  };
}
