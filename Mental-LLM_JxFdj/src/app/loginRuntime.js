(function () {
  function clearLegacySensitiveStorage() {
    try {
      localStorage.removeItem('school_key_v2');
      localStorage.removeItem('school_gad_key');
      localStorage.removeItem('school_student_id');
      localStorage.removeItem('school_student_name');
    } catch {}
  }

  function openLoginModal(modal) {
    if (!modal) return false;
    modal.style.display = 'flex';
    return true;
  }

  function showLogin(options = {}) {
    clearLegacySensitiveStorage();
    const currentState = window.MentalSessionRuntime?.getState?.();
    const restoredName = currentState?.session?.identity?.userName;
    if (restoredName) {
      if (options.modal) options.modal.style.display = 'none';
      updateWelcomeText(restoredName, options.welcomeSelector || '.welcome-text h1');
      return false;
    }
    return openLoginModal(options.modal);
  }

  function updateWelcomeText(name, selector = '.welcome-text h1') {
    document.querySelectorAll(selector).forEach((title) => {
      if (title) title.innerText = `Hi, ${name}`;
    });
    return true;
  }

  async function saveLoginInfo(options = {}) {
    const modal = options.modal;
    const studentName = String(options.nameInput?.value || '').trim();
    const studentId = String(options.studentIdInput?.value || '').trim();
    const errorElement = options.errorElement;

    if (!studentName || !studentId) {
      if (errorElement) errorElement.textContent = '请填写姓名和学号后再开始。';
      return null;
    }

    if (errorElement) errorElement.textContent = '';
    const identity = {
      userId: studentId,
      userName: studentName,
      synthetic: false
    };
    const sessionState = await window.MentalSessionRuntime?.setIdentity(identity);
    await window.MentalSessionRuntime?.setConsentStatus('accepted');
    await window.MentalSessionRuntime?.setUserControl('continue');

    const effectiveUserId = sessionState?.session.identity.userId || identity.userId;
    const effectiveUserName = sessionState?.session.identity.userName || identity.userName;
    if (modal) modal.style.display = 'none';

    updateWelcomeText(effectiveUserName, options.welcomeSelector || '.welcome-text h1');
    await window.MentalStatusNoticeRuntime?.renderCurrentState();
    return { userId: effectiveUserId, userName: effectiveUserName };
  }

  window.MentalLoginRuntime = { showLogin, saveLoginInfo, updateWelcomeText };
})();
