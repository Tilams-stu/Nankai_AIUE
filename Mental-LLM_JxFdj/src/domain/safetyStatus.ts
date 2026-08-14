import type { SafetyEvidenceItem, SafetyRuleId } from "./safetyEvidence.js";

export type UnknownableFieldState = "unknown" | "not_asked" | "declined" | "pending_review";

export type SafetySummaryStatus =
  | "not_asked"
  | "no_immediate_risk_disclosed"
  | "needs_follow_up"
  | "suggest_real_world_support";

export type SafetySignalStatus = "none" | "ambiguous" | "present";

export type IdeationStatus = "unknown" | "denied" | "passive" | "active";

export type BinaryRiskStatus = "unknown" | "no" | "yes";

export type TimingStatus = "unknown" | "none" | "future_unspecified" | "near_term" | "now";

export type WorkflowRiskLabel = "R0" | "R1" | "R2" | "R3" | "RX";

export type SafetyConfirmationStatus =
  | "not_started"
  | "pending"
  | "confirmed_safe"
  | "confirmed_unsafe"
  | "uncertain";

const WORKFLOW_RISK_PRIORITY: Record<WorkflowRiskLabel, number> = {
  R0: 0,
  R1: 1,
  RX: 2,
  R2: 3,
  R3: 4
};

const SUMMARY_PRIORITY: Record<SafetySummaryStatus, number> = {
  not_asked: 0,
  no_immediate_risk_disclosed: 0,
  needs_follow_up: 1,
  suggest_real_world_support: 2
};

export interface SafetyStatus {
  summary: SafetySummaryStatus;
  signalStatus: SafetySignalStatus;
  ideation: IdeationStatus;
  plan: BinaryRiskStatus;
  meansAccess: BinaryRiskStatus;
  timing: TimingStatus;
  behaviorOrInjury: BinaryRiskStatus;
  priorAttempt: BinaryRiskStatus;
  harmToOthers: BinaryRiskStatus;
  severeMentalStateSignal: BinaryRiskStatus;
  aloneNow: BinaryRiskStatus;
  trustedPersonAvailable: BinaryRiskStatus;
  canStaySafe: BinaryRiskStatus;
  workflowLabel: WorkflowRiskLabel;
  safetyConfirmation: SafetyConfirmationStatus;
  peakWorkflowLabel: WorkflowRiskLabel;
  peakSummary: SafetySummaryStatus;
  missingInformationState: UnknownableFieldState;
  screeningStatus: "not_started" | "prompted" | "completed" | "incomplete" | "refused";
  reviewerRequired: boolean;
  resourceNoticeNeeded: boolean;
  evidence: SafetyEvidenceItem[];
  triggeredRuleIds: SafetyRuleId[];
  lastUpdatedAtIso?: string;
}

export const initialSafetyStatus: SafetyStatus = {
  summary: "not_asked",
  signalStatus: "none",
  ideation: "unknown",
  plan: "unknown",
  meansAccess: "unknown",
  timing: "unknown",
  behaviorOrInjury: "unknown",
  priorAttempt: "unknown",
  harmToOthers: "unknown",
  severeMentalStateSignal: "unknown",
  aloneNow: "unknown",
  trustedPersonAvailable: "unknown",
  canStaySafe: "unknown",
  workflowLabel: "R0",
  safetyConfirmation: "not_started",
  peakWorkflowLabel: "R0",
  peakSummary: "not_asked",
  missingInformationState: "not_asked",
  screeningStatus: "not_started",
  reviewerRequired: false,
  resourceNoticeNeeded: false,
  evidence: [],
  triggeredRuleIds: []
};

