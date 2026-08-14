import type { ConversationPolicy } from "../domain/conversationPolicy.js";
import type { InteractionState } from "../domain/interactionState.js";
import type { ResponsePlan } from "../domain/responsePlan.js";

export interface ConversationContextFieldSnapshot {
  key: string;
  label: string;
  value: string;
  status: string;
  evidenceCount: number;
  lastUpdatedAtIso?: string;
}

export interface ConversationContextPacket {
  schemaVersion: "conversation_context_v1";
  sessionId: string;
  activeView: string;
  consentStatus: string;
  userControl: string;
  currentStage: string;
  currentStageLabel: string;
  confirmedFields: ConversationContextFieldSnapshot[];
  missingFields: ConversationContextFieldSnapshot[];
  safety: {
    screeningStatus: string;
    summary: string;
    workflowLabel: string;
    resourceNoticeNeeded: boolean;
    reviewerRequired: boolean;
    nextRequiredAction: string;
  };
  nextQuestionPriority: string[];
  avoidRepeatingFields: string[];
  recentUserEvidence: string[];
  recentAgentEvidence: string[];
  recentDialogueTurns: Array<{
    id: string;
    role: "user" | "agent";
    text: string;
    createdAtIso: string;
  }>;
  interaction: InteractionState;
  responsePlan: ResponsePlan;
  conversationPolicy: ConversationPolicy;
  agentInternalPayload?: {
    input: string;
    SEVERITY_LEVEL: string;
    Student_ID: string;
    time: string;
  };
  agentInternalAudit?: {
    payloadHash?: string;
    sessionId?: string;
    auditRecordPath?: string;
  };
  generatedAtIso: string;
  sourceOfTruth: "local_structured_state";
}

export type ChatRole = "user" | "assistant" | "system";

export interface ChatMessage {
  role: ChatRole;
  content: string;
  content_type: "text";
}

export interface ChatRequest {
  bot_id: string;
  user_id: string;
  user_name?: string;
  stream: true;
  auto_save_history: boolean;
  additional_messages: ChatMessage[];
  local_context_packet?: ConversationContextPacket;
  response_repair_instruction?: string;
}

export interface ChatDeltaEvent {
  type: "delta";
  content: string;
}

export interface ChatDoneEvent {
  type: "done";
}

export interface ChatErrorEvent {
  type: "error";
  message: string;
  statusCode?: number;
  errorCode?: string;
}

export type ChatStreamEvent = ChatDeltaEvent | ChatDoneEvent | ChatErrorEvent;

export interface ChatService {
  send(request: ChatRequest, signal?: AbortSignal): AsyncIterable<ChatStreamEvent>;
}
