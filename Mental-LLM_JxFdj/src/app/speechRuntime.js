(function () {
  let runtimeOptions = null;
  let recognition = null;
  let isListening = false;
  let supported = false;

  function getActiveView() {
    return runtimeOptions && typeof runtimeOptions.getActiveView === 'function'
      ? runtimeOptions.getActiveView()
      : 'chat';
  }

  function getTargetElements() {
    if (!runtimeOptions) return {};
    const activeView = getActiveView();
    const isGadView = activeView === 'gad7';

    return {
      input: isGadView ? runtimeOptions.gadInput : runtimeOptions.input,
      micButton: isGadView ? runtimeOptions.gadMicBtn : runtimeOptions.micBtn,
      micStatus: isGadView ? runtimeOptions.gadMicStatus : runtimeOptions.micStatus,
      idlePlaceholder: isGadView
        ? (runtimeOptions.gadPlaceholder || '请回复助手的提问...')
        : (runtimeOptions.chatPlaceholder || '写下你的想法...')
    };
  }

  function startListeningUI() {
    const { input, micButton, micStatus } = getTargetElements();
    isListening = true;
    if (micButton) micButton.classList.add('listening');
    if (micStatus) micStatus.style.display = 'block';
    if (input) input.placeholder = runtimeOptions.listeningPlaceholder || '请说话...';
    return true;
  }

  function stopListeningUI(placeholderOverride) {
    const { input, micButton, micStatus, idlePlaceholder } = getTargetElements();
    isListening = false;
    if (micButton) micButton.classList.remove('listening');
    if (micStatus) micStatus.style.display = 'none';
    if (input) input.placeholder = placeholderOverride || idlePlaceholder;
    return true;
  }

  function hideUnsupportedButtons() {
    if (!runtimeOptions) return;
    if (runtimeOptions.micBtn) runtimeOptions.micBtn.style.display = 'none';
    if (runtimeOptions.gadMicBtn) runtimeOptions.gadMicBtn.style.display = 'none';
  }

  function bindRecognitionHandlers() {
    recognition.onresult = (event) => {
      const { input } = getTargetElements();
      let transcript = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        transcript += event.results[index][0].transcript;
      }
      if (input) input.value = transcript;
    };

    recognition.onend = () => {
      stopListeningUI();
    };

    recognition.onerror = () => {
      stopListeningUI(runtimeOptions.errorPlaceholder || '识别出错');
    };
  }

  function init(options = {}) {
    runtimeOptions = options;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      supported = false;
      hideUnsupportedButtons();
      return false;
    }

    recognition = new SpeechRecognition();
    recognition.lang = options.lang || 'zh-CN';
    recognition.continuous = false;
    recognition.interimResults = true;
    supported = true;
    bindRecognitionHandlers();
    return true;
  }

  function toggleVoice() {
    if (!supported || !recognition) {
      alert((runtimeOptions && runtimeOptions.unsupportedAlert) || '当前浏览器不支持语音');
      return false;
    }

    if (isListening) {
      recognition.stop();
      return true;
    }

    recognition.start();
    startListeningUI();
    return true;
  }

  window.MentalSpeechRuntime = {
    init,
    toggleVoice,
    startListeningUI,
    stopListeningUI,
    isSupported: () => supported,
    isListening: () => isListening
  };
})();
