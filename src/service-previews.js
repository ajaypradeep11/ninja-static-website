// Each animated service gallery owns its visibility and playback controls.
export function createPreviewPlayback(panel) {
  const button = panel.querySelector('[data-preview-toggle]');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const connection = navigator.connection;
  const records = new Map();
  let paused = reducedMotion.matches || Boolean(connection?.saveData);

  // Older browsers keep the existing still-image cards.
  if (!('IntersectionObserver' in window)) return { register() {}, sync() {} };

  function updateButton() {
    button.textContent = paused ? 'Play previews' : 'Pause previews';
  }

  function sync() {
    for (const [media, state] of records) {
      const shouldPlay = !paused && !panel.hidden && !document.hidden && state.visible && !state.failed;
      if (!shouldPlay) {
        media.pause();
        continue;
      }
      if (!media.hasAttribute('src')) media.src = media.dataset.src;
      if (!media.paused || state.pending) continue;
      state.pending = true;
      media.play().catch((error) => {
        // Some browser/device policies still reject silent autoplay.
        if (error.name === 'NotAllowedError') {
          paused = true;
          updateButton();
          sync();
        } else if (error.name !== 'AbortError') {
          state.failed = true;
          media.classList.remove('is-ready');
        }
      }).finally(() => {
        state.pending = false;
        // Resume if a quick tab switch interrupted an earlier play request.
        if (media.paused && !paused && !panel.hidden && !document.hidden && state.visible && !state.failed) sync();
      });
    }
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(({ target, isIntersecting, intersectionRatio }) => {
      records.get(target).visible = isIntersecting && intersectionRatio >= .15;
    });
    sync();
  }, { threshold: [0, .15] });

  function register(media) {
    const state = { visible: false, pending: false, failed: false };
    records.set(media, state);
    media.addEventListener('playing', () => {
      if (!media.hasAttribute('src')) return;
      media.classList.add('is-ready');
      // A play promise may finish after the tab or viewport has changed.
      if (paused || panel.hidden || document.hidden || !state.visible) sync();
    });
    media.addEventListener('error', () => {
      if (!media.hasAttribute('src')) return;
      state.failed = true;
      media.classList.remove('is-ready');
    });
    observer.observe(media);
  }

  button.hidden = false;
  updateButton();
  button.addEventListener('click', () => {
    paused = !paused;
    updateButton();
    sync();
  });
  const respectPreferences = () => {
    paused = reducedMotion.matches || Boolean(connection?.saveData);
    updateButton();
    sync();
  };
  reducedMotion.addEventListener('change', respectPreferences);
  connection?.addEventListener('change', respectPreferences);
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('pageshow', sync);
  return { register, sync };
}
