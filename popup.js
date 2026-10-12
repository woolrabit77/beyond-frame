(async function (api) {
  'use strict';
  api.localize();
  const fields = ['enabled', 'blur', 'brightness', 'quality'];
  const status = document.getElementById('status');
  let settings = api.settings((await chrome.storage.local.get('settings')).settings);
  function show() {
    for (const name of fields) {
      const input = document.getElementById(name);
      if (name === 'enabled') input.checked = settings[name]; else input.value = settings[name];
    }
    for (const name of ['blur', 'brightness']) {
      document.getElementById(`${name}-value`).value = `${settings[name]}%`;
      const input = document.getElementById(name);
      input.style.setProperty('--fill', `${(settings[name] - Number(input.min)) / (Number(input.max) - Number(input.min)) * 100}%`);
    }
  }
  let saveTimer;
  for (const name of fields) document.getElementById(name).addEventListener('input', event => {
    settings = api.settings({ ...settings, [name]: name === 'enabled' ? event.target.checked : event.target.value });
    show(); clearTimeout(saveTimer);
    if (name === 'enabled' || name === 'quality') chrome.storage.local.set({ settings }).then(updateStatus);
    else saveTimer = setTimeout(() => chrome.storage.local.set({ settings }).then(updateStatus), 80);
  });
  for (const name of ['blur', 'brightness']) document.getElementById(name).addEventListener('change', () => {
    clearTimeout(saveTimer); chrome.storage.local.set({ settings }).then(updateStatus);
  });
  async function updateStatus() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const result = await chrome.tabs.sendMessage(tab.id, { type: 'get-status' });
      status.dataset.state = result.state;
      status.dataset.error = String(result.state === 'error');
      status.textContent = result.messageKey ? api.message(result.messageKey, result.substitutions || []) : result.message || api.message(result.state, result.state === 'playing' ? [result.fps ? `${result.fps} fps` : api.message('measuring')] : []);
    } catch { status.dataset.state = 'waiting'; status.dataset.error = 'false'; status.textContent = api.message('unavailable'); }
  }
  show(); updateStatus(); setInterval(updateStatus, 1000);
})(globalThis.YTBackgroundExpand);
