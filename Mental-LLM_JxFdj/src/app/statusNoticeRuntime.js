(function () {
  let modulesPromise = null;

  const runtimeImport =
    typeof window !== 'undefined' && typeof window.__mentalImport === 'function'
      ? window.__mentalImport.bind(window)
      : (specifier) => Function('specifier', 'return import(specifier);')(specifier);

  async function ensureModules() {
    if (!modulesPromise) {
      modulesPromise = Promise.all([
        runtimeImport('/runtime/domain/safetyStatus.js')
      ]).then(([safetyModule]) => ({
        toSafetySupportMessage: safetyModule.toSafetySupportMessage
      }));
    }
    return modulesPromise;
  }

  function setText(element, value) {
    if (element) element.innerText = value;
  }

  function setVisibility(element, visible) {
    if (element) element.style.display = visible ? 'block' : 'none';
  }

  async function renderCurrentState(options = {}) {
    const state = window.MentalSessionRuntime?.getState();
    if (!state) return false;

    const { toSafetySupportMessage } = await ensureModules();
    const supportMessage = toSafetySupportMessage(state.safety.summary);
    const chatSupport = document.getElementById(options.chatSupportId || 'chatSupportNotice');
    const gadSupport = document.getElementById(options.gadSupportId || 'gadSupportNotice');

    setText(chatSupport, supportMessage);
    setText(gadSupport, supportMessage);
    setVisibility(chatSupport, supportMessage !== "");
    setVisibility(gadSupport, supportMessage !== "");
    return true;
  }

  window.MentalStatusNoticeRuntime = {
    renderCurrentState
  };
})();
