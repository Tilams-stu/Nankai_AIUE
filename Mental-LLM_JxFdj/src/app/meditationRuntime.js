(function () {
  let breathTimers = [];

  function stopBreathLoop() {
    breathTimers.forEach((timerId) => clearTimeout(timerId));
    breathTimers = [];
  }

  function startBreathLoop(options = {}) {
    stopBreathLoop();

    const textElement = document.getElementById(options.textId || 'breathText');
    if (!textElement) return false;

    const inhaleText = options.inhaleText || '吸气';
    const holdText = options.holdText || '保持';
    const exhaleText = options.exhaleText || '呼气';

    const runCycle = () => {
      textElement.innerText = inhaleText;

      breathTimers.push(setTimeout(() => {
        textElement.innerText = holdText;
      }, 3500));

      breathTimers.push(setTimeout(() => {
        textElement.innerText = exhaleText;
      }, 4500));

      breathTimers.push(setTimeout(runCycle, 8000));
    };

    runCycle();
    return true;
  }

  function pulseElement(element) {
    if (!element) return false;
    element.style.transform = 'scale(0.98)';
    setTimeout(() => {
      element.style.transform = 'scale(1)';
    }, 100);
    return true;
  }

  window.MentalMeditationRuntime = {
    startBreathLoop,
    stopBreathLoop,
    pulseElement
  };
})();
