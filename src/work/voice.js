// Provider boundary: UI depends on this adapter, not booking credentials or tenant IDs.
export function voiceConfig(bot) {
  const ids = {
    clinic: import.meta.env.VITE_VAPI_CLINIC_ASSISTANT_ID,
    dealer: import.meta.env.VITE_VAPI_DEALER_ASSISTANT_ID,
    restaurant: import.meta.env.VITE_VAPI_RESTAURANT_ASSISTANT_ID,
    realty: import.meta.env.VITE_VAPI_REALTY_ASSISTANT_ID,
  };
  return { publicKey: bot === 'clinic' ? import.meta.env.VITE_VAPI_CLINIC_PUBLIC_KEY : import.meta.env.VITE_VAPI_PUBLIC_KEY, assistantId: ids[bot] };
}

export async function createVoiceClient(config) {
  const { default: Vapi } = await import('@vapi-ai/web');
  return new Vapi(config.publicKey);
}

export function initVoice(root, { config = voiceConfig(root.dataset.bot), createClient = createVoiceClient } = {}) {
  const list = root.querySelector('.messages');
  const form = root.querySelector('.composer');
  const status = root.querySelector('.status-pill');
  root.classList.add('is-voice');
  root.querySelector('.wchips')?.remove();
  const subtitle = root.querySelector('.who span');
  if (subtitle) subtitle.textContent = 'Voice assistant';
  form.replaceChildren();
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'voice-call';
  form.append(button);
  let hint = root.querySelector('.voice-hint');
  if (!hint) {
    hint = document.createElement('p');
    hint.className = 'voice-hint';
    hint.setAttribute('aria-live', 'polite');
    form.before(hint);
  }
  const add = (role, content) => {
    const el = document.createElement('div');
    el.className = `msg ${role}`;
    el.textContent = content;
    list.append(el);
    list.scrollTop = list.scrollHeight;
  };
  let client;
  let phase = 'idle';
  let timer;
  let generation = 0;
  const render = (next, message) => {
    phase = next;
    button.disabled = ['connecting', 'stopping', 'unavailable'].includes(next);
    button.textContent = next === 'active' ? 'End call' : next === 'connecting' ? 'Connecting…' : next === 'stopping' ? 'Ending call…' : 'Start voice call';
    button.setAttribute('aria-pressed', String(next === 'active'));
    status.textContent = { idle: 'Ready', connecting: 'Connecting', stopping: 'Ending', active: 'On call', unavailable: 'Unavailable' }[next];
    button.classList.toggle('is-listening', next === 'active');
    hint.textContent = message;
  };
  const release = async instance => {
    try { await instance?.stop(); } catch { /* The transport may already be disconnected. */ }
  };
  const stop = async (message = 'Call ended. You can start another call.') => {
    const ending = ++generation;
    clearTimeout(timer);
    const previous = client;
    client = undefined;
    render('stopping', 'Ending call…');
    await release(previous);
    if (ending === generation) render('idle', message);
  };
  render('idle', 'Start a call and allow microphone access.');
  if (!config.publicKey || !config.assistantId) {
    render('unavailable', 'This voice assistant is not available yet. Please contact the business directly.');
    return;
  }
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
    render('unavailable', 'Voice calls need a secure connection and a browser with microphone support.');
    return;
  }
  // Clinic transcripts are not displayed or saved by this site.
  add('system', root.dataset.bot === 'clinic'
    ? 'You will speak with an AI booking assistant. Please share only information needed to book your visit.'
    : 'You will speak with an AI assistant. Your microphone is used only during the call.');
  button.addEventListener('click', async () => {
    if (phase === 'active') { stop(); return; }
    if (phase !== 'idle') return;
    const attempt = ++generation;
    render('connecting', 'Connecting to the assistant…');
    const fail = () => {
      if (attempt !== generation) return;
      stop('Could not connect. Check microphone permission and try again.');
    };
    timer = setTimeout(fail, 30000);
    try {
      const current = await createClient(config);
      if (attempt !== generation) return;
      client = current;
      current.on('call-start', () => {
        if (attempt !== generation) { release(current); return; }
        clearTimeout(timer);
        render('active', 'You’re connected. Speak naturally; select End call when finished.');
      });
      current.on('call-end', () => { if (attempt === generation) stop(); });
      current.on('error', fail);
      current.on('message', (message) => {
        if (attempt !== generation || root.dataset.bot === 'clinic') return;
        if (message.type === 'transcript' && message.transcriptType === 'final' && message.transcript) {
          add(message.role === 'user' ? 'user' : 'bot', message.transcript);
        }
      });
      const call = await current.start(config.assistantId);
      if (attempt !== generation) release(current);
      else if (!call) fail();
    } catch { fail(); }
  });
  window.addEventListener('pagehide', () => { stop(); });
  return { stop: () => {
    if (phase === 'active' || phase === 'connecting') return stop();
  } };
}
