export function normalizeLineEndings(value: string): string {
  return value.replace(/\r\n?/g, "\n");
}

export function sanitizePlainText(value: string): string {
  return normalizeLineEndings(value).trim();
}

export function hasVisibleText(value: string | null | undefined): value is string {
  return typeof value === "string" && sanitizePlainText(value).length > 0;
}

export function isReportLikeContent(value: string | null | undefined): boolean {
  if (!hasVisibleText(value)) return false;

  const normalized = sanitizePlainText(value);
  const reportSignals = [
    /^#\s*(PROTOTYPE BACKGROUND RECORD|心理健康对话初步评估报告|心理健康对话初步记录|本次状态梳理)/m,
    /^#{1,3}\s*(主诉|风险|安全|报告|总结|评估|记录|Metadata|Warm Chat Excerpts|GAD Excerpts)/im,
    /(报告状态|自动上传待留档|REPORT_MARKDOWN|SEVERITY_LEVEL|Workflow Label)/i
  ];

  return reportSignals.some((pattern) => pattern.test(normalized));
}

export function studentFacingReportPlaceholder(value: string | null | undefined): string {
  if (!isReportLikeContent(value)) {
    return hasVisibleText(value) ? sanitizePlainText(value) : "";
  }

  return "本次对话记录已在后台生成，感谢你的分享。你在学生端只会看到简短反馈和记录状态。";
}
