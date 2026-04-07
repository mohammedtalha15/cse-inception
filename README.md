# SUGARFREE

SUGARFREE is a diabetes risk support app with:

- live vitals logging
- rule + ML hybrid risk scoring
- critical alerts and AI triage summaries
- explainability panels (why the score changed)
- doctor-sharing workflow for urgent cases
- AI chat assistant (with voice + report upload support)

## Repository

- GitHub: [https://github.com/mohammedtalha15/cse-inception](https://github.com/mohammedtalha15/cse-inception)

## Quick Start (Local)

### 1) Prerequisites

- Node.js 20+
- npm
- Python 3.10+ (3.11+ recommended)

### 2) Install frontend deps

```bash
npm install
```

### 3) Configure environment

Copy the template:

```bash
cp .env.local.example .env.local
```

Optional keys:

- `GEMINI_API_KEY` for AI explanations/chat
- `DATABASE_URL` only if you want Postgres (otherwise SQLite is used automatically)

### 4) Run everything (web + API)

```bash
npm run dev
```

This single command starts:

- Next.js app at `http://localhost:3000`
- FastAPI backend at `http://127.0.0.1:8000`

## Experience Links (Local)

After `npm run dev`, open:

- Home: [http://localhost:3000](http://localhost:3000)
- Log vitals: [http://localhost:3000/enter-data](http://localhost:3000/enter-data)
- Live dashboard: [http://localhost:3000/dashboard](http://localhost:3000/dashboard)
- Alerts & AI: [http://localhost:3000/alerts](http://localhost:3000/alerts)
- Predictor: [http://localhost:3000/predict](http://localhost:3000/predict)

## How Data Flows

1. User submits vitals in `Log vitals`.
2. Frontend posts to backend `/reading`.
3. Backend computes:
   - rule score
   - ML score
   - hybrid score
   - alert type + explanation
4. Dashboard reads latest readings.
5. Alerts page shows critical/early events and AI guidance.

## Important Behavior

- Critical alert band is triggered at risk basis `>= 40`.
- Alerts and dashboard are patient-ID based (`P001`, `P002`, etc.).
- If API is unreachable, dashboard can show deterministic mock stream fallback.

## Troubleshooting

- If backend is not reachable:
  - ensure `npm run dev` is running
  - check terminal output for FastAPI startup errors
- If AI text is missing:
  - set `GEMINI_API_KEY` in `.env.local`
- If dashboard/alerts look empty:
  - log at least one vitals entry for the same patient ID

## Scripts

- `npm run dev` - run Next.js + FastAPI together
- `npm run dev:web` - run only frontend
- `npm run dev:api` - run only backend
- `npm run build` - production build
- `npm run start` - run production frontend
