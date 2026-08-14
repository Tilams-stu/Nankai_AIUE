export type SafetyRuleId =
  | "CR-001"
  | "CR-002"
  | "CR-003"
  | "CR-004"
  | "CR-005"
  | "CR-006"
  | "CR-007"
  | "CR-008"
  | "CR-009"
  | "CR-010"
  | "CR-011"
  | "CR-012";

export type SafetyEvidenceSubject = "self" | "other_person" | "unknown";

export type SafetyEvidenceTimeScope = "past" | "current" | "future" | "unknown";

export interface SafetyEvidenceItem {
  id: string;
  ruleId: SafetyRuleId;
  excerpt: string;
  transcriptEntryId?: string;
  subject: SafetyEvidenceSubject;
  negated: boolean;
  timeScope: SafetyEvidenceTimeScope;
  confidence: number;
  collectedAtIso: string;
  note?: string;
}
