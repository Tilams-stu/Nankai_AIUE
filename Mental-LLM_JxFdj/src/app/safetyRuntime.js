(function () {
  async function updateFromText(text) {
    const value = typeof text === 'string' ? text : '';
    if (!value.trim()) return null;
    const state = await window.MentalSessionRuntime?.updateSafetyFromText(value);
    return syncAfterUserTurn(state);
  }

  async function syncAfterUserTurn(stateOverride = null) {
    const state = stateOverride || window.MentalSessionRuntime?.getState();
    if (!state) return null;

    // Report delivery is coordinated by chatRuntime so the payload is passed to
    // the Agent internally with the same turn. The browser never forwards it to
    // the workflow as an independent student-side action.
    await window.MentalStatusNoticeRuntime?.renderCurrentState();
    return state;
  }

  window.MentalSafetyRuntime = {
    updateFromText,
    syncAfterUserTurn
  };
})();
