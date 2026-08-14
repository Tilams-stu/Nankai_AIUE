(function () {
  function updatePauseButtons(buttons, paused) {
    buttons.filter(Boolean).forEach((button) => {
      button.innerHTML = paused
        ? '<i class="fa-solid fa-play"></i>'
        : '<i class="fa-solid fa-pause"></i>';
      button.title = paused ? '继续会话' : '暂停会话';
    });
  }

  function setPausedState(options = {}) {
    const paused = options.paused === true;
    const inputs = (options.inputs || []).filter(Boolean);
    const micButtons = (options.micButtons || []).filter(Boolean);
    const sendButtons = (options.sendButtons || []).filter(Boolean);
    const statusElements = (options.statusElements || []).filter(Boolean);

    inputs.forEach((input) => {
      input.disabled = paused;
      if (paused) {
        input.placeholder = options.pausedPlaceholder || '当前已暂停';
      } else if (input.id === 'gadUserInput') {
        input.placeholder = options.gadPlaceholder || '请回复助手的提问...';
      } else {
        input.placeholder = options.chatPlaceholder || '写下你的想法...';
      }
    });

    micButtons.forEach((button) => {
      button.disabled = paused;
      button.classList.toggle('is-disabled', paused);
    });

    sendButtons.forEach((button) => {
      button.disabled = paused;
      button.classList.toggle('is-disabled', paused);
    });

    if (paused) {
      statusElements.forEach((element) => {
        element.style.display = 'none';
      });
    }

    updatePauseButtons(options.pauseButtons || [], paused);
    return paused;
  }

  function resetConversationUi(options = {}) {
    if (options.chatBox) {
      options.chatBox.innerHTML = `<div class="msg-item agent"><div class="bubble">${options.chatGreetingHtml || ''}</div></div>`;
    }

    if (options.gadChatBox) {
      options.gadChatBox.innerHTML = '';
    }

    (options.inputs || []).filter(Boolean).forEach((input) => {
      input.value = '';
      input.style.height = options.emptyHeight || '44px';
      if (input.id === 'gadUserInput') {
        input.placeholder = options.gadPlaceholder || '请回复助手的提问...';
      } else {
        input.placeholder = options.chatPlaceholder || '写下你的想法...';
      }
      input.disabled = false;
    });

    (options.micButtons || []).filter(Boolean).forEach((button) => {
      button.disabled = false;
      button.classList.remove('is-disabled');
      button.classList.remove('listening');
    });

    (options.sendButtons || []).filter(Boolean).forEach((button) => {
      button.disabled = false;
      button.classList.remove('is-disabled');
    });

    (options.statusElements || []).filter(Boolean).forEach((element) => {
      element.style.display = 'none';
    });

    (options.supportElements || []).filter(Boolean).forEach((element) => {
      element.innerText = '';
      element.style.display = 'none';
    });

    updatePauseButtons(options.pauseButtons || [], false);
    return true;
  }

  window.MentalSessionControlRuntime = {
    setPausedState,
    resetConversationUi
  };
})();
