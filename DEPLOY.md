# Deploy Guide

## Overview

This project consists of two deployable components:
- **Backend**: FastAPI (Python 3.12)
- **Frontend**: React + Vite (static build)

---

## 1. Backend Deploy

### Option A: Railway (Recommended)

1. Create account at [railway.app](https://railway.app)
2. Connect GitHub repo
3. Add new project → Deploy from GitHub
4. Set root directory: `backend/`
5. Add environment variables (see `.env.production.example`)
6. Deploy — Railway auto-detects `requirements.txt`

**Build command:** (auto-detected)
```bash
pip install -r requirements.txt
```

**Start command:**
```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

### Option B: Render

1. Create account at [render.com](https://render.com)
2. New Web Service → Connect repo
3. Root directory: `backend`
4. Runtime: Python 3
5. Build: `pip install -r requirements.txt`
6. Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

---

## 2. Frontend Deploy

### Option A: Vercel (Recommended)

1. `npm install -g vercel`
2. `cd frontend && vercel`
3. Set environment variables in Vercel dashboard:
   - `VITE_API_BASE_URL` → Backend URL + `/api/v1`
   - `VITE_SUPABASE_URL` → Supabase URL
   - `VITE_SUPABASE_ANON_KEY` → Supabase anon key

### Option B: Netlify

1. `cd frontend && npm run build`
2. Deploy `frontend/dist/` to Netlify
3. Add environment variables in Netlify dashboard

### Option C: GitHub Pages

1. Update `frontend/vite.config.ts` with `base: '/repo-name/'`
2. Add deploy workflow to `.github/workflows/deploy-frontend.yml`

---

## 3. Database (Supabase)

The Supabase project is already configured. Apply migrations:

1. Go to Supabase Dashboard → SQL Editor
2. Run migrations in order:
   - `backend/migrations/001_initial_schema.sql`
   - `backend/migrations/002_companies_monthly_records.sql`
   - `backend/migrations/003_monthly_records_numeric_columns.sql`

---

## 4. GitHub Secrets Setup

Go to **Settings → Secrets and variables → Actions** and add:

| Secret | Value |
|--------|-------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role secret key |

---

## 5. Health Checks

| Endpoint | Purpose |
|----------|---------|
| `GET /health` | Backend alive |
| `GET /api/v1/companies` | API + DB working |

---

## 6. Post-Deploy Checklist

- [ ] All env vars set in hosting platform
- [ ] Supabase migrations applied
- [ ] Test users created (run `scripts/create_test_users.py`)
- [ ] Frontend → Backend CORS configured
- [ ] Health check endpoints responding
- [ ] CI/CD pipeline passing on main branch
