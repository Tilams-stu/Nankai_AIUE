import type { ActiveView, ConsentStatus, UserControlState } from "./session.js";
import type { ConversationPolicy } from "./conversationPolicy.js";
import type { InteractionState } from "./interactionState.js";
import type { ResponsePlan } from "./responsePlan.js";
import type { ReportToFeishuWorkflowInput } from "../contracts/workflowContract.js";

export const CONVERSATION_CONTEXT_SCHEMA_VERSION = "conversation_context_v1";

export interface ConversationContextFieldSnapshot {
  key: string;
  label: string;
  value: string;
  status: string;
  evidenceCount: number;
  lastUpdatedAtIso?: string;
}

export interface ConversationContextSafetySnapshot {
  screeningStatus: string;
  summary: string;
  workflowLabel: string;
  safetyConfirmation: string;
  resourceNoticeNeeded: boolean;
  reviewerRequired: boolean;
  nextRequiredAction: string;
}

export interface ConversationContextPacket {
  schemaVersion: typeof CONVERSATION_CONTEXT_SCHEMA_VERSION;
  sessionId: string;
  activeView: ActiveView;
  consentStatus: ConsentStatus;
  userControl: UserControlState;
  currentStage: string;
  currentStageLabel: string;
  confirmedFields: ConversationContextFieldSnapshot[];
  missingFields: ConversationContextFieldSnapshot[];
  safety: ConversationContextSafetySnapshot;
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
  agentInternalPayload?: ReportToFeishuWorkflowInput;
  agentInternalAudit?: {
    payloadHash?: string;
    sessionId?: string;
    auditRecordPath?: string;
  };
  generatedAtIso: string;
  sourceOfTruth: "local_structured_state";
}
