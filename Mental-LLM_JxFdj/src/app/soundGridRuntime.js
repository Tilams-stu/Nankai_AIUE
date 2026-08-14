(function () {
  const sounds = [
    { id: 'rain', name: '窗外雨声', icon: 'fa-cloud-showers-heavy', desc: '专注 / 助眠', audio: '/audio/rain.mp3' },
    { id: 'forest', name: '森林鸟鸣', icon: 'fa-tree', desc: '放松 / 晨间', audio: '/audio/forest.wav' },
    { id: 'bonfire', name: '篝火声', icon: 'fa-fire', desc: '温暖 / 放松', audio: '/audio/bonfire.mp3' },
    { id: 'wind', name: '自然风声', icon: 'fa-wind', desc: '自然 / 宁静', audio: '/audio/wind.mp3' },
    { id: 'night', name: '夏夜虫鸣', icon: 'fa-moon', desc: '夜间 / 放松', audio: '/audio/night.mp3' }
  ];
  let activeAudioId = null;

  function setStatus(card, text) {
    const status = card?.querySelector('.sound-status');
    if (status) status.textContent = text;
  }

  function setUnavailable(id) {
    const audio = document.getElementById(`audio-${id}`);
    const card = document.getElementById(`card-${id}`);
    if (activeAudioId === id) activeAudioId = null;
    if (audio) audio.pause();
    if (card) {
      card.classList.remove('active');
      card.classList.add('is-unavailable');
      setStatus(card, '音频资源不可用');
    }
  }

  function pauseOtherAudios(exceptId) {
    sounds.forEach((sound) => {
      if (sound.id === exceptId) return;
      const audio = document.getElementById(`audio-${sound.id}`);
      const card = document.getElementById(`card-${sound.id}`);
      if (audio && !audio.paused) audio.pause();
      if (card && !card.classList.contains('is-unavailable')) {
        card.classList.remove('active');
        setStatus(card, '已暂停');
      }
    });
  }

  function init(options = {}) {
    const grid = document.getElementById(options.gridId || 'soundGrid');
    if (!grid) return false;
    activeAudioId = null;
    grid.innerHTML = '';

    sounds.forEach((sound) => {
      const card = document.createElement('div');
      card.className = 'sound-card';
      card.id = `card-${sound.id}`;
      card.onclick = (event) => {
        if (event.target.tagName === 'INPUT') return;
        toggleAudio(sound.id);
      };

      card.innerHTML = `
        <div class="sound-icon-wrapper"><i class="fa-solid ${sound.icon}"></i></div>
        <div class="sound-info"><h4>${sound.name}</h4><span>${sound.desc}</span></div>
        <p class="sound-status" aria-live="polite">点击播放</p>
        <div class="sound-volume">
          <input type="range" class="volume-slider" min="0" max="100" value="50" aria-label="${sound.name} 音量">
        </div>
        <audio id="audio-${sound.id}" src="${sound.audio}" loop preload="metadata"></audio>
      `;
      const volumeInput = card.querySelector('.volume-slider');
      volumeInput.addEventListener('input', (event) => adjustVolume(sound.id, event.target.value));
      const audio = card.querySelector('audio');
      audio.volume = 0.5;
      audio.addEventListener('error', () => setUnavailable(sound.id));
      grid.appendChild(card);
    });
    return true;
  }

  function toggleAudio(id) {
    const audio = document.getElementById(`audio-${id}`);
    const card = document.getElementById(`card-${id}`);
    if (!audio || !card || card.classList.contains('is-unavailable')) return false;

    if (activeAudioId === id && !audio.paused) {
      audio.pause();
      activeAudioId = null;
      card.classList.remove('active');
      setStatus(card, '已暂停');
      return true;
    }

    pauseOtherAudios(id);
    activeAudioId = id;
    audio.play()
      .then(() => {
        if (activeAudioId !== id) {
          audio.pause();
          return;
        }
        card.classList.add('active');
        setStatus(card, '正在播放（单独播放）');
      })
      .catch(() => setUnavailable(id));
    return true;
  }

  function adjustVolume(id, value) {
    const audio = document.getElementById(`audio-${id}`);
    if (audio) audio.volume = Number(value) / 100;
  }

  window.MentalSoundGrid = { init, toggleAudio, adjustVolume };
})();
