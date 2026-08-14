(function () {
  function scrollToBottom(container) {
    if (!container) return false;
    container.scrollTop = container.scrollHeight;
    return true;
  }

  function appendMessage(options = {}) {
    const container = options.container;
    const role = options.role;
    const html = options.html || '';
    if (!container || !role) return null;

    const wrapper = document.createElement('div');
    wrapper.className = `msg-item ${role}`;
    wrapper.innerHTML = `<div class="bubble">${html}</div>`;
    container.appendChild(wrapper);
    scrollToBottom(container);
    return wrapper.querySelector('.bubble');
  }

  function updateBubbleHtml(options = {}) {
    const bubble = options.bubble;
    if (!bubble) return false;
    bubble.innerHTML = options.html || '';
    scrollToBottom(options.container);
    return true;
  }

  window.MentalMessageRuntime = {
    appendMessage,
    updateBubbleHtml,
    scrollToBottom
  };
})();
