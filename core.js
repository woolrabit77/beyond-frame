/* Shared math; no DOM or extension dependencies. */
(function (root) {
  'use strict';
  const defaults = Object.freeze({ enabled: true, blur: 65, brightness: 75, quality: 'balanced' });
  const profiles = Object.freeze({
    low: { renderWidth: 960, blurWidth: 256 },
    balanced: { renderWidth: 1280, blurWidth: 384 },
    high: { renderWidth: 1600, blurWidth: 640 }
  });
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const number = (v, fallback) => Number.isFinite(Number(v)) ? Number(v) : fallback;
  function settings(value = {}) {
    if (!value || typeof value !== 'object') value = {};
    return {
      enabled: typeof value.enabled === 'boolean' ? value.enabled : defaults.enabled,
      blur: clamp(number(value.blur, defaults.blur), 0, 100),
      brightness: clamp(number(value.brightness, defaults.brightness), 20, 100),
      quality: Object.hasOwn(profiles, value.quality) ? value.quality : defaults.quality
    };
  }
  function fitRect(box, width, height, objectFit = 'contain') {
    if (!(width > 0 && height > 0 && box.width > 0 && box.height > 0)) return null;
    if (objectFit === 'fill') return { x: box.x, y: box.y, width: box.width, height: box.height };
    const scale = objectFit === 'cover' ? Math.max(box.width / width, box.height / height) : Math.min(box.width / width, box.height / height);
    const w = width * scale, h = height * scale;
    return { x: box.x + (box.width - w) / 2, y: box.y + (box.height - h) / 2, width: w, height: h };
  }
  function outputSize(width, height, maxWidth) {
    const scale = Math.min(1, maxWidth / Math.max(width, 1), (maxWidth * 0.75) / Math.max(height, 1));
    return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
  }
  class FrameGate {
    constructor(fps = 30) { this.interval = 1000 / fps; this.next = null; }
    reset() { this.next = null; }
    accept(now) {
      if (this.next !== null && now + 0.5 < this.next) return false;
      this.next = this.next === null || now - this.next > this.interval * 2 ? now + this.interval : this.next + this.interval;
      return true;
    }
  }
  const api = { defaults, profiles, settings, fitRect, outputSize, FrameGate };
  root.YTBackgroundExpand = api;
  if (typeof module !== 'undefined') module.exports = api;
})(globalThis);
