(function () {
  let conversationPolicyServicePromise = null;

  const runtimeImport =
    typeof window !== 'undefined' && typeof window.__mentalImport === 'function'
      ? window.__mentalImport.bind(window)
      : (specifier) => Function('specifier', 'return import(specifier);')(specifier);

  async function getConversationPolicyService() {
    if (!conversationPolicyServicePromise) {
      conversationPolicyServicePromise = runtimeImport('/runtime/services/conversationPolicyService.js').then((module) =>
        module.createConversationPolicyService()
      );
    }
    return conversationPolicyServicePromise;
  }

  function renderAuditList(container, records) {
    if (!container) return false;
    if (!Array.isArray(records) || records.length === 0) {
      container.style.display = 'none';
      container.innerHTML = '';
      return true;
    }

    container.style.display = 'block';
    container.innerHTML = `<ul>${records
      .map((record) => {
        const severity = record.severity || 'unknown';
        const suffix = record.studentIdSuffix || '----';
        const snapshot = record.snapshotReceived ? 'snapshot:on' : 'snapshot:off';
        const path = record.auditRecordPath || 'n/a';
        const payloadHash = record.payloadHash ? ` | hash:${String(record.payloadHash).slice(0, 8)}` : '';
        const sessionId = record.sessionId ? `<br>session:${record.sessionId}` : '';
        return `<li><strong>${severity}</strong> | id:${suffix} | ${snapshot}${payloadHash}<br>${path}${sessionId}</li>`;
      })
      .join('')}</ul>`;
    return true;
  }

  async function loadAuditList(options = {}) {
    const auditList = options.auditListElement;
    if (!auditList) return null;
    try {
      const response = await window.MentalUploadRuntime?.listAuditRecords({
        limit: options.limit || 5
      });
      renderAuditList(auditList, response?.records || []);
      return response;
    } catch {
      auditList.style.display = 'block';
      auditList.innerHTML = '<ul><li>audit summary unavailable</li></ul>';
      return null;
    }
  }

  async function loadMeta(options = {}) {
    const meta = options.metaElement;
    if (!meta) return null;
    const status = await window.MentalUploadRuntime?.getGatewayStatus(options.statusUrl || '/api/workflow/status');
    if (!status || !status.ok) {
      meta.style.display = 'block';
      meta.innerText = '[dev] workflow: unavailable';
      return null;
    }
    const result = window.MentalUploadRuntime?.getLastGatewayResult();
    const suffix = result
      ? ` | last: ${result.ok ? 'submitted_pending_confirmation' : 'failed_needs_investigation'}${
          result.httpStatus ? `(${result.httpStatus})` : ''
        }`
      : '';
    const state = window.MentalSessionRuntime?.getState?.();
    const restoreMeta = window.MentalSessionRuntime?.getRestoreMeta?.();
    const policyService = state ? await getConversationPolicyService() : null;
    const policy = state && policyService ? policyService.buildConversationPolicy(state) : null;
    const stage = state?.session?.dialogueStage?.currentStage || 'unknown';
    const safety = state?.safety?.screeningStatus || 'unknown';
    const payloadHash = state?.upload?.lastPayloadHash ? ` | payload:${state.upload.lastPayloadHash.slice(0, 8)}` : '';
    const restore = restoreMeta?.status ? ` | restore:${restoreMeta.status}` : '';
    const policyText = policy
      ? ` | mode:${policy.responseMode} | complete:${policy.completionStatus} | min:${policy.minimumSufficientInfo} | low:${policy.lowInformationTurns} | asked:${policy.recentAskedTopics.join(',') || '-'}`
      : '';
    meta.style.display = 'block';
    meta.innerText = `[dev] workflow: ${status.mode}${suffix}${payloadHash} | stage:${stage} | safety:${safety}${restore}${policyText}`;
    return status;
  }

  async function submitRecord(options = {}) {
    const button = options.buttonElement;
    const meta = options.metaElement;
    if (button) {
      button.disabled = true;
      button.innerText = options.submittingText || 'Submitting...';
    }

    const result = await window.MentalUploadRuntime?.submitSyntheticGatewayRecord({
      gatewayUrl: options.gatewayUrl || '/api/workflow/report-to-feishu'
    });

    if (button) {
      button.disabled = false;
      button.innerText = options.defaultButtonText || 'Submit Test Record';
    }

    if (meta) {
      meta.style.display = 'block';
      if (!result) {
        meta.innerText = '[dev] workflow: submitting_or_unavailable';
      } else {
        const suffix = result.httpStatus ? ` | http=${result.httpStatus}` : '';
        const runId = result.workflowRunId ? ` | run=${result.workflowRunId}` : '';
        meta.innerText = result.ok
          ? `[dev] workflow result: submitted_pending_confirmation${suffix}${runId}`
          : `[dev] workflow result: failed_needs_investigation${suffix}`;
      }
    }

    await loadMeta(options);
    await loadAuditList(options);
    return result;
  }

  async function init(options = {}) {
    const button = options.buttonElement;
    const meta = options.metaElement;
    const isLocalhost = ['127.0.0.1', 'localhost'].includes(window.location.hostname);
    if (!button || !isLocalhost) return false;

    button.style.display = 'inline-flex';
    if (meta) meta.style.display = 'block';
    await loadMeta(options);
    await loadAuditList(options);
    return true;
  }

  window.MentalUploadDebugRuntime = {
    init,
    submitRecord,
    loadMeta,
    loadAuditList,
    renderAuditList
  };
})();
