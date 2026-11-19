// LearnSphere SPA — hash router + six crafted pages
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const app = $('#app');

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ================= DATA =================
let NOTES = [], PASTQS = [];
let cache = { notes: null, pqs: null };

async function getData() {
  if (!cache.notes) {
    const [n, p] = await Promise.all([
      fetch('api/notes').then(r => r.json()),
      fetch('api/past-questions').then(r => r.json()),
    ]);
    cache.notes = n.notes;
    cache.pqs = p.questions;
  }
  NOTES = cache.notes;
  PASTQS = cache.pqs;
}

const SUBJECTS = ['Physics', 'Chemistry', 'Biology', 'Mathematics'];
const SUBJECT_ICON = { Physics: '🧲', Chemistry: '⚗️', Biology: '🧬', Mathematics: '📐' };

// ================= ROUTER =================
const routes = {
  '/': renderHome,
  '/notes': renderNotes,
  '/note': renderNote,       // #/note/3 — full-page reader
  '/practice': renderPractice,
  '/quiz': renderQuiz,       // #/quiz/Physics — quiz runner
  '/exam': renderExam,
  '/scheme': renderScheme,
  '/tutor': renderTutor,
};

function navigate() {
  const parts = location.hash.slice(1).split('/').filter(Boolean);
  const page = '/' + (parts[0] || '');
  const param = parts[1] || '';
  window.scrollTo(0, 0);
  $$('#main-nav a').forEach(a => a.classList.toggle('active', a.dataset.page === (parts[0] || 'home')));
  (routes[page] || renderHome)(decodeURIComponent(param));
}
addEventListener('hashchange', navigate);

// ================= PAGE: HOME =================
function renderHome() {
  const subjects = SUBJECTS.map(s =>
    `<a class="sub-card" href="#/notes/${s}"><span class="sub-icon">${SUBJECT_ICON[s]}</span><strong>${s}</strong><small>${NOTES.filter(n => n.subject === s).length} notes · ${PASTQS.filter(q => q.subject === s).length} questions</small></a>`
  ).join('');

  const totalQ = PASTQS.length;
  app.innerHTML = `
    <section class="hero">
      <div class="hero-copy">
        <p class="kicker">SS1 · Science Track · NERDC Curriculum</p>
        <h1>Your whole SS1 term, <em>mastered</em>.</h1>
        <p class="hero-sub">Week-by-week notes, real WAEC-style practice, unlimited AI-set exams and a tutor that never sleeps — built personally for <strong>Olarinde Isaiah</strong>.</p>
        <div class="hero-actions">
          <a class="btn btn-primary" href="#/notes">Start with Notes</a>
          <a class="btn btn-ghost" href="#/practice">Test yourself ⚡</a>
        </div>
        <div class="hero-stats">
          <div><strong>${NOTES.length}</strong><span>study notes</span></div>
          <div><strong>${totalQ}</strong><span>practice questions</span></div>
          <div><strong>∞</strong><span>AI exams</span></div>
        </div>
      </div>
      <div class="hero-art" aria-hidden="true"><div class="orbit o1"></div><div class="orbit o2"></div><div class="core">⚛</div></div>
    </section>

    <section class="section">
      <div class="section-head"><h2>Pick a subject</h2><p>Every subject opens its own notes, practice and exams.</p></div>
      <div class="sub-grid">${subjects}</div>
    </section>

    <section class="section alt">
      <div class="section-head"><h2>How you'll use it</h2></div>
      <div class="flow-grid">
        <a class="flow-card" href="#/notes"><span class="flow-num">1</span><h3>Learn</h3><p>Read the week's note in the reader — key points, worked examples.</p></a>
        <a class="flow-card" href="#/practice"><span class="flow-num">2</span><h3>Practice</h3><p>Timed quiz arena. Streaks, instant marking, explanations.</p></a>
        <a class="flow-card" href="#/exam"><span class="flow-num">3</span><h3>Exam</h3><p>Type any topics, AI sets a full WAEC-style paper.</p></a>
        <a class="flow-card" href="#/tutor"><span class="flow-num">4</span><h3>Ask Nova</h3><p>Stuck? The tutor explains like a patient senior.</p></a>
      </div>
    </section>`;
}

