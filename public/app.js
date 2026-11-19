// LearnSphere frontend — notes, past questions, exam generator
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ---------- Notes ----------
async function loadNotes(subject = '') {
  const grid = $('#notes-grid');
  grid.innerHTML = '';
  const { notes } = await fetch(`api/notes${subject ? `?subject=${encodeURIComponent(subject)}` : ''}`).then(r => r.json());
  $('#stat-notes').textContent = notes.length;
  for (const n of notes) {
    const card = el('article', 'card');
    card.append(
      el('span', 'card-tag', `Week ${n.week} · ${esc(n.subject)}`),
      el('h3', null, esc(n.title)),
      el('p', null, esc(n.content).slice(0, 260) + '…'),
    );
    const det = el('details', 'tutor-more');
    det.innerHTML = `<summary>Full note & key points</summary><p>${esc(n.content)}</p><ul>${n.keyPoints.map(k => `<li>${esc(k)}</li>`).join('')}</ul>`;
    card.append(det);
    grid.append(card);
  }
}

// ---------- Past Questions ----------
async function loadPQs(subject = '') {
  const grid = $('#pq-grid');
  grid.innerHTML = '';
  const { questions } = await fetch(`api/past-questions${subject ? `?subject=${encodeURIComponent(subject)}` : ''}`).then(r => r.json());
  $('#stat-questions').textContent = questions.length;
  for (const q of questions) {
    const card = el('article', 'card');
    card.append(
      el('span', 'card-tag', `${esc(q.subject)} · ${esc(q.year)}`),
      el('h3', null, esc(q.q)),
    );
    const opts = el('div', 'pq-options');
    const explain = el('p', 'pq-explain', `✅ ${esc(q.answer)} — ${esc(q.explanation)}`);
    let answered = false;
    const letters = ['A', 'B', 'C', 'D'];
    for (let i = 0; i < q.options.length; i++) {
      const letter = letters[i], text = q.options[i];
      const b = el('button', 'pq-opt', `<strong>${letter})</strong> ${esc(text)}`);
      b.onclick = () => {
        if (answered) return;
        answered = true;
        if (letter === q.answer) { b.classList.add('correct'); explain.textContent = `✅ Correct! ${q.explanation}`; }
        else { b.classList.add('wrong'); $$('.pq-opt', opts).find(x => x.textContent.startsWith(`${q.answer})`))?.classList.add('correct'); }
        explain.classList.add('show');
      };
      opts.append(b);
    }
    card.append(opts, explain);
    grid.append(card);
  }
}

// ---------- Tabs ----------
function wireTabs(containerId, loader) {
  $(`#${containerId}`).addEventListener('click', e => {
    const btn = e.target.closest('.tab');
    if (!btn) return;
    $$('.tab', $(`#${containerId}`)).forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    loader(btn.dataset.subject);
  });
}

// ---------- Exam Generator ----------
$('#exam-form').addEventListener('submit', async e => {
  e.preventDefault();
  const out = $('#exam-output');
  const submit = $('#exam-submit');
  out.hidden = false;
  out.textContent = '⚡ Researching your topics and setting the paper…';
  submit.disabled = true; submit.textContent = 'Setting exam…';
  try {
    const res = await fetch('api/exam', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject: $('#exam-subject').value,
        topics: $('#exam-topics').value,
        type: $('#exam-type').value,
        count: parseInt($('#exam-count').value, 10),
      }),
    });
    const j = await res.json();
    out.textContent = j.questions ?? `Error: ${j.error}`;
  } catch (err) {
    out.textContent = `Network error: ${err.message}`;
  } finally {
    submit.disabled = false; submit.textContent = 'Set My Exam ⚡';
  }
});

// ---------- Scheme of work ----------
const SCHEME = {
  Physics: ['Intro to physics', 'Measurement & units', 'Scalars & vectors', 'Motion', "Newton's laws", 'Work, energy, power', 'Heat energy', 'Light: reflection', 'Light: refraction'],
  Chemistry: ['Intro & branches', 'Lab apparatus', 'Lab safety', 'States of matter', 'Elements, compounds, mixtures', 'Separation techniques', 'Phys/chem changes', 'Atomic theory', 'Atom structure'],
  Biology: ['Living things', 'Cell structure', 'Microscopy', 'Levels of organisation', 'Plant nutrition', 'Photosynthesis', 'Respiration', 'Transport in plants', 'Transport in animals'],
  Mathematics: ['Number bases', 'Indices & standard form', 'Logarithms', 'Sets & Venn diagrams', 'Linear equations', 'Simultaneous equations', 'Quadratic equations', 'Geometry', 'Trigonometry'],
};
const sg = $('#scheme-grid');
for (const [subject, weeks] of Object.entries(SCHEME)) {
  const col = el('div', 'scheme-col', `<h3>${subject}</h3><ol>${weeks.map(w => `<li>${esc(w)}</li>`).join('')}</ol>`);
  sg.append(col);
}

// ---------- init ----------
wireTabs('subject-tabs', loadNotes);
wireTabs('pq-tabs', loadPQs);
loadNotes();
loadPQs();
