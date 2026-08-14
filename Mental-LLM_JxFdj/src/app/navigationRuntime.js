(function () {
  const viewTitles = {
    chat: '聊天',
    gad7: '焦虑检测',
    profile: '状态',
    meditation: '放松'
  };
  let suppressNextMenuToggle = false;

  function switchView(options) {
    const { name, button, views, navs } = options;
    const targetView = views && views[name];
    if (!targetView) return false;

    Object.values(views).forEach((view) => {
      if (view) view.classList.remove('active');
    });

    navs.forEach((nav) => nav.classList.remove('active'));

    targetView.classList.add('active');
    if (button) button.classList.add('active');
    return true;
  }

  function toggleDarkMode(options = {}) {
    const body = options.body || document.body;
    body.classList.toggle('dark-mode');
    const isDark = body.classList.contains('dark-mode');

    const pcButton = document.getElementById(options.pcButtonId || 'pcModeBtn');
    if (pcButton) {
      pcButton.innerHTML = isDark
        ? '<i class="fa-solid fa-sun"></i>'
        : '<i class="fa-solid fa-moon"></i>';
      pcButton.title = isDark ? '日间模式' : '夜间模式';
    }

    document.querySelectorAll(options.menuItemSelector || '.float-item').forEach((item) => {
      if (item.innerText.includes('夜间模式') || item.innerText.includes('日间模式')) {
        item.innerHTML = isDark
          ? '<i class="fa-solid fa-sun"></i> 日间模式'
          : '<i class="fa-solid fa-moon"></i> 夜间模式';
      }
    });

    return isDark;
  }

  function toggleFloatMenu(menuId = 'floatMenu') {
    if (suppressNextMenuToggle) {
      suppressNextMenuToggle = false;
      return false;
    }
    const menu = document.getElementById(menuId);
    if (!menu) return false;
    menu.classList.toggle('active');
    return menu.classList.contains('active');
  }

  function closeFloatMenu(menuId = 'floatMenu') {
    const menu = document.getElementById(menuId);
    if (!menu) return false;
    menu.classList.remove('active');
    return true;
  }

  function findNavigationButton(viewName, navs) {
    const expectedTitle = viewTitles[viewName];
    if (!expectedTitle) return null;
    let targetButton = null;
    navs.forEach((button) => {
      if (button.title === expectedTitle) targetButton = button;
    });
    return targetButton;
  }

  function handleMobileNav(options) {
    const { viewName, navs, onNavigate } = options;
    closeFloatMenu();
    const targetButton = findNavigationButton(viewName, navs);
    if (targetButton && onNavigate) {
      onNavigate(viewName, targetButton);
      return true;
    }
    return false;
  }

  function bindOutsideClose(options = {}) {
    const containerId = options.containerId || 'mobile-nav-container';
    const menuId = options.menuId || 'floatMenu';

    document.addEventListener('click', (event) => {
      const container = document.getElementById(containerId);
      const menu = document.getElementById(menuId);
      if (!container || !menu) return;
      if (!container.contains(event.target) && menu.classList.contains('active')) {
        menu.classList.remove('active');
      }
    });
  }

  function bindFloatingBallDrag(options = {}) {
    const ball = options.ball;
    const container = options.container;
    const radius = options.radius || 25;
    const moveThreshold = options.moveThreshold || 5;
    if (!ball || !container) return false;

    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let hasMoved = false;

    ball.addEventListener('touchstart', (event) => {
      isDragging = true;
      hasMoved = false;
      startX = event.touches[0].clientX;
      startY = event.touches[0].clientY;
    });

    ball.addEventListener('touchmove', (event) => {
      if (!isDragging) return;
      event.preventDefault();

      const currentX = event.touches[0].clientX;
      const currentY = event.touches[0].clientY;
      const diffX = currentX - startX;
      const diffY = currentY - startY;

      if (Math.abs(diffX) > moveThreshold || Math.abs(diffY) > moveThreshold) {
        hasMoved = true;
      }

      const newRight = window.innerWidth - currentX - radius;
      const newBottom = window.innerHeight - currentY - radius;
      container.style.right = `${newRight}px`;
      container.style.bottom = `${newBottom}px`;
    });

    ball.addEventListener('touchend', () => {
      isDragging = false;
      suppressNextMenuToggle = hasMoved;
      hasMoved = false;
    });

    return true;
  }

  window.MentalNavigationRuntime = {
    switchView,
    toggleDarkMode,
    toggleFloatMenu,
    closeFloatMenu,
    handleMobileNav,
    bindOutsideClose,
    bindFloatingBallDrag
  };
})();
