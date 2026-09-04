// Chat / voice widget for the bot demo pages.
// Talks to /api/chat (Firebase relay). If the relay isn't reachable or
// isn't configured yet, falls back to a scripted conversation so the
// demo still works. JS toggles classes; CSS owns animation.

const ENDPOINT = '/api/chat';
const HISTORY = 12;
const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)');

// Scripted replies used until the ChatGPT relay is configured. Each bot
// walks through its sequence; after that it loops a generic closer.
const SCRIPTS = {
  clinic: [
    "Hi! I'm Maple Clinic's booking assistant. Are you booking a new-patient visit, a follow-up, an annual check-up or a skin consult?",
    'Got it. Do you have a preferred doctor, or should I find the earliest available?',
    'I can offer Tuesday 9:30, Wednesday 14:15 or Thursday 11:00. Which works best?',
    "Perfect. What's the patient's first name and a phone number for the confirmation?",
    "You're booked - reference MC-4821. We'll text a reminder the day before. Anything else?",
  ],
  restaurant: [
    "Welcome to Ember & Oak! I'd be happy to get you a table. What day and time were you thinking?",
    'Lovely. How many will be joining you?',
    "That time is just full, but I have 7:30 or 8:45. Would either of those work?",
    'Great. Can I get a name and phone number for the reservation?',
    "You're all set - reference EO-2291. Any allergies or a special occasion we should know about?",
  ],
  store: [
    "Hi, this is Northshore Goods support. I can check an order, start a return or help with an exchange. What's your order number?",
    'Thanks. And the name on the order, just to confirm?',
    'Found it: the Trailhead 45L backpack shipped September 1 and is arriving September 4. Tracking NS-88Q2. Anything else I can help with?',
    "No problem - returns are free within 30 days. I've started RMA-7731 and emailed you a prepaid label. Refunds land 5-7 business days after we receive it.",
    "You're welcome! Is there anything else I can look up for you?",
  ],
  realty: [
    "Hi, I'm the assistant for Northshore Realty. Are you looking to buy or rent, and in which part of the city?",
    'Nice. What budget range are you working with, and how many bedrooms do you need?',
    "Two listings fit: a 2-bed condo in Kitsilano at $925k and a 3-bed townhouse in Burnaby Heights at $1.29M. Want to hear more about either?",
    "Great choice. Are you pre-approved for a mortgage yet, and when are you hoping to move?",
    "I can set up a viewing with Maya Chen this week. What's the best name and number to reach you?",
  ],
  dealer: [
    "Rideau Motorworks parts desk. Tell me the part you're after, or give me a VIN and I'll pull the right one.",
    'Got it. Is that for the F-150, the Transit or the Ram? I can check what fits before we order.',
    "Both are in: the Motorcraft set is $189.95 on the shelf here at Merivale, the Raybestos is $118.50. Which way do you want to go?",
    "Done - that's on your order with the core charge. Want me to add it to the Thursday service visit or hold it at the counter?",
    "It'll be on the counter under Croteau Contracting, and we'll text (613) 555-0177 when it's picked. Anything else for the truck?",
  ],
  trades: [
    "Copper & Coil, 24/7. What's going on - no heat, a leak, or something else?",
    'Okay. Is water still running, or is it contained? If it is running, shut the valve behind the fixture and we will get someone out today.',
    'I can do today 2-4 pm with Marc, or tomorrow 8-10 am with Priya. Which suits you better?',
    "What's the address and is there anything the tech should know - a gate code, a dog, parking?",
    "You're booked. Diagnostic is $89 and it comes off the repair; you'll get a text when the tech is 30 minutes out.",
  ],
};
const CLOSER = "Thanks! This is a scripted demo - once connected to ChatGPT I'll answer anything about the business. Is there something else I can help with?";

