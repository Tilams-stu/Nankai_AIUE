import type { AgentReportPayload } from "../contracts/workflowContract.js";
import type { ActiveView, SessionState } from "../domain/session.js";
import type { SafetyStatus } from "../domain/safetyStatus.js";
import type { TranscriptState } from "../domain/transcript.js";
import type { UploadStatus } from "../domain/uploadStatus.js";
import { formatLocalTimestamp } from "../utils/formatTime.js";
import { PROFESSIONAL_REPORT_TEMPLATE_VERSION } from "../domain/reportTemplate.js";
import { createReportTemplateService } from "./reportTemplateService.js";
import { createWorkflowPayloadService } from "./workflowPayloadService.js";

export interface ReportDraftSource {
  session: SessionState;
  safety: SafetyStatus;
  transcript: TranscriptState;
  upload: UploadStatus;
  activeView: ActiveView;
  reportVersion?: string;
  generatedAt?: string;
  now?: Date;
}

const reportTemplateService = createReportTemplateService();
const workflowPayloadService = createWorkflowPayloadService();

export function buildReportDraftPayload(source: ReportDraftSource): AgentReportPayload {
  const generatedAt = formatLocalTimestamp(source.now || new Date());
  const reportVersion = source.reportVersion || PROFESSIONAL_REPORT_TEMPLATE_VERSION;
  const enrichedSource: ReportDraftSource = {
    ...source,
    reportVersion,
    generatedAt
  };
  const markdown = reportTemplateService.buildProfessionalReport(enrichedSource);

  return workflowPayloadService.buildPayload({
    reportMarkdown: markdown,
    safety: source.safety,
    studentId: source.session.identity.userId,
    now: source.now
  });
}
