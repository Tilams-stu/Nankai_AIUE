(function () {
  let workflowServicePromise = null;
  let workflowAuditServicePromise = null;
  let helperModulesPromise = null;
  let conversationPolicyServicePromise = null;
  let reportAutoUpdateCoordinatorPromise = null;
  let submitting = false;
  let lastGatewayResult = null;
  let finalizedSessionIds = new Set();
  let agentFinalizationSessionIds = new Set();

  const runtimeImport =
    typeof window !== 'undefined' && typeof window.__mentalImport === 'function'
      ? window.__mentalImport.bind(window)
      : (specifier) => Function('specifier', 'return import(specifier);')(specifier);

  function buildPatch(reportStatus, userVisibleStatus, extra = {}) {
    return {
      reportStatus,
      userVisibleStatus,
      lastUpdatedAtIso: new Date().toISOString(),
      ...extra
    };
  }

  function normalizeText(value) {
    return typeof value === 'string' ? value.replace(/\r\n?/g, '\n').trim() : '';
  }

  function hasVisibleText(value) {
    return normalizeText(value).length > 0;
  }

  const EXPLICIT_CLOSING_PATTERN = /(?:^|[\s\uFF0C\u3002\uFF01\uFF1F!,.])(?:\u5148\u5230\u8fd9\u91cc|\u5148\u804a\u5230\u8fd9\u91cc|\u4eca\u5929\u5c31\u5230\u8fd9\u91cc|\u4eca\u5929\u5148\u8fd9\u6837|\u4eca\u5929\u5148\u8fd9\u6837\u5427|\u5148\u8fd9\u6837|\u5148\u8fd9\u6837\u5427|\u7ed3\u675f\u4f1a\u8bdd|\u4e0d\u804a\u4e86|\u5e2e\u6211\u603b\u7ed3|\u603b\u7ed3\u4e00\u4e0b|\u751f\u6210\u62a5\u544a|\u7ed3\u675f\u5427|\u5230\u8fd9\u91cc\u5427|\u53ef\u4ee5\u4e86|\u591f\u4e86|\u4e0d\u7528\u518d\u95ee\u4e86|\u5c31\u5230\u8fd9|\u5230\u8fd9\u91cc\u5c31\u884c|\u597d\u4e86|\u53ef\u4ee5\u7ed3\u675f\u4e86|\u57fa\u672c\u4e0a\u6ca1\u6709\u4e86|\u8fd9\u4e2a\u57fa\u672c\u4e0a\u6ca1\u6709\u4e86|\u6ca1\u4ec0\u4e48\u4e86|\u6ca1\u522b\u7684\u4e86|\u5c31\u8fd9\u4e9b|\u5dee\u4e0d\u591a\u5c31\u8fd9\u4e9b)(?:$|[\s\uFF0C\u3002\uFF01\uFF1F!,.])/;

  function shouldFinalizeFromUserText(text) {
    const normalized = normalizeText(text);
    if (!normalized) return false;
    return EXPLICIT_CLOSING_PATTERN.test(normalized);
  }

  function shouldFinalizeFromAgentText(text) {
    // Agent prose is not a reliable workflow acknowledgement. Only local policy
    // and an explicit user closing action may prepare a report payload.
    return false;
  }

  function getSessionFinalizeKey(state) {
    if (!state || !state.session || !state.session.id) return null;
    return state.session.id;
  }

  function clearFinalizationForState(state) {
    const sessionKey = getSessionFinalizeKey(state);
    if (!sessionKey) return;
    finalizedSessionIds.delete(sessionKey);
    agentFinalizationSessionIds.delete(sessionKey);
  }

  function markStateFinalized(state) {
    const sessionKey = getSessionFinalizeKey(state);
    if (!sessionKey) return;
    finalizedSessionIds.add(sessionKey);
  }

  function isStateFinalized(state) {
    const sessionKey = getSessionFinalizeKey(state);
    if (!sessionKey) return false;
    return finalizedSessionIds.has(sessionKey);
  }

  async function applyPatch(patch) {
    const state = await window.MentalSessionRuntime?.updateUpload(patch);
    await window.MentalStatusNoticeRuntime?.renderCurrentState();
    return state;
  }

  async function getWorkflowService() {
    if (!workflowServicePromise) {
      workflowServicePromise = runtimeImport('/runtime/services/workflowService.js').then((module) =>
        module.createWorkflowService(fetch)
      );
    }
    return workflowServicePromise;
  }

  async function getWorkflowAuditService() {
    if (!workflowAuditServicePromise) {
      workflowAuditServicePromise = runtimeImport('/runtime/services/workflowAuditService.js').then((module) =>
        module.createWorkflowAuditService(fetch)
      );
    }
    return workflowAuditServicePromise;
  }

  async function getConversationPolicyService() {
    if (!conversationPolicyServicePromise) {
      conversationPolicyServicePromise = runtimeImport('/runtime/services/conversationPolicyService.js').then((module) =>
        module.createConversationPolicyService()
      );
    }
    return conversationPolicyServicePromise;
  }

  async function getReportAutoUpdateCoordinator() {
    if (!reportAutoUpdateCoordinatorPromise) {
      reportAutoUpdateCoordinatorPromise = runtimeImport('/runtime/services/reportAutoUpdateCoordinator.js').then((module) =>
        module.createReportAutoUpdateCoordinator()
      );
    }
    return reportAutoUpdateCoordinatorPromise;
  }

  async function getGatewayStatus(statusUrl = '/api/workflow/status') {
    try {
      const response = await fetch(statusUrl);
      if (!response.ok) {
        return { ok: false, mode: 'unknown', enabled: false };
      }
      const data = await response.json();
      return {
        ok: true,
        mode: data.mode || 'unknown',
        enabled: Boolean(data.enabled),
        workflow: data.workflow || 'report-to-feishu'
      };
    } catch {
      return { ok: false, mode: 'unknown', enabled: false };
    }
  }

  async function getHelperModules() {
    if (!helperModulesPromise) {
      helperModulesPromise = Promise.all([
        runtimeImport('/runtime/utils/formatTime.js'),
        runtimeImport('/runtime/domain/safetyStatus.js')
      ]).then(([formatModule, safetyModule]) => ({
        formatLocalTimestamp: formatModule.formatLocalTimestamp,
        toSafetySummaryLabel: safetyModule.toSafetySummaryLabel
      }));
    }
    return helperModulesPromise;
  }

  async function markProcessing() {
    return applyPatch(buildPatch('pending_review', 'processing'));
  }

  async function markSubmittedPendingConfirmation() {
    return applyPatch(buildPatch('uploaded', 'submitted_pending_confirmation'));
  }

  async function markFailed() {
    return applyPatch(buildPatch('upload_failed', 'failed_needs_investigation'));
  }

  async function reset() {
    lastGatewayResult = null;
    const currentState = window.MentalSessionRuntime?.getState?.();
    clearFinalizationForState(currentState);
    return applyPatch(buildPatch('draft', 'not_started', { lastAuditRecordPath: undefined }));
  }

  async function submitReportViaGateway(options = {}) {
    if (!options.gatewayUrl || !options.payload || submitting) return null;

    submitting = true;
    await markProcessing();
    const workflowService = await getWorkflowService();
    try {
      const sessionSnapshot =
        options.sessionSnapshot || (await window.MentalSessionRuntime?.exportSnapshot?.());
      const result = await workflowService.submit(options.gatewayUrl, options.payload, sessionSnapshot);
      lastGatewayResult = result;

      if (result.ok) {
        const keepProcessing = Boolean(options.keepProcessing || result.gatewayMode === 'agent_internal');
        await applyPatch(
          buildPatch(keepProcessing ? 'pending_review' : 'uploaded', keepProcessing ? 'processing' : 'submitted_pending_confirmation', {
            workflowRunId: result.workflowRunId,
            reportVersion: result.reportVersion,
            lastAuditRecordPath: result.auditRecordPath,
            lastPayloadHash: result.payloadHash,
            lastSessionId: result.sessionId,
            lastHttpStatus: result.httpStatus,
            lastMessage: keepProcessing
              ? 'Local payload prepared for the Agent-internal tool path; external confirmation is still pending.'
              : result.snapshotAccepted === false
                ? 'Snapshot not accepted by gateway.'
                : undefined
          })
        );
      } else {
        await applyPatch(
          buildPatch('upload_failed', 'failed_needs_investigation', {
            lastAuditRecordPath: undefined,
            lastHttpStatus: result.httpStatus,
            lastMessage: result.message
          })
        );
      }

      return result;
    } finally {
      submitting = false;
    }
  }

  async function submitSyntheticGatewayRecord(options = {}) {
    const payload = await window.MentalReportDraftRuntime?.buildCurrentReportPayload({
      chatContainerId: options.chatContainerId || 'chatBox',
      gadContainerId: options.gadContainerId || 'gadChatBox',
      reportVersion: options.reportVersion || 'cn_non_diagnostic_v1'
    });
    if (!payload) return null;

    return submitReportViaGateway({
      gatewayUrl: options.gatewayUrl || '/api/workflow/report-to-feishu',
      payload
    });
  }

  function toAgentInternalPayload(payload) {
    return {
      input: payload.REPORT_MARKDOWN,
      SEVERITY_LEVEL: payload.SEVERITY_LEVEL,
      Student_ID: payload.STUDENT_ID,
      time: payload.TIME
    };
  }

  async function prepareReportUpdate(options = {}) {
    const state = window.MentalSessionRuntime?.getState?.();
    if (!state?.session?.identity?.userId || submitting) return null;

    const coordinator = await getReportAutoUpdateCoordinator();
    const trigger = options.trigger || 'meaningful_self_evidence';
    const decision = coordinator.decide({ state, trigger });
    if (!decision.shouldDispatch) return null;

    const payload = await window.MentalReportDraftRuntime?.buildCurrentReportPayload({
      reportVersion: options.reportVersion || 'cn_non_diagnostic_v1'
    });
    if (!payload) return null;

    const gateway = await getGatewayStatus(options.statusUrl || '/api/workflow/status');
    if (!gateway.ok || !gateway.enabled || gateway.mode !== 'agent_internal') {
      return null;
    }

    const sessionSnapshot = await window.MentalSessionRuntime?.exportSnapshot?.();
    const result = await submitReportViaGateway({
      gatewayUrl: options.gatewayUrl || '/api/workflow/report-to-feishu',
      payload,
      sessionSnapshot,
      keepProcessing: true
    });
    if (!result?.ok || result.gatewayMode !== 'agent_internal') return null;
    await applyPatch({
      lastReportFingerprint: decision.fingerprint,
      reportDispatchCount: Number(state.upload.reportDispatchCount || 0) + 1,
      lastReportTrigger: trigger
    });

    return {
      payload: toAgentInternalPayload(payload),
      audit: {
        payloadHash: result.payloadHash,
        sessionId: result.sessionId || state.session.id,
        auditRecordPath: result.auditRecordPath
      }
    };
  }

  async function prepareAutomaticReportUpdate(options = {}) {
    return prepareReportUpdate({
      ...options,
      trigger: options.trigger || 'meaningful_self_evidence'
    });
  }

  async function prepareAgentInternalPayload(options = {}) {
    const state = window.MentalSessionRuntime?.getState?.();
    const sessionKey = getSessionFinalizeKey(state);
    if (sessionKey && agentFinalizationSessionIds.has(sessionKey)) return null;

    const result = await prepareReportUpdate({
      ...options,
      trigger: options.trigger || 'session_end'
    });
    if (result && sessionKey && (options.trigger || 'session_end') === 'session_end') {
      agentFinalizationSessionIds.add(sessionKey);
    }
    return result;
  }

  async function finalizeCurrentSession(options = {}) {
    const state = window.MentalSessionRuntime?.getState?.();
    if (!state || submitting || isStateFinalized(state)) return null;
    if (!state.session?.identity?.userId) return null;

    const gateway = await getGatewayStatus(options.statusUrl || '/api/workflow/status');
    if (!gateway.ok || !gateway.enabled) return null;

    markStateFinalized(state);
    try {
      const result = await submitSyntheticGatewayRecord({
        gatewayUrl: options.gatewayUrl || '/api/workflow/report-to-feishu',
        reportVersion: options.reportVersion || 'cn_non_diagnostic_v1'
      });
      if (!result) {
        clearFinalizationForState(state);
        return null;
      }
      return result;
    } catch (error) {
      clearFinalizationForState(state);
      throw error;
    }
  }

  async function shouldFinalizeFromUserTurn(text) {
    if (shouldFinalizeFromUserText(text)) {
      return true;
    }

    const state = window.MentalSessionRuntime?.getState?.();
    if (!state) return false;
    const policyService = await getConversationPolicyService();
    const policy = policyService.buildConversationPolicy(state);
    const normalized = normalizeText(text);
    if (!normalized) return false;

    const acknowledgement = /^(好|好的|好吧|行|可以|嗯|嗯嗯|知道了|明白了|就这样|先这样|到这里|没了|没有了|不用了|差不多了|那今天先这样)[。！!，,\s]*$/;
    return (
      ["sufficient", "ready_to_close"].includes(policy.completionStatus) &&
      ["summarize", "close", "respond"].includes(policy.responseMode) &&
      acknowledgement.test(normalized)
    );
  }

  async function maybeSubmitFromCurrentState(options = {}) {
    const state = window.MentalSessionRuntime?.getState();
    if (!state) return null;

    const safetySummary = state.safety.summary;
    const uploadStatus = state.upload.userVisibleStatus;
    const gateway = await getGatewayStatus(options.statusUrl || '/api/workflow/status');

    if (!state.session?.identity?.userId) return null;
    if (!gateway.ok || !gateway.enabled) return null;
    if (!['needs_follow_up', 'suggest_real_world_support'].includes(safetySummary) && state.safety.workflowLabel !== 'RX') {
      return null;
    }
    if (uploadStatus !== 'processing') return null;

    return submitSyntheticGatewayRecord({
      gatewayUrl: options.gatewayUrl || '/api/workflow/report-to-feishu'
    });
  }

  async function listAuditRecords(options = {}) {
    const service = await getWorkflowAuditService();
    return service.listSummaries(
      options.endpoint || '/api/workflow/audit-records',
      options.limit || 10
    );
  }

  window.MentalUploadRuntime = {
    markProcessing,
    markSubmittedPendingConfirmation,
    markFailed,
    reset,
    submitReportViaGateway,
    submitSyntheticGatewayRecord,
    prepareAutomaticReportUpdate,
    prepareAgentInternalPayload,
    finalizeCurrentSession,
    maybeSubmitFromCurrentState,
    listAuditRecords,
    getGatewayStatus,
    shouldFinalizeFromUserText,
    shouldFinalizeFromUserTurn,
    shouldFinalizeFromAgentText,
    clearFinalizationForState,
    isSubmitting: () => submitting,
    getLastGatewayResult: () => lastGatewayResult
  };
})();
