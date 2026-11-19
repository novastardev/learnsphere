# LearnSphere 🎓⚡

A dark-themed SS1 science learning platform built for **Olarinde Isaiah**.

## Features
- **Class Notes** — SS1 first-term NERDC scheme week-by-week (Physics, Chemistry, Biology, Mathematics) with key points & worked examples
- **WAEC-Style Past Questions** — objective questions with instant marking + explanations
- **AI Exam Generator** — send any topics, get a fresh WAEC-style exam (objective/theory/gap-fill)
- **Nova Tutor** — AI chat widget on every screen; chat sessions stored server-side

## Stack
Node.js + Express (zero build step), vanilla HTML/CSS/JS, SenseNova AI (OpenAI-compatible).

## Run
```bash
npm install
PORT=9038 npm start
```
AI credentials are read at runtime from Nova's .env (never committed).