export function mergePeakSafetyStatus(
  currentLabel: WorkflowRiskLabel = "R0",
  currentSummary: SafetySummaryStatus = "not_asked",
  candidateLabel?: WorkflowRiskLabel,
  candidateSummary?: SafetySummaryStatus
): { peakWorkflowLabel: WorkflowRiskLabel; peakSummary: SafetySummaryStatus } {
  if (!candidateLabel || candidateLabel === "R0") {
    return { peakWorkflowLabel: currentLabel, peakSummary: currentSummary };
  }

  const currentPriority = WORKFLOW_RISK_PRIORITY[currentLabel] ?? 0;
  const candidatePriority = WORKFLOW_RISK_PRIORITY[candidateLabel] ?? 0;
  const resolvedLabel = candidatePriority > currentPriority ? candidateLabel : currentLabel;
  const resolvedSummary =
    candidateSummary && SUMMARY_PRIORITY[candidateSummary] > SUMMARY_PRIORITY[currentSummary]
      ? candidateSummary
      : currentSummary;

  return {
    peakWorkflowLabel: resolvedLabel,
    peakSummary: resolvedSummary
  };
}

export function requiresRealWorldSupport(status: SafetyStatus): boolean {
  return status.summary === "suggest_real_world_support" || ["R2", "R3", "RX"].includes(status.workflowLabel);
}

export function assessSafetyFromText(text: string): Partial<SafetyStatus> | null {
  const value = text.trim();
  if (!value) return null;

  // Explicit current denial should only be set when the user clearly negates self-harm intent.
  if (/(没有想自杀|没有想伤害自己|不会伤害自己|不会想不开|不会做傻事)/.test(value)) {
    return {
      summary: "no_immediate_risk_disclosed",
      signalStatus: "none",
      ideation: "denied",
      workflowLabel: "R0",
      missingInformationState: "pending_review",
      screeningStatus: "completed"
    };
  }

  // Immediate or already-happening harm should push to the highest urgency branch.
  if (/(正在自杀|正在伤害自己|已经割伤|已经吞了药|已经吃药过量|现在就去死|现在就结束生命)/.test(value)) {
    return {
      summary: "suggest_real_world_support",
      signalStatus: "present",
      ideation: "active",
      behaviorOrInjury: "yes",
      canStaySafe: "no",
      workflowLabel: "R3",
      missingInformationState: "pending_review",
      screeningStatus: "completed",
      reviewerRequired: true,
      resourceNoticeNeeded: true
    };
  }

  // Explicit self-harm or suicide intent without immediate behavior still requires real-world support.
  if (/(想自杀|想去死|结束生命|伤害自己|自残|割腕|不想活了|轻生)/.test(value)) {
    return {
      summary: "suggest_real_world_support",
      signalStatus: "present",
      ideation: "active",
      workflowLabel: "R2",
      missingInformationState: "pending_review",
      screeningStatus: "completed",
      reviewerRequired: true,
      resourceNoticeNeeded: true
    };
  }

  // Passive wish to disappear or strong hopelessness needs follow-up rather than immediate all-clear.
  if (/(想消失|醒不过来就好了|活着没意思|活着没有意义|撑不住了|不如消失|好想消失)/.test(value)) {
    return {
      summary: "needs_follow_up",
      signalStatus: "ambiguous",
      ideation: "passive",
      workflowLabel: "R1",
      missingInformationState: "pending_review",
      screeningStatus: "completed",
      resourceNoticeNeeded: true
    };
  }

  return null;
}

export function toSafetySummaryLabel(summary: SafetySummaryStatus): string {
  switch (summary) {
    case "not_asked":
      return "未询问";
    case "no_immediate_risk_disclosed":
      return "当前对话未披露明确即时风险";
    case "needs_follow_up":
      return "需要进一步确认";
    case "suggest_real_world_support":
      return "建议现实支持";
    default:
      return "未询问";
  }
}

export function toSafetySupportMessage(summary: SafetySummaryStatus): string {
  switch (summary) {
    case "needs_follow_up":
      return "如果这些想法或感受继续加重，建议尽快联系学校心理健康中心或其他现实中的专业支持。";
    case "suggest_real_world_support":
      return "如果你此刻担心自己的安全，请尽快联系身边可信任的人，并尽快寻求学校心理健康中心或当地紧急服务的现实支持。";
    default:
      return "";
  }
}
