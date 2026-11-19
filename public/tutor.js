// Nova Tutor — AI widget present on every screen. Sessions stored server-side.
const tq = (s, el = document) => el.querySelector(s);
const fab = tq('#tutor-fab'), panel = tq('#tutor-panel');
const body = tq('#tutor-messages'), form = tq('#tutor-form'), input = tq('#tutor-input');

// Stable per-browser session id (chat history lives on the server)
let sessionId = localStorage.getItem('ls-session');
if (!sessionId) {
  sessionId = 's-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  localStorage.setItem('ls-session', sessionId);
}

function addMsg(role, text) {
  const m = document.createElement('div');
  m.className = `msg ${role}`;
  m.textContent = text.replace(/\*\*/g, '');
  body.append(m);
  body.scrollTop = body.scrollHeight;
  return m;
}

async function loadHistory() {
  body.innerHTML = '';
  try {
    const { messages } = await fetch(`api/tutor/${sessionId}`).then(r => r.json());
    if (!messages.length) {
      addMsg('bot', "Hey Isaiah! 👋 I'm Nova Tutor, your AI study partner on LearnSphere.\n\nAsk me to explain a topic, mark your work, quiz you, or help with that tricky question. What are we studying today?");
    } else {
      for (const m of messages) addMsg(m.role === 'user' ? 'user' : 'bot', m.content);
    }
  } catch { addMsg('bot', "I couldn't load our chat history — check the server."); }
}

form.addEventListener('submit', async e => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  addMsg('user', text);
  const typing = addMsg('typing', 'Nova Tutor is thinking…');
  try {
    const res = await fetch('api/tutor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, message: text }),
    });
    const j = await res.json();
    typing.remove();
    addMsg('bot', j.reply ?? `Error: ${j.error}`);
  } catch (err) {
    typing.remove();
    addMsg('bot', `Network error: ${err.message}`);
  }
});

fab.addEventListener('click', () => { panel.hidden = false; fab.style.display = 'none'; input.focus(); });
tq('#tutor-close').addEventListener('click', () => { panel.hidden = true; fab.style.display = ''; });
tq('#tutor-new').addEventListener('click', () => {
  sessionId = 's-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  localStorage.setItem('ls-session', sessionId);
  loadHistory();
});
loadHistory();
