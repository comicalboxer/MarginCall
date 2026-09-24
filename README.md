# DefendFAIR

DefendFAIR is a full-stack cyber risk quantification and remediation decision platform built for executive security planning.

## What it does
- Quantifies cyber risk across a portfolio of critical digital assets using Monte Carlo loss simulation.
- Estimates annual expected loss (EAL) and 95% VaR.
- Optimizes remediation spend under a budget using a 0/1 knapsack (PuLP) model.
- Shows residual risk after funding recommended fixes.
- Surfaces board-oriented guidance tied to RBI, SEBI, and NIST controls.
- Accepts uploaded scanner CSV/JSON findings and enriches them with threat-intel metadata.

## Stack
- Backend: FastAPI + NumPy + SciPy + PuLP + Pydantic
- Frontend: Next.js + TypeScript + Recharts + Tailwind

## Core endpoints
- GET /health
- GET /api/v1/assets/seed
- POST /api/v1/quantify
- POST /api/v1/optimize
- POST /api/v1/copilot/chat
- POST /api/v1/upload-scan

## Run locally
1. Start backend:
   py -3.13 -m uvicorn app.main:app --host 0.0.0.0 --port 8000
2. Start frontend:
   cd frontend
   npm install
   npm run dev
3. Open http://localhost:3000
