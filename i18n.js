(function (api) {
  'use strict';
  api.message = (key, substitutions = []) => {
    const translated = globalThis.chrome?.i18n?.getMessage(key, substitutions);
    // Chrome uses manifest.default_locale when the UI language is unsupported.
    return translated || key;
  };
  api.localize = () => {
    document.documentElement.lang = globalThis.chrome?.i18n?.getUILanguage?.() || 'en';
    for (const element of document.querySelectorAll('[data-i18n]')) element.textContent = api.message(element.dataset.i18n);
  };
  api.failure = (key, substitutions = []) => Object.assign(new Error(api.message(key, substitutions)), { messageKey: key, substitutions });
})(globalThis.YTBackgroundExpand);
