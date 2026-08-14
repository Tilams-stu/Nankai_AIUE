(function () {
  let modulesPromise = null;
  let sessionService = null;
  let snapshotService = null;
  let transcriptService = null;
  let dialogueStageService = null;
  let assessmentStateService = null;
  let safetyRuleService = null;
  let conversationPolicyService = null;
  let turnInterpretationService = null;
  let interactionStateService = null;
  let appStateTemplate = null;
  let state = null;
  let restoreMeta = { status: "fresh" };
  const SESSION_STORAGE_KEY = "mental_llm_session_snapshot_v2";

  const runtimeImport =
    typeof window !== "undefined" && typeof window.__mentalImport === "function"
      ? window.__mentalImport.bind(window)
      : (specifier) => Function('specifier', 'return import(specifier);')(specifier);

  function cloneAssessment(assessment) {
    return {
      ...assessment,
      fields: Object.fromEntries(
        Object.entries(assessment.fields).map(([key, value]) => [
          key,
          {
            ...value,
            evidence: value.evidence.map((item) => ({ ...item }))
          }
        ])
      )
    };
  }

  function cloneSession(session) {
    return {
      ...session,
      identity: {
        ...session.identity
      },
      dialogueStage: {
        ...session.dialogueStage,
        completedStages: [...session.dialogueStage.completedStages]
      },
      interaction: {
        ...session.interaction,
        boundaries: (session.interaction?.boundaries || []).map((boundary) => ({ ...boundary }))
      },
      assessment: cloneAssessment(session.assessment)
    };
  }

  function cloneSafety(safety) {
    const base = appStateTemplate?.safety || {};
    const workflowLabel = safety?.workflowLabel || base.workflowLabel || "R0";
    return {
      ...base,
      ...safety,
      safetyConfirmation:
        safety?.safetyConfirmation ||
        (workflowLabel !== "R0"
          ? "pending"
          : safety?.screeningStatus === "completed"
            ? "confirmed_safe"
            : "not_started"),
      peakWorkflowLabel: safety?.peakWorkflowLabel || workflowLabel,
      peakSummary: safety?.peakSummary || safety?.summary || base.peakSummary || "not_asked",
      evidence: (safety?.evidence || []).map((item) => ({ ...item })),
      triggeredRuleIds: [...(safety?.triggeredRuleIds || [])]
    };
  }

  function cloneUpload(upload) {
    return {
      ...upload
    };
  }

  function canUseSessionStorage() {
    try {
      return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
    } catch {
      return false;
    }
  }

  async function persistStateSnapshot(nextState) {
    if (!nextState || !snapshotService || !canUseSessionStorage()) return;
    try {
      const snapshot = snapshotService.exportSnapshot(nextState);
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(snapshot));
    } catch {}
  }

  function clearPersistedSnapshot() {
    if (!canUseSessionStorage()) return;
    try {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {}
  }

  async function commitState(nextState) {
    state = nextState;
    await persistStateSnapshot(state);
    return state;
  }

  function readPersistedSnapshot() {
    if (!canUseSessionStorage()) return null;
    try {
      const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  async function ensureModules() {
    if (!modulesPromise) {
      modulesPromise = Promise.all([
        runtimeImport("/runtime/app/appState.js"),
        runtimeImport("/runtime/services/sessionService.js"),
        runtimeImport("/runtime/services/sessionSnapshotService.js"),
        runtimeImport("/runtime/services/transcriptService.js"),
        runtimeImport("/runtime/services/dialogueStageService.js"),
        runtimeImport("/runtime/services/assessmentStateService.js"),
        runtimeImport("/runtime/services/safetyRuleService.js"),
        runtimeImport("/runtime/services/conversationPolicyService.js"),
        runtimeImport("/runtime/services/turnInterpretationService.js"),
        runtimeImport("/runtime/services/interactionStateService.js")
      ]).then(
        ([
          appStateModule,
          sessionServiceModule,
          snapshotServiceModule,
          transcriptServiceModule,
          dialogueStageServiceModule,
          assessmentStateServiceModule,
          safetyRuleServiceModule,
          conversationPolicyServiceModule,
          turnInterpretationServiceModule,
          interactionStateServiceModule
        ]) => {
          appStateTemplate = appStateModule.initialAppState;
          sessionService = sessionServiceModule.createSessionService();
          snapshotService = snapshotServiceModule.createSessionSnapshotService();
          transcriptService = transcriptServiceModule.createTranscriptService();
          dialogueStageService = dialogueStageServiceModule.createDialogueStageService();
          assessmentStateService = assessmentStateServiceModule.createAssessmentStateService();
          safetyRuleService = safetyRuleServiceModule.createSafetyRuleService();
          conversationPolicyService = conversationPolicyServiceModule.createConversationPolicyService();
          turnInterpretationService = turnInterpretationServiceModule.createTurnInterpretationService();
          interactionStateService = interactionStateServiceModule.createInteractionStateService();
          return {
            appStateTemplate,
            sessionService,
            snapshotService,
            transcriptService,
            dialogueStageService,
            assessmentStateService,
            safetyRuleService,
            conversationPolicyService,
            turnInterpretationService,
            interactionStateService
          };
        }
      );
    }
    return modulesPromise;
  }

  function buildFreshState(activeView) {
    const resolvedActiveView = activeView || appStateTemplate.activeView;
    return {
      ...appStateTemplate,
      activeView: resolvedActiveView,
      session: sessionService.create(resolvedActiveView),
      safety: cloneSafety(appStateTemplate.safety),
      transcript: transcriptService.create(),
      upload: cloneUpload(appStateTemplate.upload)
    };
  }

  function normalizeRestoredState(candidate) {
    if (!candidate?.session) return candidate;
    const normalizedCandidate = {
      ...candidate,
      safety: cloneSafety(candidate.safety || appStateTemplate.safety)
    };
    if (normalizedCandidate.session.interaction) return normalizedCandidate;
    return {
      ...normalizedCandidate,
      session: {
        ...normalizedCandidate.session,
        interaction: {
          ...appStateTemplate.session.interaction,
          boundaries: []
        }
      }
    };
  }

  function advanceStage(currentState, eventType, now) {
    const nextDialogueStage = dialogueStageService.advanceDialogueStage(currentState.session.dialogueStage, {
      type: eventType,
      consentStatus: currentState.session.consentStatus,
      assessmentState: currentState.session.assessment,
      interactionState: currentState.session.interaction,
      safetyState: currentState.safety,
      activeView: currentState.activeView,
      uploadStatus: currentState.upload.userVisibleStatus,
      transcriptEntries: currentState.transcript.entries,
      dialogueStageState: currentState.session.dialogueStage,
      now
    });

    return {
      ...currentState,
      session: sessionService.setDialogueStage(currentState.session, nextDialogueStage)
    };
  }

  async function ensureState(activeView) {
    await ensureModules();
    if (!state) {
      const fallback = buildFreshState(activeView);
      const persistedSnapshot = readPersistedSnapshot();
      const restored = persistedSnapshot ? snapshotService.parseSnapshot(persistedSnapshot, fallback) : null;
      if (restored) {
        state = normalizeRestoredState(restored);
        restoreMeta = { status: "restored" };
      } else {
        state = fallback;
        restoreMeta = persistedSnapshot ? { status: "failed" } : { status: "fresh" };
        if (persistedSnapshot) {
          clearPersistedSnapshot();
        }
        await persistStateSnapshot(state);
      }
    }
    return state;
  }

  async function init(options = {}) {
    state = null;
    restoreMeta = { status: "fresh" };
    return ensureState(options.activeView);
  }

  async function setActiveView(activeView) {
    const current = await ensureState(activeView);
    return commitState({
      ...current,
      activeView,
      session: sessionService.setActiveView(current.session, activeView)
    });
  }

  async function setIdentity(identity) {
    const current = await ensureState();
    return commitState({
      ...current,
      session: sessionService.setIdentity(current.session, identity)
    });
  }

  async function setConsentStatus(consentStatus) {
    const current = await ensureState();
    let nextState = {
      ...current,
      session: sessionService.setConsentStatus(current.session, consentStatus)
    };
    nextState = advanceStage(nextState, "consent_updated", new Date());
    return commitState(nextState);
  }

  async function updateSafety(patch) {
    const current = await ensureState();
    let nextState = {
      ...current,
      safety: {
        ...cloneSafety(current.safety),
        ...patch
      }
    };
    nextState = advanceStage(nextState, "user_turn_recorded", new Date());
    return commitState(nextState);
  }

  async function updateSafetyFromText(text, options = {}) {
    const current = await ensureState();
    const result = safetyRuleService.evaluateText(current.safety, text, {
      transcriptEntryId: options.transcriptEntryId,
      currentStage: current.session.dialogueStage.currentStage,
      now: options.now
    });
    const nextState = {
      ...current,
      safety: result.nextStatus
    };
    return commitState(advanceStage(nextState, "user_turn_recorded", options.now || new Date()));
  }

  async function updateUpload(patch) {
    const current = await ensureState();
    let nextState = {
      ...current,
      upload: {
        ...cloneUpload(current.upload),
        ...patch
      }
    };

    if (["pending_review", "uploaded"].includes(nextState.upload.reportStatus)) {
      nextState = advanceStage(nextState, "upload_submitted", new Date());
    }

    return commitState(nextState);
  }

  async function appendTranscriptEntry(entryInput) {
    const current = await ensureState();
    const result = transcriptService.append(current.transcript, entryInput);
    await commitState({
      ...current,
      transcript: result.state
    });
    return result.entry;
  }

  async function ingestUserTurn(entryInput) {
    const current = await ensureState();
    const now = new Date();
    const preparedSession =
      current.session.consentStatus === "unknown"
        ? sessionService.setConsentStatus(current.session, "accepted")
        : current.session;
    const transcriptResult = transcriptService.append(current.transcript, entryInput);
    const interpretation = turnInterpretationService.interpret(transcriptResult.entry.content);
    const safetyResult = interpretation.subject === "self"
      ? safetyRuleService.evaluateText(current.safety, transcriptResult.entry.content, {
          transcriptEntryId: transcriptResult.entry.id,
          currentStage: preparedSession.dialogueStage.currentStage,
          now
        })
      : { nextStatus: current.safety, changed: false };
    const nextAssessment = interpretation.shouldExtractAssessmentEvidence
      ? assessmentStateService.updateFromTurn(preparedSession.assessment, transcriptResult.entry.content, {
          channel: transcriptResult.entry.channel,
          currentStage: preparedSession.dialogueStage.currentStage,
          transcriptEntryId: transcriptResult.entry.id,
          safetyStatus: safetyResult.nextStatus,
          safetyChanged: safetyResult.changed,
          now
        })
      : preparedSession.assessment;
    const assessmentChanged = nextAssessment !== preparedSession.assessment;

    const nextInteraction = interactionStateService.applyTurn(
      preparedSession.interaction,
      interpretation,
      safetyResult.nextStatus,
      now
    );
    let nextSession = sessionService.setInteraction(
      sessionService.setAssessment(preparedSession, nextAssessment),
      nextInteraction
    );
    let nextState = {
      ...current,
      transcript: transcriptResult.state,
      safety: safetyResult.nextStatus,
      session: nextSession
    };
    nextState = advanceStage(nextState, "user_turn_recorded", now);
    await commitState(nextState);
    return {
      entry: transcriptResult.entry,
      appState: state,
      interpretation,
      reportTrigger:
        safetyResult.changed && interpretation.subject === "self"
          ? "safety_change"
          : assessmentChanged
            ? "meaningful_self_evidence"
            : undefined
    };
  }

  async function recordAgentTurn(entryInput) {
    const current = await ensureState();
    const now = new Date();
    const result = transcriptService.append(current.transcript, entryInput);
    let nextState = {
      ...current,
      transcript: result.state
    };
    nextState = advanceStage(nextState, "agent_turn_recorded", now);
    await commitState(nextState);
    return {
      entry: result.entry,
      appState: state
    };
  }

  async function markReportGenerated(reportVersion) {
    const current = await ensureState();
    let nextState = {
      ...current,
      upload: {
        ...cloneUpload(current.upload),
        reportVersion: reportVersion || current.upload.reportVersion
      }
    };
    nextState = advanceStage(nextState, "report_generated", new Date());
    return commitState(nextState);
  }

  async function markAssessmentFieldAsked(fieldKey, options = {}) {
    const current = await ensureState();
    const askedTurn =
      typeof options.askedTurn === "number" ? options.askedTurn : current.session.dialogueStage.currentTurn;
    const nextAssessment = assessmentStateService.markFieldAsked(
      current.session.assessment,
      fieldKey,
      askedTurn,
      options.now || new Date()
    );
    const nextState = {
      ...current,
      session: sessionService.setAssessment(current.session, nextAssessment),
      safety:
        fieldKey === "risk_disclosure" && current.safety.screeningStatus === "not_started"
          ? {
              ...cloneSafety(current.safety),
              screeningStatus: "prompted",
              lastUpdatedAtIso: (options.now || new Date()).toISOString()
            }
          : current.safety
    };
    return commitState(nextState);
  }

  async function recordScaleResult(resultText) {
    const current = await ensureState();
    const now = new Date();
    const summary = String(resultText || '').trim();
    if (!summary) return current;

    const nextAssessment = assessmentStateService.updateAssessmentField(
      current.session.assessment,
      'scale_result',
      summary,
      {
        excerpt: summary.slice(0, 120),
        collectedAtIso: now.toISOString(),
        confidence: 1,
        sourceType: 'scale_result'
      },
      'collected'
    );
    return commitState({
      ...current,
      session: sessionService.setAssessment(current.session, nextAssessment)
    });
  }

  async function updateTranscriptEntry(entryId, patch) {
    const current = await ensureState();
    const result = transcriptService.update(current.transcript, entryId, patch);
    await commitState({
      ...current,
      transcript: result.state
    });
    return result.entry;
  }

  async function listTranscriptEntries(options) {
    const current = await ensureState();
    return transcriptService.list(current.transcript, options);
  }

  async function syncLegacyConfig(cfg) {
    const current = await ensureState();
    if (cfg) {
      cfg.USER = current.session.identity.userId;
      cfg.NAME = current.session.identity.userName || "Student";
    }
    return current;
  }

  async function setUserControl(userControl) {
    const current = await ensureState();
    return commitState({
      ...current,
      session: sessionService.setUserControl(current.session, userControl)
    });
  }

  async function reset(activeView) {
    await ensureModules();
    restoreMeta = { status: "fresh" };
    clearPersistedSnapshot();
    return commitState(buildFreshState(activeView));
  }

  async function exportSnapshot() {
    const current = await ensureState();
    return snapshotService.exportSnapshot(current);
  }

  async function restoreSnapshot(snapshot) {
    await ensureModules();
    const restored = snapshotService.parseSnapshot(snapshot, buildFreshState(appStateTemplate.activeView));
    if (!restored) return null;
    restoreMeta = { status: "restored" };
    return commitState(restored);
  }

  function getState() {
    return state;
  }

  function getRestoreMeta() {
    return { ...restoreMeta };
  }

  window.MentalSessionRuntime = {
    init,
    reset,
    setActiveView,
    setIdentity,
    setConsentStatus,
    updateSafety,
    updateSafetyFromText,
    updateUpload,
    appendTranscriptEntry,
    ingestUserTurn,
    recordAgentTurn,
    markAssessmentFieldAsked,
    recordScaleResult,
    markReportGenerated,
    updateTranscriptEntry,
    listTranscriptEntries,
    setUserControl,
    syncLegacyConfig,
    exportSnapshot,
    restoreSnapshot,
    getState,
    getRestoreMeta
  };
})();
