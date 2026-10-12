(function (api) {
  'use strict';
  let settings = api.defaults, video = null, renderer = null, canvas = null;
  let callback = null, callbackKind = '', error = '', messageKey = '', substitutions = [], destroyed = false;
  let pending = 0, discovery = 0, deferred = 0, count = 0, fps = 0, since = performance.now();
  const gate = new api.FrameGate(30), listeners = [];
  const root = document.documentElement;
  function stop() {
    if (callback !== null) {
      if (callbackKind === 'video') video?.cancelVideoFrameCallback(callback);
      else cancelAnimationFrame(callback);
    }
    callback = null;
  }
  function hide() { if (canvas) canvas.hidden = true; root.classList.remove('yt-background-expand-on'); }
  function release() {
    stop(); hide();
    clearTimeout(deferred); deferred = 0;
    const old = renderer; renderer = null;
    if (canvas) resizeObserver.unobserve(canvas);
    old?.dispose(); canvas?.remove(); canvas = null;
  }
  function placement() {
    if (!video || !video.isConnected) return null;
    const box = video.getBoundingClientRect();
    if (box.width < 20 || box.height < 20 || box.bottom <= 0 || box.top >= innerHeight || box.right <= 0 || box.left >= innerWidth || getComputedStyle(video).visibility === 'hidden') return null;
    const fullscreen = document.fullscreenElement;
    if (fullscreen === video) throw api.failure('errorFullscreen');
    const host = fullscreen || document.body;
    return { host, fullscreen: !!fullscreen };
  }
  function geometry() {
    // innerWidth includes the scrollbar; the CSS canvas usually excludes it.
    // Map both shader and CSS mask into the canvas's actual local coordinates.
    const layer = canvas.getBoundingClientRect(), style = getComputedStyle(canvas);
    const viewport = { width: parseFloat(style.width), height: parseFloat(style.height) };
    if (!(layer.width > 0 && layer.height > 0 && viewport.width > 0 && viewport.height > 0)) return null;
    const box = video.getBoundingClientRect();
    const scaleX = viewport.width / layer.width, scaleY = viewport.height / layer.height;
    const rect = api.fitRect({ x: (box.left - layer.left) * scaleX, y: (box.top - layer.top) * scaleY, width: box.width * scaleX, height: box.height * scaleY }, video.videoWidth, video.videoHeight, getComputedStyle(video).objectFit);
    return rect && { rect, viewport };
  }
  function draw(upload = true) {
    if (!settings.enabled || document.hidden || !video || video.readyState < 2 || error) { hide(); return; }
    try {
      const layout = placement();
      if (!layout) { hide(); return; }
      if (!gate.accept(performance.now())) {
        if ((video.paused || video.ended) && !deferred) deferred = setTimeout(() => { deferred = 0; refresh(); }, 34);
        return;
      }
      if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.className = 'yt-background-expand-layer'; canvas.setAttribute('aria-hidden', 'true');
        canvas.addEventListener('webglcontextlost', event => {
          event.preventDefault();
          if (renderer && event.target === canvas) { messageKey = 'errorLost'; error = api.message(messageKey); stop(); hide(); }
        });
        renderer = new api.Renderer(canvas);
        resizeObserver.observe(canvas);
      }
      if (canvas.parentNode !== layout.host) layout.host.prepend(canvas);
      canvas.classList.toggle('yt-background-expand-fullscreen', layout.fullscreen);
      canvas.hidden = false; root.classList.add('yt-background-expand-on');
      const dimensions = geometry();
      if (!dimensions) { hide(); return; }
      renderer.render(video, dimensions.rect, dimensions.viewport, settings, upload);
      count++;
      const now = performance.now();
      if (now - since >= 1000) { fps = Math.round(count * 1000 / (now - since)); count = 0; since = now; }
    } catch (cause) {
      messageKey = cause.name === 'SecurityError' ? 'errorSecurity' : cause.messageKey || '';
      substitutions = cause.substitutions || [];
      error = messageKey ? api.message(messageKey, substitutions) : cause.message;
      stop(); hide();
    }
  }
  function schedule() {
    if (callback !== null || !settings.enabled || document.hidden || error || !video || video.paused || video.ended) return;
    const tick = () => { callback = null; draw(); schedule(); };
    if (typeof video.requestVideoFrameCallback === 'function') { callbackKind = 'video'; callback = video.requestVideoFrameCallback(tick); }
    else { callbackKind = 'raf'; callback = requestAnimationFrame(tick); }
  }
  function refresh() {
    if (pending || destroyed) return;
    pending = requestAnimationFrame(() => { pending = 0; draw(); schedule(); });
  }
  function mediaChanged(event) {
    if (event.type === 'loadeddata' || event.type === 'emptied') { error = ''; messageKey = ''; }
    stop(); gate.reset(); refresh();
  }
  const resizeObserver = new ResizeObserver(refresh);
  function selectVideo() {
    discovery = 0;
    if (destroyed) return;
    const candidates = [...document.querySelectorAll('#movie_player video, ytm-player video, ytd-reel-video-renderer[is-active] video')];
    const next = candidates.filter(item => {
      const r = item.getBoundingClientRect();
      const reel = item.closest('ytd-reel-video-renderer');
      const style = getComputedStyle(item);
      return (!reel || reel.hasAttribute('is-active')) && r.width > 20 && r.height > 20 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth && style.display !== 'none' && style.visibility !== 'hidden';
    }).sort((a, b) => b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight)[0] || null;
    if (next !== video) {
      release(); resizeObserver.disconnect();
      for (const [element, name, handler] of listeners.splice(0)) element.removeEventListener(name, handler);
      video = next; error = ''; messageKey = ''; gate.reset(); fps = 0; count = 0; since = performance.now();
      if (video) {
        for (const name of ['play', 'pause', 'ended', 'loadeddata', 'loadedmetadata', 'seeked', 'emptied', 'resize']) {
          video.addEventListener(name, mediaChanged); listeners.push([video, name, mediaChanged]);
        }
        resizeObserver.observe(video);
      }
    }
    refresh();
  }
  function discover() { if (!discovery && !destroyed) discovery = setTimeout(selectVideo, 200); }
  const observer = new MutationObserver(records => {
    if (!video?.isConnected || records.some(record => record.type === 'attributes' || [...record.addedNodes].some(node => node.nodeType === 1 && (node.tagName === 'VIDEO' || node.querySelector?.('video'))))) discover();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['is-active'] });
  function apply(value) {
    settings = api.settings(value); error = ''; messageKey = ''; gate.reset();
    if (!settings.enabled) release(); else refresh();
  }
  chrome.storage.local.get('settings').then(value => { apply(value.settings); selectVideo(); }).catch(() => selectVideo());
  chrome.storage.onChanged.addListener((changes, area) => { if (area === 'local' && changes.settings) apply(changes.settings.newValue); });
  chrome.runtime.onMessage.addListener((message, sender, respond) => {
    if (message.type !== 'get-status') return;
    respond({ enabled: settings.enabled, state: error ? 'error' : !settings.enabled ? 'disabled' : !video || canvas?.hidden !== false ? 'waiting' : video.paused ? 'paused' : 'playing', message: error, messageKey, substitutions, fps: video?.paused ? 0 : fps });
  });
  addEventListener('resize', refresh, { passive: true });
  addEventListener('scroll', () => { refresh(); discover(); }, { passive: true, capture: true });
  document.addEventListener('fullscreenchange', refresh);
  document.addEventListener('yt-navigate-finish', discover);
  document.addEventListener('visibilitychange', () => { stop(); gate.reset(); if (document.hidden) hide(); else refresh(); });
  addEventListener('pagehide', event => {
    stop(); hide();
    if (!event.persisted) { destroyed = true; observer.disconnect(); resizeObserver.disconnect(); clearTimeout(discovery); cancelAnimationFrame(pending); release(); }
  });
  addEventListener('pageshow', () => { if (!destroyed) { gate.reset(); refresh(); } });
})(globalThis.YTBackgroundExpand);
