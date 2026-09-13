// Only numeric levels reach the visualizer. No audio streams or transcripts.
// JS supplies state and measurements; CSS owns motion and reduced-motion behavior.
export function createVoiceOrb(root) {
  const orb = root.querySelector('[data-voice-orb]');
  if (!orb) return null;
  const caption = root.querySelector('[data-orb-caption]');
  const timers = {};
  let active = false;
  let talking = false;
  const labels = {
    idle: 'Ready when you are', connecting: 'Connecting…',
    listening: 'Listening to you', speaking: 'Speaking',
    stopping: 'Ending call…', unavailable: 'Currently unavailable',
  };
  const state = (name) => {
    orb.dataset.state = name;
    if (caption && caption.textContent !== labels[name]) caption.textContent = labels[name];
  };
  const clearLevels = () => {
    for (const source of ['mic', 'voice']) {
      clearTimeout(timers[source]);
      orb.style.setProperty(`--${source}-level`, '0');
    }
  };
  return {
    phase(next) {
      active = next === 'active';
      talking = false;
      clearLevels();
      state(active ? 'listening' : next);
    },
    speaking(value) {
      if (!active) return;
      talking = value;
      if (!value) {
        clearTimeout(timers.voice);
        orb.style.setProperty('--voice-level', '0');
      }
      state(value ? 'speaking' : 'listening');
    },
    level(source, value) {
      if (!active || !['mic', 'voice'].includes(source) || !Number.isFinite(value)) return;
      // A gentle response curve keeps normal conversational volume visible.
      const level = Math.sqrt(Math.max(0, Math.min(1, value)));
      orb.style.setProperty(`--${source}-level`, level.toFixed(3));
      clearTimeout(timers[source]);
      if (source === 'voice' && level > 0.03) state('speaking');
      else if (source === 'voice' && !talking) state('listening');
      // No events means no movement, rather than holding an old peak forever.
      timers[source] = setTimeout(() => {
        orb.style.setProperty(`--${source}-level`, '0');
        if (source === 'voice' && !talking) state('listening');
      }, 400);
    },
  };
}
