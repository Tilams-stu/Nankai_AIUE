import type { ReportDraftSource } from "./reportDraftService.js";
import {
  getAssessmentFieldLabel,
  getAssessmentStatusLabel,
  type AssessmentFieldKey
} from "../domain/assessmentFields.js";
import { PROFESSIONAL_REPORT_TEMPLATE_VERSION } from "../domain/reportTemplate.js";
import { getDialogueStageLabel } from "../domain/dialogueStage.js";
import { toSafetySummaryLabel } from "../domain/safetyStatus.js";
import { toUploadStatusLabel } from "../domain/uploadStatus.js";

export interface ReportTemplateService {
  buildProfessionalReport(source: ReportDraftSource): string;
  renderAssessmentFields(source: ReportDraftSource, keys: AssessmentFieldKey[]): string[];
  renderSafetySection(source: ReportDraftSource): string[];
  renderInformationGaps(source: ReportDraftSource): string[];
}

function renderFieldLine(label: string, status: string, value: string): string {
  if (status === "未询问") {
    return `- ${label}：本次对话未涉及`;
  }
  if (status === "已询问未回答") {
    return `- ${label}：已询问但未回答`;
  }
  return `- ${label}：${value || "未提供"}（${status}）`;
}

function buildRecommendationLines(source: ReportDraftSource): string[] {
  if (source.safety.resourceNoticeNeeded) {
    return ["- 本次对话出现需要现实支持的安全线索；应优先提供已审核的紧急支持或医疗资源。"];
  }

  const fields = source.session.assessment.fields;
  const hasSustainedFunctionalImpact =
    ["collected", "partially_collected"].includes(fields.duration.status) &&
    ["collected", "partially_collected"].includes(fields.functional_impact.status);
  if (hasSustainedFunctionalImpact) {
    return ["- 已记录到持续性困扰及功能影响；可结合学生的意愿，考虑进一步的专业心理支持或医疗评估。本记录不构成诊断。"];
  }

  return ["- 当前信息不足以生成具体转介建议；后续仅在学生继续表达或出现新的安全线索时再更新评估。"];
}

export function createReportTemplateService(): ReportTemplateService {
  return {
    buildProfessionalReport(source) {
      const generatedAt = source.generatedAt;
      const stageLabel = getDialogueStageLabel(source.session.dialogueStage.currentStage);
      const reportVersion = source.reportVersion || PROFESSIONAL_REPORT_TEMPLATE_VERSION;
      const peakWorkflowLabel = source.safety.peakWorkflowLabel || source.safety.workflowLabel;
      const peakSummary = source.safety.peakSummary || source.safety.summary;

      return [
        "# 心理健康对话初步评估报告（后台自动上传稿）",
        "",
        "## 一、基本信息",
        `- 会话 ID：${source.session.id}`,
        `- 学生 ID：${source.session.identity.userId}`,
        `- 是否模拟身份：${source.session.identity.synthetic ? "是" : "否"}`,
        `- 生成时间：${generatedAt}`,
        `- 当前阶段：${stageLabel}`,
        `- 报告版本：${reportVersion}`,
        `- 上传状态：${toUploadStatusLabel(source.upload.userVisibleStatus)}`,
        "",
        "## 二、使用范围与局限",
        "本记录仅基于本次文本对话中的信息整理，用于初步筛查与后台留档，不构成医学诊断，也不能替代心理咨询、精神科评估或紧急服务。",
        "",
        "## 三、主诉与时间线",
        ...this.renderAssessmentFields(source, ["chief_complaint", "duration", "campus_context"]),
        "",
        "## 四、情绪、认知、行为与身体状态",
        ...this.renderAssessmentFields(source, [
          "emotion_state",
          "cognition_state",
          "behavior_state",
          "somatic_state",
          "sleep_appetite"
        ]),
        "",
        "## 五、功能影响",
        ...this.renderAssessmentFields(source, ["functional_impact"]),
        "",
        "## 六、支持系统与既往求助",
        ...this.renderAssessmentFields(source, ["support_history", "scale_result"]),
        "",
        "## 七、安全风险与处置",
        ...this.renderSafetySection(source),
        "",
        "## 八、信息缺口",
        ...this.renderInformationGaps(source),
        "",
        "## 九、分流与下一步建议",
        ...buildRecommendationLines(source),
        "",
        "## 十、自动报告上传",
        `- 工作流标签：${peakWorkflowLabel}`,
        `- 安全摘要：${toSafetySummaryLabel(peakWorkflowLabel === "R0" ? source.safety.summary : peakSummary)}`,
        `- 当前工作流标签：${source.safety.workflowLabel}`,
        `- 当前安全摘要：${toSafetySummaryLabel(source.safety.summary)}`,
        `- 最近上传提示：${source.upload.lastMessage || "无"}`,
        `- 审计记录：${source.upload.lastAuditRecordPath || "未生成"}`
      ].join("\n");
    },
    renderAssessmentFields(source, keys) {
      return keys.map((key) => {
        const field = source.session.assessment.fields[key];
        return renderFieldLine(getAssessmentFieldLabel(key), getAssessmentStatusLabel(field.status), field.value);
      });
    },
    renderSafetySection(source) {
      const peakWorkflowLabel = source.safety.peakWorkflowLabel || source.safety.workflowLabel;
      const peakSummary = source.safety.peakSummary || source.safety.summary;
      const reportSummary = peakWorkflowLabel === "R0" ? source.safety.summary : peakSummary;
      const screeningLine = source.safety.screeningStatus === "not_started"
        ? "- 安全筛查状态：本次对话未完成安全询问；不能据此推断不存在风险。"
        : `- 安全筛查状态：${source.safety.screeningStatus}`;
      const lines = [
        screeningLine,
        `- 安全摘要：${toSafetySummaryLabel(reportSummary)}`,
        `- 工作流标签：${peakWorkflowLabel}（仅用于系统分流，不代表临床风险分级）`,
        `- 当前安全摘要：${toSafetySummaryLabel(source.safety.summary)}`,
        `- 当前工作流标签：${source.safety.workflowLabel}`,
        `- 历史风险峰值：${peakWorkflowLabel}`,
        `- 历史风险摘要：${toSafetySummaryLabel(peakSummary)}`,
        `- 触发规则：${source.safety.triggeredRuleIds.length ? source.safety.triggeredRuleIds.join(", ") : "无"}`,
        `- 资源提示需求：${source.safety.resourceNoticeNeeded ? "需要" : "暂不需要"}`
      ];

      if (source.safety.evidence.length === 0) {
        lines.push("- 风险证据摘要：本次记录中暂无明确风险证据。");
        return lines;
      }

      source.safety.evidence.slice(-3).forEach((item, index) => {
        lines.push(
          `- 风险证据 ${index + 1}：${item.excerpt}（规则 ${item.ruleId}，主体 ${item.subject}，时间 ${item.timeScope}）`
        );
      });
      return lines;
    },
    renderInformationGaps(source) {
      const gaps = Object.values(source.session.assessment.fields).filter((field) =>
        ["asked_no_answer", "conflicting"].includes(field.status)
      );

      if (gaps.length === 0) {
        return ["- 本次对话未形成需要单独列出的信息缺口。"];
      }

      return gaps.map((field) =>
        `- ${getAssessmentFieldLabel(field.key)}：${getAssessmentStatusLabel(field.status)}`
      );
    }
  };
}
