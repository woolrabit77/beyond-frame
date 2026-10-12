const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const locales = fs.readdirSync(path.join(root, '_locales'));
const english = JSON.parse(fs.readFileSync(path.join(root, '_locales/en/messages.json')));

test('all ten locales contain complete messages and valid substitutions', () => {
  assert.equal(locales.length, 10);
  for (const locale of locales) {
    const messages = JSON.parse(fs.readFileSync(path.join(root, '_locales', locale, 'messages.json')));
    assert.deepEqual(Object.keys(messages).sort(), Object.keys(english).sort());
    for (const [key, entry] of Object.entries(messages)) {
      assert.ok(entry.message.trim(), `${locale}:${key}`);
      for (const match of entry.message.matchAll(/\$([A-Z_]+)\$/g)) assert.ok(entry.placeholders?.[match[1].toLowerCase()], `${locale}:${key} placeholder`);
    }
  }
});

test('messages use Chrome translation and preserve technical error substitutions', () => {
  const context = vm.createContext({ chrome: { i18n: { getMessage: (key, substitutions) => key === 'playing' ? `GPU · ${substitutions[0]}` : (english[key]?.message || '').replace('$DETAIL$', substitutions[0] || '') } } });
  vm.runInContext(fs.readFileSync(path.join(root, 'core.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(root, 'i18n.js'), 'utf8'), context);
  const api = context.YTBackgroundExpand;
  assert.equal(api.message('playing', ['30 fps']), 'GPU · 30 fps');
  assert.match(api.message('errorInit', ['compile details']), /compile details/);
  const error = api.failure('errorLink', ['link details']);
  assert.equal(error.messageKey, 'errorLink');
  assert.equal(error.substitutions[0], 'link details');
});

test('manifest references only present files and localized metadata', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json')));
  assert.equal(manifest.default_locale, 'en');
  assert.equal(manifest.name, '__MSG_appName__');
  const files = [manifest.action.default_popup, ...Object.values(manifest.icons), ...manifest.content_scripts.flatMap(script => [...script.js, ...script.css])];
  for (const file of files) assert.ok(fs.existsSync(path.join(root, file)), file);
  assert.deepEqual(manifest.permissions, ['storage']);
});
