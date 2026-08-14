(function () {
  let reportDraftServicePromise = null;
  let workflowPayloadServicePromise = null;

  const runtimeImport =
    typeof window !== "undefined" && typeof window.__mentalImport === "function"
      ? window.__mentalImport.bind(window)
      : (specifier) => Function('specifier', 'return import(specifier);')(specifier);

  async function getReportDraftService() {
    if (!reportDraftServicePromise) {
      reportDraftServicePromise = runtimeImport("/runtime/services/reportDraftService.js");
    }
    return reportDraftServicePromise;
  }

  async function getWorkflowPayloadService() {
    if (!workflowPayloadServicePromise) {
      workflowPayloadServicePromise = runtimeImport("/runtime/services/workflowPayloadService.js");
    }
    return workflowPayloadServicePromise;
  }

  async function buildCurrentReportPayload(options = {}) {
    const state = window.MentalSessionRuntime?.getState();
    if (!state) return null;

    const serviceModule = await getReportDraftService();
    const payload = serviceModule.buildReportDraftPayload({
      session: state.session,
      safety: state.safety,
      transcript: state.transcript,
      upload: state.upload,
      activeView: state.activeView,
      reportVersion: options.reportVersion || "cn_non_diagnostic_v1"
    });
    const validationModule = await getWorkflowPayloadService();
    const validation = validationModule.createWorkflowPayloadService().validatePayload(payload);
    if (!validation.ok) {
      console.warn("Report payload validation failed:", validation.errors);
      return null;
    }
    await window.MentalSessionRuntime?.markReportGenerated(options.reportVersion || "cn_non_diagnostic_v1");
    await window.MentalStatusNoticeRuntime?.renderCurrentState();
    return payload;
  }

  window.MentalReportDraftRuntime = {
    buildCurrentReportPayload
  };
})();
