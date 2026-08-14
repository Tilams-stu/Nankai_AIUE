(function () {
  let servicePromise = null;
  let root = null;
  let onComplete = null;
  let activeAssessment = null;
  let answers = [];
  let eventsBound = false;

  const runtimeImport =
    typeof window !== 'undefined' && typeof window.__mentalImport === 'function'
      ? window.__mentalImport.bind(window)
      : (specifier) => Function('specifier', 'return import(specifier);')(specifier);

  function getService() {
    if (!servicePromise) {
      servicePromise = runtimeImport('/runtime/services/supplementalAssessmentService.js').then((module) =>
        module.createSupplementalAssessmentService()
      );
    }
    return servicePromise;
  }

  function renderShell(view) {
    view.innerHTML = `
      <section class="visual-side supplemental-visual" aria-label="补充测评说明">
        <div class="model-container">
          <model-viewer src="/models/original.glb" alt="心理伙伴" auto-rotate camera-controls autoplay shadow-intensity="1" exposure="1.0" style="width:100%;height:100%;background-color:transparent;--poster-color:transparent;"></model-viewer>
        </div>
        <div class="status-switcher" aria-label="伙伴状态">
          <button class="status-btn active" type="button" onclick="changeModel('happy')">陪伴</button>
          <button class="status-btn" type="button" onclick="changeModel('study')">专注</button>
          <button class="status-btn" type="button" onclick="changeModel('sleep')">休息</button>
        </div>
        <div class="welcome-text supplemental-welcome">
          <h1>补充测评</h1>
          <p>按自己的节奏完成一份量表即可。</p>
        </div>
      </section>
      <section class="panel-side supplemental-panel" aria-labelledby="supplementalAssessmentTitle">
        <header class="panel-header">
          <div class="panel-title"><i class="fa-solid fa-brain" style="color:var(--primary)"></i><span id="supplementalAssessmentTitle">补充测评</span></div>
        </header>
        <div class="chat-area assessment-workspace">
          <div class="assessment-boundary">量表结果仅供筛查和自我了解参考，不构成心理或医学诊断。</div>
          <div id="supplementalAssessmentRoot"></div>
        </div>
      </section>
    `;
    return view.querySelector('#supplementalAssessmentRoot');
  }

  function sourceMarkup(source) {
    return `<p class="assessment-source">量表来源：<a href="${source.officialUrl}" target="_blank" rel="noreferrer">${source.name} 官方资料</a></p>`;
  }

  async function renderCatalogue() {
    if (!root) return;
    const service = await getService();
    const definitions = service.list();
    activeAssessment = null;
    answers = [];
    root.innerHTML = `
      <div class="assessment-catalogue">
        <div class="assessment-catalogue__intro">
          <p>选择一份量表完成即可。作答过程不会发送给智能体，结果由本地按量表规则计算。</p>
        </div>
        <div class="assessment-catalogue__grid">
          ${definitions.map((definition) => `
            <article class="assessment-choice">
              <div class="assessment-choice__topline"><span>${definition.recallPeriod}</span><span>${definition.questions.length} 题</span></div>
              <h3>${definition.name}</h3>
              <p>${definition.description}</p>
              ${sourceMarkup(definition.source)}
              <button class="m-btn" type="button" data-assessment-id="${definition.id}">开始作答</button>
            </article>
          `).join('')}
        </div>
      </div>
    `;
  }

  function renderQuestion() {
    if (!root || !activeAssessment) return;
    const answeredCount = answers.filter((answer) => Number.isInteger(answer)).length;
    root.innerHTML = `
      <form class="assessment-form" novalidate>
        <div class="assessment-form__meta">
          <div><h3>${activeAssessment.name}</h3><p>请根据${activeAssessment.recallPeriod}的实际体验作答。</p></div>
          <span>${answeredCount}/${activeAssessment.questions.length} 已完成</span>
        </div>
        ${activeAssessment.questions.map((question, questionIndex) => `
          <fieldset class="assessment-question ${Number.isInteger(answers[questionIndex]) ? 'is-answered' : ''}">
            <legend><span>${questionIndex + 1}</span>${question}</legend>
            <div class="assessment-options">
              ${activeAssessment.options.map((option, optionIndex) => `
                <label class="assessment-option ${answers[questionIndex] === optionIndex ? 'is-selected' : ''}">
                  <input type="radio" name="question-${questionIndex}" value="${optionIndex}" data-question-index="${questionIndex}" ${answers[questionIndex] === optionIndex ? 'checked' : ''}>
                  <span>${option}</span>
                </label>
              `).join('')}
            </div>
          </fieldset>
        `).join('')}
        <p class="assessment-form__error" id="assessmentFormError" role="alert"></p>
        <button class="m-btn assessment-form__submit" type="submit">完成并查看结果</button>
      </form>
    `;
  }

  async function showResult(result) {
    if (!root) return;
    root.innerHTML = `
      <article class="assessment-result">
        <p class="assessment-result__eyebrow">已完成</p>
        <h3>${result.assessmentName}</h3>
        <div class="assessment-result__score"><strong>${result.total}</strong><span>/ ${result.maximum}</span></div>
        <p class="assessment-result__label">${result.interpretationLabel}</p>
        <p class="assessment-result__boundary">这份结果反映的是量表中的症状体验范围，只能作为筛查参考，不能单独用于诊断或判断风险。</p>
        ${result.requiresSafetyFollowUp ? '<p class="assessment-result__support">你在安全相关题目中报告了困扰。若此刻担心自己可能伤害自己，请优先联系身边可信赖的人、学校心理健康中心、医院或当地紧急服务；也可以回到聊天页说明你现在是否安全。</p>' : ''}
        ${sourceMarkup(result.source)}
        <div class="assessment-result__actions"><button class="m-btn" type="button" data-assessment-action="catalogue">选择另一份量表</button></div>
      </article>
    `;
  }

  async function selectAssessment(id) {
    const service = await getService();
    activeAssessment = service.get(id);
    if (!activeAssessment) return;
    answers = Array(activeAssessment.questions.length).fill(undefined);
    renderQuestion();
  }

  async function submit() {
    if (!activeAssessment) return;
    const service = await getService();
    const scored = service.score(activeAssessment.id, answers);
    const errorElement = root?.querySelector('#assessmentFormError');
    if (!scored.ok) {
      if (errorElement) errorElement.textContent = '请完成每一道题后再查看结果。';
      return;
    }
    await onComplete?.(scored.result);
    await showResult(scored.result);
  }

  function bindEvents(view) {
    if (eventsBound) return;
    eventsBound = true;
    view.addEventListener('click', async (event) => {
      const catalogueButton = event.target.closest('[data-assessment-action="catalogue"]');
      if (catalogueButton) {
        await renderCatalogue();
        return;
      }
      const assessmentButton = event.target.closest('[data-assessment-id]');
      if (assessmentButton) await selectAssessment(assessmentButton.dataset.assessmentId);
    });
    view.addEventListener('change', (event) => {
      const input = event.target.closest('[data-question-index]');
      if (!input || !activeAssessment) return;
      answers[Number(input.dataset.questionIndex)] = Number(input.value);
      renderQuestion();
    });
    view.addEventListener('submit', async (event) => {
      if (!event.target.closest('.assessment-form')) return;
      event.preventDefault();
      await submit();
    });
  }

  function init(options = {}) {
    const view = document.getElementById('view-gad7');
    if (!view) return false;
    root = options.root || renderShell(view);
    onComplete = options.onComplete || null;
    bindEvents(view);
    renderCatalogue();
    return true;
  }

  window.MentalSupplementalAssessment = { init, renderCatalogue };
})();
