export const SUPPLEMENTAL_ASSESSMENT_IDS = ["phq9", "gad7"] as const;

export type SupplementalAssessmentId = (typeof SUPPLEMENTAL_ASSESSMENT_IDS)[number];
export type SupplementalInterpretationKey = "minimal" | "mild" | "moderate" | "moderately_severe" | "severe";

export interface AssessmentSource {
  name: string;
  citation: string;
  doi: string;
  officialUrl: string;
  version: string;
}

export interface SupplementalAssessmentDefinition {
  id: SupplementalAssessmentId;
  name: string;
  description: string;
  recallPeriod: string;
  questions: string[];
  options: string[];
  source: AssessmentSource;
}

export interface SupplementalAssessmentResult {
  assessmentId: SupplementalAssessmentId;
  assessmentName: string;
  total: number;
  maximum: number;
  interpretationKey: SupplementalInterpretationKey;
  interpretationLabel: string;
  source: AssessmentSource;
  requiresSafetyFollowUp: boolean;
  reportSummary: string;
}