// ================= PAGE: NOTES =================
function renderNotes(subject = '') {
  const notes = subject ? NOTES.filter(n => n.subject === subject) : NOTES;
  const tabs = ['', ...SUBJECTS].map(s =>
    `<button class="tab ${s === subject ? 'active' : ''}" data-subject="${s}">${s === '' ? 'All' : SUBJECT_ICON[s] + ' ' + s}</button>`
  ).join('');

  app.innerHTML = `
    <section class="page-head">
      <p class="kicker">Class Notes · SS1 First Term</p>
      <h1>Read. Understand. <em>Remember.</em></h1>
      <p>Every week of the term, broken down in plain language.</p>
    </section>
    <section class="section">
      <div class="tabs" id="notes-tabs">${tabs}</div>
      <div class="cards" id="notes-grid"></div>
    </section>`;

  $('#notes-tabs').addEventListener('click', e => {
    const b = e.target.closest('.tab'); if (!b) return;
    history.replaceState(null, '', `#/notes/${b.dataset.subject}`);
    renderNotes(b.dataset.subject);
  });

  const grid = $('#notes-grid');
  for (const n of notes) {
    const card = el('a', 'card note-card', `
      <span class="card-tag">Week ${n.week} · ${esc(n.subject)}</span>
      <h3>${esc(n.title)}</h3>
      <p>${esc(n.content).slice(0, 200)}…</p>
      <span class="card-link">Open note →</span>`);
    card.href = `#/note/${NOTES.indexOf(n)}`;
    grid.append(card);
  }
}

// ================= PAGE: NOTE READER =================
function renderNote(idx) {
  const n = NOTES[+idx];
  if (!n) { location.hash = '#/notes'; return; }
  const prev = NOTES[+idx - 1], next = NOTES[+idx + 1];
  app.innerHTML = `
    <article class="reader">
      <a class="reader-back" href="#/notes">← All notes</a>
      <span class="card-tag">Week ${n.week} · ${esc(n.subject)}</span>
      <h1>${esc(n.title)}</h1>
      <div class="reader-body">${esc(n.content).split('\n\n').map(p => `<p>${p}</p>`).join('')}</div>
      <aside class="reader-keys">
        <h3>🔑 Key points</h3>
        <ul>${n.keyPoints.map(k => `<li>${esc(k)}</li>`).join('')}</ul>
      </aside>
      <div class="reader-nav">
        ${prev ? `<a href="#/note/${+idx - 1}">← ${esc(prev.title)}</a>` : '<span></span>'}
        ${next ? `<a href="#/note/${+idx + 1}">${esc(next.title)} →</a>` : '<span></span>'}
      </div>
      <div class="reader-cta">
        <a class="btn btn-primary" href="#/practice">Practice this subject ⚡</a>
        <a class="btn btn-ghost" href="#/tutor">Ask Nova about this note</a>
      </div>
    </article>`;
}

// ================= PAGE: PRACTICE ARENA =================
function renderPractice() {
  const per = SUBJECTS.map(s => {
    const qs = PASTQS.filter(q => q.subject === s);
    return `<a class="sub-card" href="#/quiz/${s}"><span class="sub-icon">${SUBJECT_ICON[s]}</span><strong>${s}</strong><small>${qs.length} questions · timed</small></a>`;
  }).join('');
  app.innerHTML = `
    <section class="page-head">
      <p class="kicker">Practice Arena</p>
      <h1>No pressure, <em>just reps</em>.</h1>
      <p>Timed quizzes, instant marking, streaks. Wrong answers come with the explanation.</p>
    </section>
    <section class="section"><div class="sub-grid">${per}</div></section>
    <section class="section alt">
      <div class="section-head"><h2>Mixed challenge</h2><p>Questions from every subject, shuffled.</p></div>
      <div class="center"><a class="btn btn-primary" href="#/quiz/Mixed">Start Mixed Quiz ⚡</a></div>
    </section>`;
}