function initBot() {
  const root = document.querySelector('[data-bot]');
  if (!root) return;

  const bot = root.dataset.bot;
  const voice = root.dataset.mode === 'voice';
  const list = root.querySelector('.messages');
  const form = root.querySelector('.composer');
  const input = form.querySelector('input');
  const send = form.querySelector('.send');
  const mic = form.querySelector('.mic');
  const hint = root.querySelector('.voice-hint');
  const status = root.querySelector('.status-pill');

  const history = [];
  let scripted = false;
  let scriptIndex = 0;
  let busy = false;

  const add = (role, text) => {
    const el = document.createElement('div');
    el.className = `msg ${role}`;
    el.textContent = text;
    list.appendChild(el);
    list.scrollTop = list.scrollHeight;
    return el;
  };

  const showTyping = () => {
    const el = document.createElement('div');
    el.className = 'msg bot typing';
    el.innerHTML = '<i></i><i></i><i></i>';
    list.appendChild(el);
    list.scrollTop = list.scrollHeight;
    return el;
  };

  const setScripted = () => {
    if (scripted) return;
    scripted = true;
    status.textContent = 'Demo mode';
    status.classList.add('is-demo');
    add('system', 'Scripted demo - live ChatGPT replies switch on once the relay is configured.');
  };

  const speak = (text) => {
    if (!voice || !('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.02;
    speechSynthesis.speak(u);
  };

  const scriptedReply = () => {
    const seq = SCRIPTS[bot] || [];
    const text = scriptIndex < seq.length ? seq[scriptIndex] : CLOSER;
    scriptIndex += 1;
    return text;
  };

  const ask = async (text) => {
    if (busy) return;
    const clean = text.trim();
    if (!clean) return;
    busy = true;
    send.disabled = true;

    add('user', clean);
    history.push({ role: 'user', content: clean });
    const typing = showTyping();

    let reply = null;
    if (!scripted) {
      try {
        const res = await fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bot, messages: history.slice(-HISTORY) }),
        });
        if (res.ok) reply = (await res.json()).reply;
        else setScripted();
      } catch {
        setScripted();
      }
    }
    if (!reply) {
      // Small pause so the scripted mode still feels like a conversation.
      await new Promise((r) => setTimeout(r, prefersReduced.matches ? 0 : 600));
      reply = scriptedReply();
    }

    typing.remove();
    add('bot', reply);
    history.push({ role: 'assistant', content: reply });
    speak(reply);

    busy = false;
    send.disabled = false;
    input.focus();
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const text = input.value;
    input.value = '';
    ask(text);
  });

  document.querySelectorAll('[data-say]').forEach((chip) => {
    chip.addEventListener('click', () => ask(chip.dataset.say || chip.textContent));
  });

  // Voice: browser speech recognition in, spoken replies out.
  if (voice) {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition || !mic) {
      root.classList.add('voice-unsupported');
      if (hint) hint.textContent = 'Voice input needs Chrome, Edge or Safari - type instead.';
    } else {
      const rec = new Recognition();
      rec.lang = 'en-CA';
      rec.interimResults = true;
      let listening = false;

      const setListening = (on) => {
        listening = on;
        mic.classList.toggle('is-listening', on);
        mic.setAttribute('aria-pressed', String(on));
        if (hint) hint.textContent = on ? 'Listening… tap again to stop.' : 'Tap the mic and speak.';
      };

      rec.addEventListener('result', (event) => {
        const transcript = [...event.results].map((r) => r[0].transcript).join(' ');
        input.value = transcript;
        if (event.results[event.results.length - 1].isFinal) {
          input.value = '';
          setListening(false);
          rec.stop();
          ask(transcript);
        }
      });
      rec.addEventListener('end', () => setListening(false));
      rec.addEventListener('error', () => {
        setListening(false);
        if (hint) hint.textContent = 'Microphone not available - type instead.';
      });

      mic.addEventListener('click', () => {
        if (listening) {
          rec.stop();
          return;
        }
        speechSynthesis?.cancel();
        try {
          rec.start();
          setListening(true);
        } catch {
          setListening(false);
        }
      });
      if (hint) hint.textContent = 'Tap the mic and speak.';
    }
  }

  // Opening line comes from the script so the phone never starts empty.
  const opener = (SCRIPTS[bot] || [])[0];
  if (opener) {
    add('bot', opener);
    history.push({ role: 'assistant', content: opener });
    scriptIndex = 1;
  }
}

if (document.readyState !== 'loading') initBot();
else document.addEventListener('DOMContentLoaded', initBot);
