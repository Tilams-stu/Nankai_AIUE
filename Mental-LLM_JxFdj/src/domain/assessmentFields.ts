export const ASSESSMENT_FIELD_KEYS = [
  "chief_complaint",
  "duration",
  "campus_context",
  "emotion_state",
  "cognition_state",
  "behavior_state",
  "somatic_state",
  "functional_impact",
  "sleep_appetite",
  "support_history",
  "risk_disclosure",
  "scale_result"
] as const;

export type AssessmentFieldKey = (typeof ASSESSMENT_FIELD_KEYS)[number];

export type AssessmentFieldStatus =
  | "not_asked"
  | "asked_no_answer"
  | "partially_collected"
  | "collected"
  | "refused"
  | "conflicting";

export type AssessmentEvidenceSource =
  | "user_explicit"
  | "user_confirmed_summary"
  | "scale_result"
  | "agent_inference";

export interface AssessmentEvidence {
  transcriptEntryId?: string;
  excerpt: string;
  collectedAtIso: string;
  confidence: number;
  sourceType: AssessmentEvidenceSource;
}

export interface AssessmentFieldState {
  key: AssessmentFieldKey;
  status: AssessmentFieldStatus;
  value: string;
  evidence: AssessmentEvidence[];
  lastAskedTurn?: number;
  lastAskedAtIso?: string;
  lastUpdatedAtIso?: string;
}

export interface AssessmentState {
  fields: Record<AssessmentFieldKey, AssessmentFieldState>;
  lastUpdatedAtIso: string;
}

export const CORE_ASSESSMENT_FIELDS: AssessmentFieldKey[] = [
  "chief_complaint",
  "duration",
  "emotion_state",
  "functional_impact",
  "risk_disclosure"
];

export function createAssessmentFieldState(key: AssessmentFieldKey): AssessmentFieldState {
  return {
    key,
    status: "not_asked",
    value: "",
    evidence: []
  };
}

export function createInitialAssessmentState(now: Date = new Date()): AssessmentState {
  const fields = {} as Record<AssessmentFieldKey, AssessmentFieldState>;

  ASSESSMENT_FIELD_KEYS.forEach((key) => {
    fields[key] = createAssessmentFieldState(key);
  });

  return {
    fields,
    lastUpdatedAtIso: now.toISOString()
  };
}

export function getAssessmentFieldLabel(key: AssessmentFieldKey): string {
  switch (key) {
    case "chief_complaint":
      return "主要困扰";
    case "duration":
      return "持续时间与变化";
    case "campus_context":
      return "校园与生活情境";
    case "emotion_state":
      return "情绪状态";
    case "cognition_state":
      return "认知表现";
    case "behavior_state":
      return "行为表现";
    case "somatic_state":
      return "身体状态";
    case "functional_impact":
      return "功能影响";
    case "sleep_appetite":
      return "睡眠与食欲";
    case "support_history":
      return "支持系统与既往求助";
    case "risk_disclosure":
      return "风险披露";
    case "scale_result":
      return "量表或补充评估";
    default:
      return key;
  }
}

export function getAssessmentStatusLabel(status: AssessmentFieldStatus): string {
  switch (status) {
    case "not_asked":
      return "未询问";
    case "asked_no_answer":
      return "已询问未回答";
    case "partially_collected":
      return "部分收集";
    case "collected":
      return "已收集";
    case "refused":
      return "用户拒答";
    case "conflicting":
      return "信息冲突";
    default:
      return "未询问";
  }
}
