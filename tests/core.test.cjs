const { test } = require('node:test');
const assert = require('node:assert/strict');
const { FrameGate, fitRect, outputSize, settings } = require('../core.js');

test('60fps source produces 30fps background with no cumulative rounding loss', () => {
  const gate = new FrameGate(30);
  let count = 0;
  for (let i = 0; i < 600; i++) if (gate.accept(i * 1000 / 60)) count++;
  assert.equal(count, 300);
});
test('30fps source is not accidentally reduced to 15fps', () => {
  const gate = new FrameGate(30);
  assert.equal(Array.from({ length: 300 }, (_, i) => gate.accept(i * 1000 / 30)).filter(Boolean).length, 300);
});
test('resume after a long pause does not try to catch up missed frames', () => {
  const gate = new FrameGate(30);
  assert.equal(gate.accept(0), true);
  assert.equal(gate.accept(5000), true);
  assert.equal(gate.accept(5001), false);
});
test('fullscreen letterbox hole matches the actual video rather than the video element', () => {
  assert.deepEqual(fitRect({ x: 0, y: 0, width: 1920, height: 1080 }, 1200, 630), { x: 0, y: 36, width: 1920, height: 1008 });
  assert.equal(fitRect({ x: 0, y: 0, width: 0, height: 0 }, 1200, 630), null);
});
test('GPU background resolution is bounded on high DPI and portrait viewports', () => {
  assert.deepEqual(outputSize(3840, 2160, 1280), { width: 1280, height: 720 });
  assert.deepEqual(outputSize(1080, 2400, 1280), { width: 432, height: 960 });
});
test('stored settings cannot create invalid shader values or prototype lookups', () => {
  assert.deepEqual(settings({ enabled: 'false', blur: 'NaN', brightness: 999, quality: '__proto__' }), { enabled: true, blur: 65, brightness: 100, quality: 'balanced' });
  assert.deepEqual(settings(null), settings());
  assert.deepEqual(settings('invalid'), settings());
});
test('interleaved video and 120Hz layout events share one 30fps budget', () => {
  const gate = new FrameGate(30);
  const events = [...Array.from({ length: 600 }, (_, i) => i * 1000 / 60), ...Array.from({ length: 1200 }, (_, i) => i * 1000 / 120)].sort((a, b) => a - b);
  assert.equal(events.filter(time => gate.accept(time)).length, 300);
});
