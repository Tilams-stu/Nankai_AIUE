(function () {
  let radarChart = null;

  function getChartConstructor() {
    return window.Chart;
  }

  function setFallbackVisible(canvas, visible) {
    const fallback = canvas?.parentElement?.querySelector('#profileChartFallback');
    if (fallback) fallback.hidden = !visible;
  }

  function buildRadarConfig() {
    return {
      type: 'radar',
      data: {
        labels: ['情绪', '压力', '睡眠', '人际', '学业', '运动'],
        datasets: [{
          label: '当前状态',
          data: [85, 40, 60, 75, 50, 65],
          backgroundColor: 'rgba(78, 205, 196, 0.3)',
          borderColor: '#4ECDC4',
          pointBackgroundColor: '#fff',
          pointBorderColor: '#4ECDC4'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { r: { ticks: { display: false, max: 100 }, suggestedMin: 0, suggestedMax: 100 } }
      }
    };
  }

  function init(options = {}) {
    if (radarChart) return true;

    const ChartConstructor = getChartConstructor();
    const radarCanvas = document.getElementById(options.radarId || 'radarChart');

    if (!radarCanvas) return false;
    if (!ChartConstructor) {
      setFallbackVisible(radarCanvas, true);
      return false;
    }

    setFallbackVisible(radarCanvas, false);
    radarChart = new ChartConstructor(radarCanvas, buildRadarConfig());
    return true;
  }

  function destroy() {
    if (radarChart) radarChart.destroy();
    radarChart = null;
  }

  function refresh(options = {}) {
    const hadChart = Boolean(radarChart);
    if (!hadChart && !options.force) return false;
    destroy();
    return init(options);
  }

  function hasChart() {
    return Boolean(radarChart);
  }

  window.MentalProfileChartRuntime = {
    init,
    destroy,
    refresh,
    hasChart
  };
})();
