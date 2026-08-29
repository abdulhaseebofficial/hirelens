# 📋 CV Analyzer Pro

AI-powered CV screening for recruiters and hiring managers. Upload a batch of CVs against a job
description and get evidence-based fit scores, structured candidate profiles, and ready-to-use
interview kits.

![Python](https://img.shields.io/badge/python-3.11%2B-blue.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688.svg)
![React](https://img.shields.io/badge/React-19-61dafb.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

The project is a FastAPI backend (`HireLens API`) paired with a React + Vite recruiter console.
The original Streamlit prototype is kept under [`legacy/`](legacy/) for reference.

## 📸 Screenshots

> The candidates below are fictional demo content, used to show what the interface looks like
> with a completed batch. They are not model output.

### Ranking and fit score

Every CV in a batch is scored 0-100 and ranked, with the evidence behind the score laid out
against the job description.

![Ranked candidates with the fit score report open](docs/screenshots/04-fit-score.png)

### Candidate snapshot

The structured profile pulled out of the CV — contact details, current role, skills, education
and achievements — exportable as JSON or CSV.

![Structured candidate profile extracted from the CV](docs/screenshots/05-candidate-profile.png)

### Interview kit

Role-specific questions generated on demand, each with what a strong answer covers, plus red
flags worth probing.

![Generated interview kit with questions and rubrics](docs/screenshots/06-interview-kit.png)

### Starting an analysis

![Upload form for CVs and the job description](docs/screenshots/03-new-analysis.png)

<details>
<summary>Sign in and screening history</summary>

![Sign in screen](docs/screenshots/01-login.png)

![List of previous analyses](docs/screenshots/02-dashboard.png)

</details>

## 🌟 Features

### 📊 JD ↔ CV Fit Score
- **0–100 match score** — quantitative candidate/job alignment
- **Evidence-based matching** — specific CV excerpts backing each requirement
- **Gap analysis** — missing or weak areas called out explicitly
- **Actionable verdict** — strong / moderate / weak fit

### 👤 Candidate Snapshot
- **Structured extraction** — name, contact, experience, skills, education, achievements
- **CSV export** — per-analysis and per-candidate, ready for ATS import

### 📝 Interview Kit Generator
- **Role-specific questions** tailored to the JD and the candidate's background
- **Evaluation rubrics** describing what a strong answer looks like
- **Red flags & clarifications** worth probing in the interview

### 🗂️ Batch Ranking
- Upload up to 15 CVs (configurable) and rank them against one JD
- Analyses run concurrently and are persisted per user

## 🛠️ Tech Stack

| Layer | Stack |
|---|---|
| Backend | FastAPI, SQLAlchemy 2 (async), Alembic, PyJWT, Pydantic v2 |
| Frontend | React 19, Vite 6, TypeScript, Tailwind CSS v4, React Router 7 |
| AI | Google Gemini via `google-genai` |
| Database | SQLite by default; PostgreSQL supported via `DATABASE_URL` |
| Tests | pytest (62 tests), ruff |

## 🚀 Quick Start

### Prerequisites

- Python **3.11+**
- Node.js **20+**
- A Google Gemini API key — https://aistudio.google.com/app/apikey

### 1. Clone

```bash
git clone https://github.com/abdulhaseebofficial/cv-analyzer-pro.git
cd cv-analyzer-pro
```

### 2. Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt

cp .env.example .env      # then fill in GOOGLE_API_KEY and SECRET_KEY
alembic upgrade head
uvicorn app.main:app --reload
```

The API is now on **http://127.0.0.1:8000** with interactive docs at **/docs**.

> `SECRET_KEY` is optional in development — one is generated per process — but leaving it unset
> invalidates every token on restart. Generate one with:
> `python -c "import secrets; print(secrets.token_urlsafe(48))"`

### 3. Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

The console opens on **http://localhost:5173**. The dev server proxies `/api` to the backend on
port 8000, so the browser sees a same-origin API and CORS never comes up locally.

### 4. Use it

Register an account in the UI, create an analysis, upload one or more CVs, and review the ranked
results.

**CVs must be PDFs.** Text is extracted with PyPDF2, so an upload that is not a PDF — or a scanned,
image-only PDF with no text layer — is rejected with an explanatory message instead of being
analysed. The job description is pasted as text rather than uploaded, and must be at least 50
characters.

To try it: upload `sample_cv.pdf` and paste the contents of `sample_jd.txt` (both in the repo root).

## 📡 API Overview

All routes live under `/api/v1`. Authenticate with `POST /auth/login`, then send
`Authorization: Bearer <access_token>`.

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/auth/register`, `/auth/login` | Create a session |
| `POST` | `/auth/refresh`, `/auth/logout`, `/auth/logout-all` | Token lifecycle |
| `GET` | `/auth/me` | Current user |
| `POST` | `/analyses` | Upload CVs + JD, start an analysis |
| `GET` | `/analyses`, `/analyses/{id}` | List / fetch analyses |
| `DELETE` | `/analyses/{id}` | Delete an analysis |
| `GET` | `/analyses/{id}/candidates/{cid}` | Candidate detail |
| `POST` | `/analyses/{id}/candidates/{cid}/interview-kit` | Generate an interview kit |
| `GET` | `/analyses/{id}/export.csv` | Export results |
| `GET` | `/health`, `/health/ready`, `/config` | Service status |

The full, always-current schema is at `/docs`.

## ⚙️ Configuration

Backend settings are read from `backend/.env` — see
[`backend/.env.example`](backend/.env.example) for every option with comments. The ones you are
most likely to change:

| Variable | Default | Notes |
|---|---|---|
| `GOOGLE_API_KEY` | _(empty)_ | Required — analysis endpoints refuse requests without it |
| `SECRET_KEY` | generated per process | **Set this in production** |
| `DATABASE_URL` | `sqlite+aiosqlite:///./hirelens.db` | Postgres: `postgresql+asyncpg://…` |
| `CORS_ORIGINS` | `http://localhost:5173,…` | Allowed browser origins |
| `MAX_BATCH_SIZE` | `15` | CVs per analysis |
| `MAX_FILE_SIZE_MB` | `10` | Per-file upload cap |

## 🧪 Development

```bash
# Backend
cd backend
ruff check .
pytest -q

# Frontend
cd frontend
npm run typecheck
npm run build
```

CI runs exactly these steps on every push and pull request — see
[`.github/workflows/ci.yml`](.github/workflows/ci.yml).

## 📂 Project Structure

```
cv-analyzer-pro/
├── backend/                 # FastAPI service (HireLens API)
│   ├── app/
│   │   ├── api/v1/          # auth, analyses, health routes
│   │   ├── core/            # config, security, logging, rate limiting
│   │   ├── db/              # async session + base
│   │   ├── models/          # SQLAlchemy models
│   │   ├── schemas/         # Pydantic request/response models
│   │   ├── services/        # Gemini, parsing, PDF, export, prompts
│   │   └── main.py          # app factory + middleware
│   ├── alembic/             # migrations
│   └── tests/               # pytest suite
├── frontend/                # React + Vite recruiter console
│   └── src/
│       ├── api/             # typed API client
│       ├── components/      # UI building blocks
│       ├── context/hooks/   # auth + analysis state
│       └── pages/           # dashboard, analysis, reports, auth
├── legacy/                  # original Streamlit prototype
├── docs/screenshots/        # images used by this README
└── .github/workflows/ci.yml
```

## 🔒 Security Notes

- **Never commit `.env`** — it is gitignored, and `.env.example` documents the shape instead.
- Passwords are hashed with bcrypt; a 10-character minimum is enforced by default.
- Access tokens are short-lived (30 min) with refresh tokens rotated on use.
- Rate limits apply globally and, more strictly, to analysis endpoints.
- Set `SECRET_KEY` in production so sessions survive a restart.

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Please keep `ruff check` and `pytest` green.

## 📝 License

MIT — see [LICENSE](LICENSE).
