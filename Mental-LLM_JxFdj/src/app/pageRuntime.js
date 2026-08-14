(function () {
  const runtimeImport =
    typeof window !== "undefined" && typeof window.__mentalImport === "function"
      ? window.__mentalImport.bind(window)
      : (specifier) => Function('specifier', 'return import(specifier);')(specifier);

  const DEFAULT_LISTENING_PLACEHOLDER = "请说话...";
  const DEFAULT_ERROR_PLACEHOLDER = "识别出错";
  const DEFAULT_UNSUPPORTED_ALERT = "当前浏览器不支持语音输入";

  const CFG = {
    URL: "/api/chat",
    KEY: "",
    BOT: localStorage.getItem("school_bot_v2") || "d9fnh7d4shh9f0iucslg",
    GAD_KEY: "",
    GAD_BOT: localStorage.getItem("school_gad_bot") || localStorage.getItem("school_bot_v2") || "d9fnh7d4shh9f0iucslg",
    USER: `student_${Date.now()}`,
    NAME: "Student"
  };
  let pendingFinalizationAfterSafety = false;

  const UI = {
    views: {
      chat: document.getElementById("view-chat"),
      gad7: document.getElementById("view-gad7"),
      profile: document.getElementById("view-profile"),
      meditation: document.getElementById("view-meditation")
    },
    navs: document.querySelectorAll(".nav-btn"),
    chatBox: document.getElementById("chatBox"),
    gadChatBox: document.getElementById("gadChatBox"),
    input: document.getElementById("userInput"),
    gadInput: document.getElementById("gadUserInput"),
    micBtn: document.getElementById("micBtn"),
    micStatus: document.getElementById("micStatus"),
    gadMicBtn: document.getElementById("gadMicBtn"),
    gadMicStatus: document.getElementById("gadMicStatus"),
    chatSendBtn: document.getElementById("chatSendBtn"),
    gadSendBtn: document.getElementById("gadSendBtn"),
    modal: document.getElementById("settingsModal"),
    loginModal: document.getElementById("loginModal"),
    studentNameInput: document.getElementById("studentName"),
    studentIdInput: document.getElementById("studentId"),
    loginError: document.getElementById("loginError"),
    uploadDebugBtn: document.getElementById("uploadDebugBtn"),
    uploadDebugMeta: document.getElementById("uploadDebugMeta"),
    uploadDebugAuditList: document.getElementById("uploadDebugAuditList"),
    floatBall: document.querySelector(".float-ball"),
    floatContainer: document.getElementById("mobile-nav-container"),
    chatSupportNotice: document.getElementById("chatSupportNotice"),
    gadSupportNotice: document.getElementById("gadSupportNotice"),
    activeView: "chat"
  };

  const DEFAULTS = {
    chatPlaceholder: UI.input?.placeholder || "写下你的想法...",
    gadPlaceholder: UI.gadInput?.placeholder || "请回复助手的提问...",
    chatGreetingHtml:
      UI.chatBox?.querySelector(".bubble")?.innerHTML ||
      "你好呀！我是你的百变小狮子。<br>我会根据你的心情变换状态，也会认真听你说话。",
    welcomeName:
      document.querySelector(".welcome-text h1")?.textContent?.replace(/^Hi,\s*/, "").trim() || "同学"
  };

  function buildResetOptions() {
    return {
      chatBox: UI.chatBox,
      gadChatBox: UI.gadChatBox,
      chatGreetingHtml: DEFAULTS.chatGreetingHtml,
      inputs: [UI.input, UI.gadInput],
      micButtons: [UI.micBtn, UI.gadMicBtn],
      sendButtons: [UI.chatSendBtn, UI.gadSendBtn],
      statusElements: [UI.micStatus, UI.gadMicStatus],
      supportElements: [UI.chatSupportNotice, UI.gadSupportNotice],
      chatPlaceholder: DEFAULTS.chatPlaceholder,
      gadPlaceholder: DEFAULTS.gadPlaceholder,
      emptyHeight: "44px"
    };
  }

  function setIdentityConfig(identity) {
    if (!identity) return;
    CFG.USER = identity.userId;
    CFG.NAME = identity.userName;
    CFG.GAD_BOT = CFG.BOT;
  }

  async function initializeSessionState() {
    await window.MentalSessionRuntime?.init({ activeView: UI.activeView });
    const restoreMeta = window.MentalSessionRuntime?.getRestoreMeta?.();
    await window.MentalSessionRuntime?.syncLegacyConfig(CFG);
    if (restoreMeta?.status !== "restored") {
      await window.MentalUploadRuntime?.reset();
    }
    await window.MentalStatusNoticeRuntime?.renderCurrentState();
    return restoreMeta;
  }

  function initializeSpeechRuntime() {
    window.MentalSpeechRuntime?.init({
      input: UI.input,
      gadInput: UI.gadInput,
      micBtn: UI.micBtn,
      micStatus: UI.micStatus,
      gadMicBtn: UI.gadMicBtn,
      gadMicStatus: UI.gadMicStatus,
      getActiveView: () => UI.activeView,
      chatPlaceholder: DEFAULTS.chatPlaceholder,
      gadPlaceholder: DEFAULTS.gadPlaceholder,
      listeningPlaceholder: DEFAULT_LISTENING_PLACEHOLDER,
      errorPlaceholder: DEFAULT_ERROR_PLACEHOLDER,
      unsupportedAlert: DEFAULT_UNSUPPORTED_ALERT,
      lang: "zh-CN"
    });
  }

  function initializeFormRuntime() {
    window.MentalFormRuntime?.bindAutoResize(UI.input, { emptyHeight: "44px" });
    if (UI.gadInput) {
      window.MentalFormRuntime?.bindAutoResize(UI.gadInput, { emptyHeight: "44px" });
    }
    window.MentalFormRuntime?.bindModalBackdropClose(UI.modal);
  }

  function initializeNavigationRuntime() {
    window.MentalNavigationRuntime?.bindOutsideClose();
    window.MentalNavigationRuntime?.bindFloatingBallDrag({
      ball: UI.floatBall,
      container: UI.floatContainer,
      radius: 25,
      moveThreshold: 5
    });
  }

  function initializeUploadDebugRuntime() {
    window.MentalUploadDebugRuntime?.init({
      buttonElement: UI.uploadDebugBtn,
      metaElement: UI.uploadDebugMeta,
      auditListElement: UI.uploadDebugAuditList,
      gatewayUrl: "/api/workflow/report-to-feishu",
      statusUrl: "/api/workflow/status",
      submittingText: "Submitting...",
      defaultButtonText: "Submit Test Record"
    });
  }

  function initializeModelRuntime() {
    window.MentalModelRuntime?.bindViewerMaterialHandlers();
  }

  function initializeSoundGrid() {
    window.MentalSoundGrid?.init({ gridId: "soundGrid" });
  }

  function initializeSupplementalAssessment() {
    return window.MentalSupplementalAssessment?.init({
      root: document.getElementById("supplementalAssessmentRoot"),
      onComplete: async (result) => {
        await window.MentalSessionRuntime?.recordScaleResult?.(result.reportSummary);
        if (result.requiresSafetyFollowUp) {
          await window.MentalSessionRuntime?.updateSafety?.({ screeningStatus: "prompted" });
        }
        await dispatchAutomaticReportUpdate(
          result.requiresSafetyFollowUp ? "safety_change" : "supplemental_scale_result"
        );
        await window.MentalStatusNoticeRuntime?.renderCurrentState();
      }
    });
  }

  async function dispatchAutomaticReportUpdate(trigger) {
    return window.MentalChatRuntime?.sendConversation({
      arg: {
        text: "Use the supplied Agent-internal payload to update the background report.",
        hidden: true,
        silent: true
      },
      hidden: true,
      silent: true,
      automaticReportTrigger: trigger,
      requireAutomaticReportPayload: true,
      url: CFG.URL,
      botId: CFG.BOT,
      userId: CFG.USER,
      userName: CFG.NAME,
      logLabel: "Automatic report update"
    });
  }

  function appendMsg(role, html) {
    return window.MentalMessageRuntime?.appendMessage({
      container: UI.chatBox,
      role,
      html
    });
  }

  function appendGadMsg(role, html) {
    return window.MentalMessageRuntime?.appendMessage({
      container: UI.gadChatBox,
      role,
      html
    });
  }

  function clearMessageContainer(container) {
    if (!container) return;
    container.innerHTML = "";
  }

  async function hydrateTranscriptUi() {
    const currentState = window.MentalSessionRuntime?.getState?.();
    if (!currentState?.transcript?.entries?.length) {
      return;
    }

    const sanitizeModule = await runtimeImport("/runtime/utils/sanitizeText.js");
    const visibleEntries = currentState.transcript.entries.filter((entry) => entry.status === "final" && !entry.hidden);
    const chatEntries = visibleEntries.filter((entry) => entry.channel === "chat");
    const gadEntries = visibleEntries.filter((entry) => entry.channel === "gad7");

    if (chatEntries.length > 0) {
      clearMessageContainer(UI.chatBox);
      chatEntries.forEach((entry) => {
        const text =
          entry.role === "agent" && sanitizeModule.isReportLikeContent(entry.content)
            ? sanitizeModule.studentFacingReportPlaceholder(entry.content)
            : entry.content;
        appendMsg(entry.role, marked.parse(text));
      });
    }

    if (gadEntries.length > 0) {
      clearMessageContainer(UI.gadChatBox);
      gadEntries.forEach((entry) => {
        const text =
          entry.role === "agent" && sanitizeModule.isReportLikeContent(entry.content)
            ? sanitizeModule.studentFacingReportPlaceholder(entry.content)
            : entry.content;
        appendGadMsg(entry.role, marked.parse(text));
      });
    }
  }

  function renderRestoreNotice(restoreMeta) {
    if (restoreMeta?.status !== "failed") {
      return;
    }
    appendMsg("agent", "检测到上次会话恢复失败，当前已为你开始新的会话。");
  }

  function initChart() {
    return window.MentalProfileChartRuntime?.init({
      radarId: "radarChart"
    });
  }

  function startBreathLoop() {
    return window.MentalMeditationRuntime?.startBreathLoop({ textId: "breathText" });
  }

  function stopBreathLoop() {
    return window.MentalMeditationRuntime?.stopBreathLoop();
  }

  function changeModel(mood) {
    return window.MentalModelRuntime?.changeModel(mood);
  }

  function analyzeSentimentAndSwitch(text) {
    return window.MentalModelRuntime?.analyzeSentimentAndSwitch(text);
  }

  function toggleAudio(id) {
    return window.MentalSoundGrid?.toggleAudio(id);
  }

  function adjustVolume(id, value) {
    return window.MentalSoundGrid?.adjustVolume(id, value);
  }

  async function checkLogin() {
    return window.MentalLoginRuntime?.showLogin({
      modal: UI.loginModal
    });
  }

  function updateWelcomeMsg(name) {
    return window.MentalLoginRuntime?.updateWelcomeText(name, ".welcome-text h1");
  }

  async function saveLoginInfo() {
    const identity = await window.MentalLoginRuntime?.saveLoginInfo({
      modal: UI.loginModal,
      nameInput: UI.studentNameInput,
      studentIdInput: UI.studentIdInput,
      errorElement: UI.loginError,
      welcomeSelector: ".welcome-text h1"
    });
    setIdentityConfig(identity);
  }

  async function resetSessionUiAndState(exitMode) {
    pendingFinalizationAfterSafety = false;
    await window.MentalSessionRuntime?.reset("chat");
    if (exitMode) {
      await window.MentalSessionRuntime?.setUserControl(exitMode);
    }
    await window.MentalSessionRuntime?.syncLegacyConfig(CFG);
    window.MentalSessionControlRuntime?.resetConversationUi(buildResetOptions());
    updateWelcomeMsg(DEFAULTS.welcomeName);
    if (UI.navs[0]) {
      await switchView("chat", UI.navs[0]);
    }
    if (UI.loginModal) {
      UI.loginModal.style.display = "flex";
    }
    await window.MentalUploadRuntime?.reset();
    await window.MentalStatusNoticeRuntime?.renderCurrentState();
  }

  async function restartSession() {
    window.MentalUploadRuntime?.clearFinalizationForState?.(window.MentalSessionRuntime?.getState?.());
    await resetSessionUiAndState(null);
  }

  async function exitSession() {
    window.MentalUploadRuntime?.clearFinalizationForState?.(window.MentalSessionRuntime?.getState?.());
    await resetSessionUiAndState("exit");
  }

  async function legacyFinalizeSession() {
    const stateBeforeFinalize = window.MentalSessionRuntime?.getState?.();
    const safetyNotConfirmed =
      stateBeforeFinalize?.safety?.screeningStatus !== 'completed' ||
      stateBeforeFinalize?.session?.assessment?.fields?.risk_disclosure?.status === 'not_asked';
    const safetyPrompt =
      '在结束前，我只需要再确认一件事：最近有没有出现过不想活、想伤害自己，或想伤害他人的念头？你可以直接回一句“没有”，也可以说不方便回答。';
    const safetyPromptAlreadyShown = Boolean(
      stateBeforeFinalize?.transcript?.entries?.some(
        (entry) => entry.role === 'agent' && entry.content === safetyPrompt
      )
    );

    if (safetyNotConfirmed) {
      pendingFinalizationAfterSafety = true;
      if (safetyPromptAlreadyShown) {
        await window.MentalStatusNoticeRuntime?.renderCurrentState();
        return false;
      }

      const channel = UI.activeView === 'gad7' ? 'gad7' : 'chat';
      await window.MentalSessionRuntime?.updateSafety?.({
        screeningStatus: 'prompted'
      });
      await window.MentalSessionRuntime?.appendTranscriptEntry({
        channel,
        role: 'agent',
        content: safetyPrompt,
        hidden: true,
        source: 'system_note'
      });
      if (UI.activeView === 'gad7') {
        appendGadMsg('agent', safetyPrompt);
      } else {
        appendMsg('agent', safetyPrompt);
      }
      await window.MentalStatusNoticeRuntime?.renderCurrentState();
      return false;
    }

    pendingFinalizationAfterSafety = false;

    const gateway = await window.MentalUploadRuntime?.getGatewayStatus?.('/api/workflow/status');
    if (gateway?.mode === 'agent_internal') {
      const dispatch = UI.activeView === 'gad7' ? sendGadMessage : sendMessage;
      const dispatched = await dispatch({
        text: '本地会话已确认结束。请按本地结构化会话状态中的 Agent 内部工具 payload 完成本次记录提交。',
        hidden: true,
        silent: true,
        forceAgentInternalFinalization: true
      }, true);
      const message = dispatched
        ? '本次对话记录正在后台生成。'
        : '本次对话记录暂时未能提交，请稍后再试。';
      if (UI.activeView === 'gad7') {
        appendGadMsg('agent', message);
      } else {
        appendMsg('agent', message);
      }
      await window.MentalStatusNoticeRuntime?.renderCurrentState();
      return dispatched;
    }

    const result = await window.MentalUploadRuntime?.finalizeCurrentSession({
      gatewayUrl: '/api/workflow/report-to-feishu',
      statusUrl: '/api/workflow/status',
      reportVersion: 'cn_non_diagnostic_v1'
    });

    if (!result) {
      const unavailableMessage = !gateway?.enabled
        ? '当前记录通道尚未启用，请联系维护者检查后台工作流配置。'
        : '当前没有新的记录需要提交，或本次会话记录已生成。';
      if (UI.activeView === 'gad7') {
        appendGadMsg('agent', unavailableMessage);
      } else {
        appendMsg('agent', unavailableMessage);
      }
      await window.MentalStatusNoticeRuntime?.renderCurrentState();
      return false;
    }

    const message = result.ok
      ? '本次对话记录已在后台提交，你在学生端只会看到记录状态。'
      : `本次对话记录暂时未能提交：${result.message || '请稍后再试。'}`;

    if (UI.activeView === 'gad7') {
      appendGadMsg('agent', message);
    } else {
      appendMsg('agent', message);
    }

    await window.MentalStatusNoticeRuntime?.renderCurrentState();
    return result.ok;
  }

  async function finalizeSession() {
    pendingFinalizationAfterSafety = false;
    const state = window.MentalSessionRuntime?.getState?.();
    if (!state) return false;

    const gateway = await window.MentalUploadRuntime?.getGatewayStatus?.('/api/workflow/status');
    if (gateway?.mode === 'agent_internal') {
      const dispatch = UI.activeView === 'gad7' ? sendGadMessage : sendMessage;
      return Boolean(await dispatch({
        text: 'The local session has ended. Use the supplied Agent-internal payload only when present; otherwise provide no report text to the student.',
        hidden: true,
        silent: true,
        forceAgentInternalFinalization: true
      }, true));
    }

    const result = await window.MentalUploadRuntime?.finalizeCurrentSession({
      gatewayUrl: '/api/workflow/report-to-feishu',
      statusUrl: '/api/workflow/status',
      reportVersion: 'cn_non_diagnostic_v1'
    });
    return Boolean(result?.ok);
  }

  async function submitDebugRecord() {
    return window.MentalUploadDebugRuntime?.submitRecord({
      buttonElement: UI.uploadDebugBtn,
      metaElement: UI.uploadDebugMeta,
      auditListElement: UI.uploadDebugAuditList,
      gatewayUrl: "/api/workflow/report-to-feishu",
      submittingText: "Submitting...",
      defaultButtonText: "Submit Test Record"
    });
  }

  async function loadUploadDebugAuditList() {
    return window.MentalUploadDebugRuntime?.loadAuditList({
      auditListElement: UI.uploadDebugAuditList,
      limit: 5
    });
  }

  async function loadUploadDebugMeta() {
    return window.MentalUploadDebugRuntime?.loadMeta({
      metaElement: UI.uploadDebugMeta,
      statusUrl: "/api/workflow/status"
    });
  }

  function toggleVoice() {
    return window.MentalSpeechRuntime?.toggleVoice();
  }

  function startListeningUI() {
    return window.MentalSpeechRuntime?.startListeningUI();
  }

  function stopListeningUI() {
    return window.MentalSpeechRuntime?.stopListeningUI();
  }

  async function switchView(name, btn) {
    const changed = window.MentalNavigationRuntime?.switchView({
      name,
      button: btn,
      views: UI.views,
      navs: UI.navs
    });
    if (!changed) return false;

    UI.activeView = name;
    await window.MentalSessionRuntime?.setActiveView(name);
    await window.MentalStatusNoticeRuntime?.renderCurrentState();

    stopBreathLoop();
    if (name === "profile") initChart();
    if (name === "meditation") startBreathLoop();
    return true;
  }

  function toggleSound(element) {
    return window.MentalMeditationRuntime?.pulseElement(element);
  }

  function openSettings() {
    return window.MentalFormRuntime?.openSettings({
      modal: UI.modal,
      botIdValue: CFG.BOT,
      gadApiKeyValue: '补充测评与主对话共用同一智能体，无需单独配置',
      gadBotIdValue: CFG.GAD_BOT,
      apiKeyInputId: "apiKey",
      botIdInputId: "botId",
      gadApiKeyInputId: "gadApiKey",
      gadBotIdInputId: "gadBotId"
    });
  }

  function saveSettings() {
    const saved = window.MentalFormRuntime?.saveSettings({
      modal: UI.modal,
      config: CFG,
      botIdInputId: "botId",
      gadBotIdInputId: "gadBotId"
    });
    CFG.GAD_BOT = CFG.BOT;
    return saved;
  }

  function toggleDarkMode() {
    window.MentalNavigationRuntime?.toggleDarkMode();
    window.MentalProfileChartRuntime?.refresh({
      radarId: "radarChart"
    });
  }

  function toggleFloatMenu() {
    return window.MentalNavigationRuntime?.toggleFloatMenu();
  }

  function handleMobileNav(viewName) {
    return window.MentalNavigationRuntime?.handleMobileNav({
      viewName,
      navs: UI.navs,
      onNavigate: switchView
    });
  }

  function getMessageText(arg, inputElement) {
    if (typeof arg === "object" && arg !== null) return String(arg.text || "").trim();
    if (arg === null) return String(inputElement?.value || "").trim();
    return String(arg || "").trim();
  }

  function isDirectSafetyDenial(text) {
    const normalized = String(text || "").trim().replace(/[，。！!?、\s]/g, "");
    return /^(没有|没有这类想法|没有这种想法|暂时没有|目前没有|没有过|没想过|否)$/.test(normalized);
  }

  async function completePendingSafetyFinalization(text, options) {
    if (!pendingFinalizationAfterSafety || !isDirectSafetyDenial(text)) return false;

    const result = await window.MentalSessionRuntime?.ingestUserTurn({
      channel: options.channel,
      role: "user",
      content: text,
      hidden: false,
      source: "user_input"
    });
    options.appendMessage("user", text);
    if (options.inputElement) {
      options.inputElement.value = "";
      options.inputElement.style.height = "44px";
    }
    await window.MentalSafetyRuntime?.syncAfterUserTurn(result?.appState);

    const state = window.MentalSessionRuntime?.getState?.();
    if (state?.safety?.screeningStatus === "completed" && state.safety.workflowLabel === "R0") {
      await finalizeSession();
    }
    return true;
  }

  async function sendMessage(arg = null, hidden = false) {
    const text = getMessageText(arg, UI.input);
    if (!hidden && await completePendingSafetyFinalization(text, {
      channel: "chat",
      inputElement: UI.input,
      appendMessage: appendMsg
    })) return true;

    return window.MentalChatRuntime?.sendConversation({
      arg,
      hidden,
      inputElement: UI.input,
      emptyHeight: "44px",
      beforeSend: async (text) => {
        analyzeSentimentAndSwitch(text);
      },
      appendMessage: appendMsg,
      updateBubble: window.MentalMessageRuntime?.updateBubbleHtml,
      parseHtml: (raw) => marked.parse(raw),
      container: UI.chatBox,
      url: CFG.URL,
      botId: CFG.BOT,
      userId: CFG.USER,
      userName: CFG.NAME,
      forceAgentInternalFinalization: Boolean(arg?.forceAgentInternalFinalization),
      recordUserTranscript: async (text, meta) => {
        const result = await window.MentalSessionRuntime?.ingestUserTurn({
          channel: "chat",
          role: "user",
          content: text,
          hidden: Boolean(meta?.hidden),
          source: meta?.hidden ? "hidden_context" : "user_input"
        });
        await window.MentalSafetyRuntime?.syncAfterUserTurn(result?.appState);
        return result;
      },
      recordAgentTranscript: async (text) => {
        const result = await window.MentalSessionRuntime?.recordAgentTurn({
          channel: "chat",
          role: "agent",
          content: text,
          source: "agent_response"
        });
        await window.MentalStatusNoticeRuntime?.renderCurrentState();
        return result?.entry;
      },
      logLabel: "Chat"
    });
  }

  async function sendGadMessage(arg = null, hidden = false) {
    const text = getMessageText(arg, UI.gadInput);
    if (!hidden && await completePendingSafetyFinalization(text, {
      channel: "gad7",
      inputElement: UI.gadInput,
      appendMessage: appendGadMsg
    })) return true;

    return window.MentalChatRuntime?.sendConversation({
      arg,
      hidden,
      inputElement: UI.gadInput,
      emptyHeight: "44px",
      appendMessage: appendGadMsg,
      updateBubble: window.MentalMessageRuntime?.updateBubbleHtml,
      parseHtml: (raw) => marked.parse(raw),
      container: UI.gadChatBox,
      url: CFG.URL,
      botId: CFG.GAD_BOT,
      userId: CFG.USER,
      userName: CFG.NAME,
      forceAgentInternalFinalization: Boolean(arg?.forceAgentInternalFinalization),
      recordUserTranscript: async (text, meta) => {
        const result = await window.MentalSessionRuntime?.ingestUserTurn({
          channel: "gad7",
          role: "user",
          content: text,
          hidden: Boolean(meta?.hidden),
          source: meta?.hidden ? "hidden_context" : "user_input"
        });
        await window.MentalSafetyRuntime?.syncAfterUserTurn(result?.appState);
        return result;
      },
      recordAgentTranscript: async (text) => {
        const result = await window.MentalSessionRuntime?.recordAgentTurn({
          channel: "gad7",
          role: "agent",
          content: text,
          source: "agent_response"
        });
        await window.MentalStatusNoticeRuntime?.renderCurrentState();
        return result?.entry;
      },
      logLabel: "GAD Chat"
    });
  }

  function handleEnter(event) {
    return window.MentalFormRuntime?.handleEnterSubmit(event, sendMessage);
  }

  function handleGadEnter(event) {
    return window.MentalFormRuntime?.handleEnterSubmit(event, sendGadMessage);
  }

  async function initializePage() {
    const restoreMeta = await initializeSessionState();
    initializeSoundGrid();
    initializeSupplementalAssessment();
    initializeSpeechRuntime();
    initializeFormRuntime();
    initializeNavigationRuntime();
    initializeUploadDebugRuntime();
    initializeModelRuntime();
    await hydrateTranscriptUi();
    renderRestoreNotice(restoreMeta);
    await checkLogin();
  }

  window.checkLogin = checkLogin;
  window.initSoundGrid = initializeSoundGrid;
  window.toggleAudio = toggleAudio;
  window.adjustVolume = adjustVolume;
  window.saveLoginInfo = saveLoginInfo;
  window.updateWelcomeMsg = updateWelcomeMsg;
  window.restartSession = restartSession;
  window.exitSession = exitSession;
  window.submitDebugRecord = submitDebugRecord;
  window.loadUploadDebugAuditList = loadUploadDebugAuditList;
  window.loadUploadDebugMeta = loadUploadDebugMeta;
  window.finalizeSession = finalizeSession;
  window.changeModel = changeModel;
  window.analyzeSentimentAndSwitch = analyzeSentimentAndSwitch;
  window.toggleVoice = toggleVoice;
  window.startListeningUI = startListeningUI;
  window.stopListeningUI = stopListeningUI;
  window.switchView = switchView;
  window.initChart = initChart;
  window.sendMessage = sendMessage;
  window.sendGadMessage = sendGadMessage;
  window.appendMsg = appendMsg;
  window.appendGadMsg = appendGadMsg;
  window.handleEnter = handleEnter;
  window.handleGadEnter = handleGadEnter;
  window.startBreathLoop = startBreathLoop;
  window.stopBreathLoop = stopBreathLoop;
  window.toggleSound = toggleSound;
  window.openSettings = openSettings;
  window.saveSettings = saveSettings;
  window.toggleDarkMode = toggleDarkMode;
  window.toggleFloatMenu = toggleFloatMenu;
  window.handleMobileNav = handleMobileNav;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      initializePage();
    });
  } else {
    initializePage();
  }
})();
