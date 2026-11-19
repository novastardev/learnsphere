// LearnSphere server — static site + AI tutor & exam generator APIs
// AI: SenseNova (OpenAI-compatible), credentials read from Nova's .env at runtime.
import express from 'express';
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, readFileSync as rf } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PUBLIC = join(ROOT, 'public');
const DATA = join(ROOT, 'data');
const SESSIONS = join(DATA, 'sessions.json');
const PORT = process.env.PORT || 3210;

// --- Load AI credentials (never logged, never committed) ---
function loadEnv() {
  const env = {};
  try {
    const raw = readFileSync('/opt/baal-agent/workspace/projects/nova-kit/nova/.env', 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) env[m[1]] = m[2].trim();
    }
  } catch {}
  return env;
}
const ENV = loadEnv();
const AI_URL = ENV.NOVA_AI_ENDPOINT;
const AI_KEY = ENV.NOVA_AI_API_KEY;
const AI_MODEL = ENV.NOVA_AI_MODEL || 'sensenova-6.8-flash-lite';

mkdirSync(DATA, { recursive: true });

// --- Session storage (server-side chat history) ---
function loadSessions() {
  try { return JSON.parse(readFileSync(SESSIONS, 'utf8')); } catch { return {}; }
}
function saveSessions(s) {
  writeFileSync(SESSIONS, JSON.stringify(s, null, 2));
}

// --- AI call helper (OpenAI-compatible chat completions) ---
async function aiChat(messages, { maxTokens = 1200, temperature = 0.6 } = {}) {
  if (!AI_URL || !AI_KEY) throw new Error('AI not configured');
  const res = await fetch(AI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${AI_KEY}` },
    body: JSON.stringify({ model: AI_MODEL, messages, max_tokens: maxTokens, temperature }),
  });
  if (!res.ok) throw new Error(`AI error ${res.status}`);
  const j = await res.json();
  return j.choices?.[0]?.message?.content ?? '';
}

// --- Content: notes + past questions loaded from JSON files ---
function loadJson(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const f of readdirSync(dir).filter(f => f.endsWith('.json'))) {
    out.push(...JSON.parse(rf(join(dir, f), 'utf8')));
  }
  return out;
}
const NOTES = loadJson(join(ROOT, 'content', 'notes'));
const PASTQS = loadJson(join(ROOT, 'content', 'past-questions'));

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.static(PUBLIC));

// ---------- AI Tutor: chat with server-stored sessions ----------
async function tutorHandler(req, res) {
  try {
    const { sessionId, message } = req.body;
    if (!sessionId || !message?.trim()) return res.status(400).json({ error: 'sessionId and message required' });

    const sessions = loadSessions();
    const s = sessions[sessionId] || { id: sessionId, created: new Date().toISOString(), messages: [] };
    s.updated = new Date().toISOString();

    // Keep last 16 messages as context
    const history = s.messages.slice(-16);
    const system = {
      role: 'system',
      content:
        'You are Nova Tutor, a friendly AI study assistant inside LearnSphere, a learning platform for Nigerian senior secondary students (SS1). ' +
        'You explain science and math topics simply with real Nigerian exam context (WAEC/NECO style). ' +
        'Keep answers clear and structured: short explanation, worked examples where useful, then a quick recap. ' +
        'Encourage the student warmly like a supportive senior. Never do the whole homework when asked to cheat — guide instead.',
    };

    const reply = await aiChat([system, ...history, { role: 'user', content: message }], { maxTokens: 900 });
    s.messages.push({ role: 'user', content: message, at: new Date().toISOString() });
    s.messages.push({ role: 'assistant', content: reply, at: new Date().toISOString() });
    sessions[sessionId] = s;
    saveSessions(sessions);

    res.json({ reply });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
function tutorHistoryHandler(req, res) {
  const s = loadSessions()[req.params.sessionId];
  res.json({ messages: s?.messages ?? [] });
}

// ---------- AI Exam Generator ----------
async function examHandler(req, res) {
  try {
    const { subject, topics, count = 5, type = 'objective' } = req.body;
    if (!topics?.trim()) return res.status(400).json({ error: 'topics required' });

    const prompt =
      `You are an experienced Nigerian WAEC exam setter. Create a ${count}-question ${type} test for an SS1 student.\n` +
      `Subject: ${subject || 'Integrated Science'}\nTopics: ${topics}\n\n` +
      (type === 'objective'
        ? 'Format: multiple choice (options A-D), answer clearly marked, one-line explanation each.\n'
        : type === 'theory'
        ? 'Format: theory/essay questions with marking-guide points.\n'
        : 'Format: fill-in-the-gap questions with answers.\n') +
      'Use exactly this layout per question:\n\nQ<number>. <question>\nA) ... B) ... C) ... D) ... (objective only)\nANSWER: <letter/answer>\nWHY: <one-line explanation>\n';

    const questions = await aiChat(
      [{ role: 'user', content: prompt }],
      { maxTokens: 1600, temperature: 0.8 }
    );

    // Store generated exams
    const exams = loadSessions()['__exams'] || [];
    exams.push({ subject, topics, type, count, questions, at: new Date().toISOString() });
    const sessions = loadSessions();
    sessions['__exams'] = exams.slice(-50);
    saveSessions(sessions);

    res.json({ questions });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

// ---------- Notes & Past Questions ----------
function notesHandler(req, res) {
  const { subject } = req.query;
  res.json({ notes: subject ? NOTES.filter(n => n.subject === subject) : NOTES });
}
function pastQHandler(req, res) {
  const { subject } = req.query;
  res.json({ questions: subject ? PASTQS.filter(q => q.subject === subject) : PASTQS });
}

// Mount at root AND under /learnsphere (Caddy passes full path)
app.post('/api/tutor', tutorHandler);
app.get('/api/tutor/:sessionId', tutorHistoryHandler);
app.post('/api/exam', examHandler);
app.get('/api/notes', notesHandler);
app.get('/api/past-questions', pastQHandler);
const base = express.Router();
base.use(express.static(PUBLIC));
base.post('/api/tutor', tutorHandler);
base.get('/api/tutor/:sessionId', tutorHistoryHandler);
base.post('/api/exam', examHandler);
base.get('/api/notes', notesHandler);
base.get('/api/past-questions', pastQHandler);
app.use('/learnsphere', base);

app.listen(PORT, () => console.log(`LearnSphere on :${PORT}`));