// ================= PAGE: QUIZ RUNNER =================
function renderQuiz(subject) {
  let pool = subject === 'Mixed' ? [...PASTQS] : PASTQS.filter(q => q.subject === subject);
  if (!pool.length) { location.hash = '#/practice'; return; }
  pool = pool.sort(() => Math.random() - 0.5).slice(0, 10);
  let i = 0, score = 0, streak = 0, best = 0;

  app.innerHTML = `
    <section class="quiz-wrap">
      <div class="quiz-hud">
        <span id="q-progress">Q1/${pool.length}</span>
        <span id="q-score">Score 0</span>
        <span id="q-streak">🔥 0</span>
        <button id="q-quit" class="tab">Quit</button>
      </div>
      <div class="quiz-stage" id="q-stage"></div>
    </section>`;

  const stage = $('#q-stage');
  $('#q-quit').onclick = () => location.hash = '#/practice';

  function draw() {
    if (i >= pool.length) return finish();
    const q = pool[i];
    $('#q-progress').textContent = `Q${i + 1}/${pool.length}`;
    const letters = ['A', 'B', 'C', 'D'];
    stage.innerHTML = `
      <span class="card-tag">${esc(q.subject)} · ${esc(q.year)}</span>
      <h2>${esc(q.q)}</h2>
      <div class="pq-options">${q.options.map((o, j) => `<button class="pq-opt" data-i="${j}"><strong>${letters[j]})</strong> ${esc(o)}</button>`).join('')}</div>
      <p class="pq-explain" id="q-explain"></p>`;
    let answered = false;
    $$('.pq-opt', stage).forEach(b => b.onclick = () => {
      if (answered) return; answered = true;
      const j = +b.dataset.i, letter = letters[j];
      if (letter === q.answer) { b.classList.add('correct'); score++; streak++; best = Math.max(best, streak); }
      else { b.classList.add('wrong'); streak = 0; $$('.pq-opt', stage).find(x => letters[+x.dataset.i] === q.answer)?.classList.add('correct'); }
      $('#q-score').textContent = `Score ${score}`;
      $('#q-streak').textContent = `🔥 ${streak}`;
      const ex = $('#q-explain');
      ex.textContent = (letter === q.answer ? '✅ Correct! ' : `❌ Answer is ${q.answer}. `) + q.explanation;
      ex.classList.add('show');
      const next = el('button', 'btn btn-primary q-next', i === pool.length - 1 ? 'See results →' : 'Next →');
      next.onclick = () => { i++; draw(); };
      stage.append(next);
    });
  }

  function finish() {
    const pct = Math.round(score / pool.length * 100);
    const verdict = pct >= 80 ? ['🏆', 'Top of the class!', 'Isaiah, you are HIM. Keep this energy for the real exam.']
      : pct >= 50 ? ['💪', 'Solid work', 'Good base — review the misses and run it back.']
      : ['📚', 'Found your gaps', 'Perfect. Now you know exactly what to read. Go again.'];
    stage.innerHTML = `
      <div class="quiz-result">
        <div class="quiz-emoji">${verdict[0]}</div>
        <h2>${pct}% — ${verdict[1]}</h2>
        <p>${verdict[2]}</p>
        <p class="mono">Score ${score}/${pool.length} · Best streak 🔥${best}</p>
        <div class="reader-cta">
          <button class="btn btn-primary" id="q-again">Run it again</button>
          <a class="btn btn-ghost" href="#/practice">Other subjects</a>
        </div>
      </div>`;
    $('#q-again').onclick = () => renderQuiz(subject);
  }
  draw();
}

// ================= PAGE: EXAM LAB =================
function renderExam() {
  app.innerHTML = `
    <section class="page-head">
      <p class="kicker">Exam Lab · AI-Powered</p>
      <h1>Set yourself <em>the paper</em>.</h1>
      <p>Type any topics from your scheme — Nova researches them and sets a real WAEC-style exam.</p>
    </section>
    <section class="section">
      <form id="exam-form" class="exam-form">
        <div class="form-row">
          <label>Subject<select id="exam-subject">
            <option>Integrated Science</option><option>Physics</option><option>Chemistry</option><option>Biology</option><option>Mathematics</option>
          </select></label>
          <label>Type<select id="exam-type">
            <option value="objective">Objective (multiple choice)</option>
            <option value="theory">Theory</option>
            <option value="gap">Fill-in-the-gap</option>
          </select></label>
          <label>Questions<select id="exam-count">
            <option>5</option><option>8</option><option>10</option><option>15</option>
          </select></label>
        </div>
        <label class="grow">Topics (comma separated)
          <input id="exam-topics" type="text" placeholder="e.g. measurement and units, scalars and vectors" required>
        </label>
        <button class="btn btn-primary" type="submit" id="exam-submit">Set My Exam ⚡</button>
      </form>
      <div id="exam-output" class="exam-output mono" hidden></div>
    </section>`;

  $('#exam-form').addEventListener('submit', async e => {
    e.preventDefault();
    const out = $('#exam-output'), submit = $('#exam-submit');
    out.hidden = false;
    out.textContent = '⚡ Nova is researching your topics and setting the paper…';
    submit.disabled = true; submit.textContent = 'Setting exam…';
    try {
      const res = await fetch('api/exam', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: $('#exam-subject').value, topics: $('#exam-topics').value,
          type: $('#exam-type').value, count: parseInt($('#exam-count').value, 10),
        }),
      });
      const j = await res.json();
      out.textContent = j.questions ?? `Error: ${j.error}`;
    } catch (err) { out.textContent = `Network error: ${err.message}`; }
    finally { submit.disabled = false; submit.textContent = 'Set My Exam ⚡'; }
  });
}

