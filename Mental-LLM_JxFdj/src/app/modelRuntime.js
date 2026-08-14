(function () {
  const modelSources = {
    happy: '/models/original.glb',
    sleep: '/models/sleep.glb',
    study: '/models/bachelor.glb',
    sport: '/models/sport.glb',
    shy: '/models/shy.glb',
    no: '/models/no.glb',
    thumbsup: '/models/thumbsup.glb'
  };

  const moodLabels = {
    happy: '开心',
    thumbsup: '点赞',
    sport: '运动',
    study: '学习',
    sleep: '休息',
    shy: '害羞',
    no: '拒绝'
  };
  const colorBody = [0.98, 0.95, 0.9, 1.0];
  const colorMane = [1.0, 0.7, 0.4, 1.0];
  const colorNose = [0.3, 0.2, 0.15, 1.0];
  const colorEye = [0.2, 0.2, 0.2, 1.0];
  const colorPink = [1.0, 0.8, 0.85, 1.0];
  const colorSign = [0.8, 0.2, 0.2, 1.0];
  const colorStick = [0.6, 0.4, 0.2, 1.0];

  let currentMood = 'happy';

  function getViewerElements() {
    return [
      document.getElementById('lion-viewer'),
      document.getElementById('gad-lion-viewer')
    ].filter(Boolean);
  }

  function updateActiveButtons(mood) {
    const label = moodLabels[mood];
    document.querySelectorAll('.status-btn').forEach((button) => {
      if (label && button.innerText.includes(label)) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    });
  }

  function changeModel(mood) {
    const source = modelSources[mood];
    if (!source || currentMood === mood) return;

    getViewerElements().forEach((viewer) => {
      viewer.src = source;
    });

    currentMood = mood;
    updateActiveButtons(mood);
  }

  function analyzeMood(text) {
    if (!text) return null;
    if (text.match(/不|拒绝|讨厌|烦|no|不行|不要|停止|达咩/i)) return 'no';
    if (text.match(/赞|棒|厉害|加油|牛|好样|强|同意|支持|yes|good/i)) return 'thumbsup';
    if (text.match(/害羞|尴尬|社死|不好意思|脸红|丢人|哎呀/)) return 'shy';
    if (text.match(/累|困|睡|晚安|休息|疲惫/)) return 'sleep';
    if (text.match(/运动|跑|健身|球|减肥|锻炼/)) return 'sport';
    if (text.match(/学|考|作业|书|课|成绩|压力/)) return 'study';
    if (text.match(/开心|棒|好|笑|哈哈|谢谢|赞/)) return 'happy';
    return null;
  }

  function analyzeSentimentAndSwitch(text) {
    const mood = analyzeMood(text);
    if (mood) changeModel(mood);
    return mood;
  }

  function applyMaterialColors(targetViewer) {
    if (!targetViewer || !targetViewer.model || !targetViewer.model.materials) return false;

    try {
      console.group(`Model Material Debug Info (${targetViewer.id})`);
      targetViewer.model.materials.forEach((material, index) => {
        const name = material.name.toLowerCase();
        console.log(`Material [${index}]: "${name}"`, material);

        if (name.includes('volume') || name.includes('体积')) {
          if (name.includes('.1') || name.includes('_1')) {
            material.pbrMetallicRoughness.setBaseColorFactor(colorMane);
          } else {
            material.pbrMetallicRoughness.setBaseColorFactor(colorBody);
          }
        } else if (name.includes('tail') || name.includes('尾')) {
          material.pbrMetallicRoughness.setBaseColorFactor(colorMane);
        } else if (name.includes('mouth') || name.includes('嘴')) {
          material.pbrMetallicRoughness.setBaseColorFactor(colorNose);
        } else if (name.includes('disc') || name.includes('圆盘') || name.includes('eye')) {
          material.pbrMetallicRoughness.setBaseColorFactor(colorEye);
          material.pbrMetallicRoughness.setRoughnessFactor(0.3);
        } else if (name.includes('sign') || name.includes('牌')) {
          material.pbrMetallicRoughness.setBaseColorFactor(colorSign);
        } else if (name.includes('stick') || name.includes('棍')) {
          material.pbrMetallicRoughness.setBaseColorFactor(colorStick);
        } else if (name.includes('heart') || name.includes('爱')) {
          material.pbrMetallicRoughness.setBaseColorFactor(colorPink);
        }
      });
      console.groupEnd();
      return true;
    } catch (error) {
      console.error('Error applying materials:', error);
      return false;
    }
  }

  function bindViewerMaterialHandlers() {
    getViewerElements().forEach((viewer) => {
      if (viewer.__mentalMaterialsBound) return;
      viewer.__mentalMaterialsBound = true;
      viewer.addEventListener('load', () => {
        if (applyMaterialColors(viewer)) return;
        setTimeout(() => {
          applyMaterialColors(viewer);
        }, 100);
      });

      if (viewer.model && viewer.model.materials) {
        applyMaterialColors(viewer);
      }
    });
  }

  window.MentalModelRuntime = {
    changeModel,
    analyzeMood,
    analyzeSentimentAndSwitch,
    getCurrentMood: () => currentMood,
    applyMaterialColors,
    bindViewerMaterialHandlers
  };
})();
