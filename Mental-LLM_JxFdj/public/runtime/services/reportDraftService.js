import { formatLocalTimestamp } from "../utils/formatTime.js";
import { PROFESSIONAL_REPORT_TEMPLATE_VERSION } from "../domain/reportTemplate.js";
import { createReportTemplateService } from "./reportTemplateService.js";
import { createWorkflowPayloadService } from "./workflowPayloadService.js";
const reportTemplateService = createReportTemplateService();
const workflowPayloadService = createWorkflowPayloadService();
export function buildReportDraftPayload(source) {
    const generatedAt = formatLocalTimestamp(source.now || new Date());
    const reportVersion = source.reportVersion || PROFESSIONAL_REPORT_TEMPLATE_VERSION;
    const enrichedSource = {
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