// ================= PAGE: SCHEME =================
const SCHEME = {
  Physics: ['Intro to physics', 'Measurement & units', 'Scalars & vectors', 'Motion', "Newton's laws", 'Work, energy, power', 'Heat energy', 'Light: reflection', 'Light: refraction'],
  Chemistry: ['Intro & branches', 'Lab apparatus', 'Lab safety', 'States of matter', 'Elements, compounds, mixtures', 'Separation techniques', 'Phys/chem changes', 'Atomic theory', 'Atom structure'],
  Biology: ['Living things', 'Cell structure', 'Microscopy', 'Levels of organisation', 'Plant nutrition', 'Photosynthesis', 'Respiration', 'Transport in plants', 'Transport in animals'],
  Mathematics: ['Number bases', 'Indices & standard form', 'Logarithms', 'Sets & Venn diagrams', 'Linear equations', 'Simultaneous equations', 'Quadratic equations', 'Geometry', 'Trigonometry'],
};
function renderScheme() {
  app.innerHTML = `
    <section class="page-head">
      <p class="kicker">SS1 First Term · NERDC</p>
      <h1>The <em>map</em> of the term.</h1>
      <p>The official weekly plan — so nothing in your exam can surprise you.</p>
    </section>
    <section class="section"><div class="scheme-grid">${
      Object.entries(SCHEME).map(([s, weeks]) =>
        `<div class="scheme-col"><h3>${SUBJECT_ICON[s]} ${s}</h3><ol>${weeks.map(w => `<li>${esc(w)}</li>`).join('')}</ol></div>`).join('')
    }</div></section>`;
}

// ================= PAGE: TUTOR (full chat) =================
function renderTutor() {
  app.innerHTML = `
    <section class="tutor-page">
      <div class="tutor-head-full">
        <span class="tutor-avatar big">🤖</span>
        <div><h1>Nova Tutor</h1><p>online · studies with you 24/7 · explains like a patient senior</p></div>
      </div>
      <div class="tutor-chatbox" id="t-messages"></div>
      <form id="t-form" class="tutor-inputbar">
        <input id="t-input" type="text" placeholder="Ask me anything — topics, questions, homework…" autocomplete="off">
        <button class="btn btn-primary" type="submit">Send ➤</button>
        <button type="button" id="t-new" class="tab" title="New chat">＋ New</button>
      </form>
    </section>`;

  const box = $('#t-messages'), input = $('#t-input');
  let sessionId = localStorage.getItem('ls-session');
  if (!sessionId) {
    sessionId = 's-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
    localStorage.setItem('ls-session', sessionId);
  }

  function addMsg(role, text) {
    const m = el('div', `msg ${role}`);
    m.textContent = text.replace(/\*\*/g, '');
    box.append(m);
    box.scrollTop = box.scrollHeight;
    return m;
  }

  async function loadHistory() {
    box.innerHTML = '';
    try {
      const { messages } = await fetch(`api/tutor/${sessionId}`).then(r => r.json());
      if (!messages.length) {
        addMsg('bot', "Hey Isaiah! 👋 I'm Nova Tutor, your AI study partner on LearnSphere.\n\nAsk me to explain a topic, mark your work, quiz you, or help with that tricky question. What are we studying today?");
      } else for (const m of messages) addMsg(m.role === 'user' ? 'user' : 'bot', m.content);
    } catch { addMsg('bot', "I couldn't load our chat history — check the server."); }
  }

  $('#t-form').addEventListener('submit', async e => {
    e.preventDefault();
    const text = input.value.trim(); if (!text) return;
    input.value = '';
    addMsg('user', text);
    const typing = addMsg('typing', 'Nova Tutor is thinking…');
    try {
      const res = await fetch('api/tutor', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: text }),
      });
      const j = await res.json();
      typing.remove();
      addMsg('bot', j.reply ?? `Error: ${j.error}`);
    } catch (err) { typing.remove(); addMsg('bot', `Network error: ${err.message}`); }
  });

  $('#t-new').addEventListener('click', () => {
    sessionId = 's-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
    localStorage.setItem('ls-session', sessionId);
    loadHistory();
  });

  loadHistory();
  input.focus();
}

// ================= INIT =================
(async () => {
  try { await getData(); } catch (e) { app.innerHTML = '<p class="page-head">Failed to load content — is the server up?</p>'; }
  navigate();
})();
