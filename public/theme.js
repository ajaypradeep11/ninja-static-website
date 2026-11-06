// Apply before styles paint; keep the same preference across Studio pages.
(() => {
  const key = 'localninja-theme';
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  const valid = (value) => value === 'light' || value === 'dark' ? value : null;
  let preference = null;
  try { preference = valid(localStorage.getItem(key)); } catch { /* Storage can be disabled. */ }

  const icons = {
    light: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
    dark: '<path d="M20.7 13A8.7 8.7 0 0 1 11 3.3 8.8 8.8 0 1 0 20.7 13Z"/>',
  };
  function apply() {
    const theme = preference || (system.matches ? 'dark' : 'light');
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#000000' : '#ffffff');
    const next = theme === 'dark' ? 'light' : 'dark';
    document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
      button.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[next]}</svg><span>${next === 'light' ? 'Light' : 'Dark'}</span>`;
      button.setAttribute('aria-label', `Switch to ${next} mode`);
      button.title = `Switch to ${next} mode`;
      button.hidden = false;
    });
  }
  apply();
  document.addEventListener('DOMContentLoaded', () => {
    apply();
    document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
      button.addEventListener('click', () => {
        preference = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
        try { localStorage.setItem(key, preference); } catch { /* The toggle still works for this visit. */ }
        apply();
      });
    });
  }, { once: true });
  system.addEventListener('change', () => { if (!preference) apply(); });
  window.addEventListener('storage', (event) => {
    if (event.key === key || event.key === null) {
      preference = valid(event.newValue);
      apply();
    }
  });
})();
