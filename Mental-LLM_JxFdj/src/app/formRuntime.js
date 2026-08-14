(function () {
  function handleEnterSubmit(event, submit) {
    if (!event || event.key !== 'Enter' || event.shiftKey) return false;
    event.preventDefault();
    if (typeof submit === 'function') submit();
    return true;
  }

  function resizeTextarea(textarea, emptyHeight = '44px') {
    if (!textarea) return false;
    textarea.style.height = 'auto';
    textarea.style.height = textarea.value === '' ? emptyHeight : `${textarea.scrollHeight}px`;
    return true;
  }

  function bindAutoResize(textarea, options = {}) {
    if (!textarea) return false;
    const emptyHeight = options.emptyHeight || '44px';
    textarea.addEventListener('input', () => {
      resizeTextarea(textarea, emptyHeight);
    });
    return true;
  }

  function openSettings(options = {}) {
    const modal = options.modal;
    if (!modal) return false;

    modal.style.display = 'flex';

    const apiKeyInput = document.getElementById(options.apiKeyInputId || 'apiKey');
    const botIdInput = document.getElementById(options.botIdInputId || 'botId');
    const gadApiKeyInput = document.getElementById(options.gadApiKeyInputId || 'gadApiKey');
    const gadBotIdInput = document.getElementById(options.gadBotIdInputId || 'gadBotId');

    if (apiKeyInput) apiKeyInput.value = '';
    if (botIdInput) botIdInput.value = options.botIdValue || '';
    if (gadApiKeyInput) gadApiKeyInput.value = options.gadApiKeyValue || '补充测评与主对话共用同一智能体，无需单独配置';
    if (gadBotIdInput) gadBotIdInput.value = options.gadBotIdValue || options.botIdValue || '';
    return true;
  }

  function saveSettings(options = {}) {
    const modal = options.modal;
    const config = options.config;
    if (!modal || !config) return false;

    const botIdInput = document.getElementById(options.botIdInputId || 'botId');
    const gadBotIdInput = document.getElementById(options.gadBotIdInputId || 'gadBotId');
    const botId = botIdInput ? botIdInput.value : '';
    const gadBotId = gadBotIdInput ? gadBotIdInput.value : '';

    if (botId) {
      localStorage.setItem('school_bot_v2', botId);
      config.BOT = botId;
      localStorage.setItem('school_gad_bot', botId);
      config.GAD_BOT = botId;
    }

    if (gadBotId) {
      localStorage.setItem('school_gad_bot', gadBotId);
      config.GAD_BOT = gadBotId;
    }

    modal.style.display = 'none';
    return true;
  }

  function bindModalBackdropClose(modal) {
    if (!modal) return false;
    modal.addEventListener('click', (event) => {
      if (event.target === modal) modal.style.display = 'none';
    });
    return true;
  }

  window.MentalFormRuntime = {
    handleEnterSubmit,
    resizeTextarea,
    bindAutoResize,
    openSettings,
    saveSettings,
    bindModalBackdropClose
  };
})();
