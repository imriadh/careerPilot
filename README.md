# CareerPilot — AI Job & Interview Assistant

A web app that helps students and job seekers **track job applications**, **score each posting against their resume with AI**, and **rehearse interviews** with AI-generated questions and feedback.

> AI is not a chatbot here — it is embedded in three concrete workflows:
> 1. **Job analysis** → match score, matching/missing skills, recommendations.
> 2. **Interview prep** → ~5 questions generated from the posting (question, category, difficulty).
> 3. **Answer evaluation** → score 0–10, strengths, weaknesses, suggestions, short feedback.

---

## Architecture (explain it in 30 seconds)

```
React SPA (Vite)  →  Supabase Auth (JWT) + Postgres with Row Level Security
                  →  Supabase Edge Functions (Deno/TypeScript, hold the secrets)
                  →  NVIDIA NIM (OpenAI-compatible chat-completions API)
```

- **The browser never talks to NVIDIA.** The API key exists only as a Supabase secret, used inside Edge Functions.
- **Authorization lives in the database**, via RLS policies (`user_id = auth.uid()`), not in React code.
- **The AI payload is validated twice**: once in the Edge Function before it is saved, once in the frontend before it is rendered.

### Demo mode vs. production

This repository ships in **demo mode** so the whole product runs without a server: `src/services/*` implement the exact Supabase contracts on top of a local store (`src/lib/db.ts`) and an on-device AI engine (`src/utils/ai.ts`). To go live you swap the *internals* of the service functions for `supabase.from(...)` queries and `supabase.functions.invoke(...)` calls — pages and components do not change.

| Demo build                        | Production                                    |
| --------------------------------- | --------------------------------------------- |
| `lib/db.ts` (localStorage)        | Postgres over HTTPS                           |
| `services/auth.ts`                | `supabase.auth.signUp / signInWithPassword`   |
| `services/jobs / resume / …`      | `supabase.from('jobs').select()` etc.         |
| `utils/ai.ts` (on-device engine)  | Edge Functions → NVIDIA NIM                   |
| user-scoped filtering in services | Row Level Security policies in Postgres       |

---

## Quick start (demo)

```bash
npm install
npm run dev        # local development
npm run build      # production build (dist/)
```

- **Demo account**: `demo@careerpilot.app` / `Demo1234!` (or click *“Take the demo flight”* on the login page) — pre-seeded resume + 5 applications in every status.
- Or register a fresh account (data is stored in your browser).

## Production setup

1. **Supabase project** → SQL editor → run `supabase/migrations/database.sql` (tables, indexes, constraints, RLS policies, triggers).
2. **Secrets** (never in the frontend):
   ```bash
   supabase secrets set NVIDIA_API_KEY=nvapi-...
   ```
3. **Deploy Edge Functions**:
   ```bash
   supabase functions deploy ai-analysis --no-verify-jwt
   supabase functions deploy ai-interview --no-verify-jwt
   ```
4. **Frontend env** (`.env`, see `.env.example`): only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
5. Swap the service internals to the Supabase client and point `services/ai.ts` at `supabase.functions.invoke("ai-analysis" | "ai-interview", ...)`.
6. Deploy the SPA to Vercel (Vite preset) — if you switch `HashRouter` → `BrowserRouter`, add an SPA rewrite.

> ⚠️ Verify the NVIDIA model id / endpoint against the current NIM docs before grading — hosted models rotate.

---

## Project structure

```
src/
  components/
    ui.tsx                # Button, Field, Modal, ScoreRing, badges, empty states…
    layout/AppShell.tsx   # sidebar / mobile drawer / user footer
    layout/AuthLayout.tsx # split-screen auth with radar panel
  context/                # AuthContext, ToastContext
  pages/                  # Login, Register, Dashboard, Jobs, JobDetails,
                          # JobEditor, ResumePage, InterviewPage, ProfilePage, ManualPage
  hooks-free services/    # auth, jobs, resume, analyses, interviews, ai
  lib/                    # types.ts (domain model), db.ts (demo store)
  utils/                  # ai.ts (engine/taxonomy), validation.ts, format.ts
supabase/
  migrations/database.sql # schema + RLS
  functions/ai-analysis/  # NVIDIA NIM integration (Deno/TS)
  functions/ai-interview/ # question generation + answer evaluation
.env.example
```

## Security checklist

- ✅ RLS enabled on every user-owned table; child rows (`interview_questions`) protected through their parent session.
- ✅ NVIDIA key server-side only (Supabase secret); no `service_role` key in the browser.
- ✅ Inputs validated in services **and** Edge Functions; AI output validated before render/save.
- ✅ Errors are caught and surfaced as friendly messages — never swallowed.
- ✅ Destructive actions (delete job / account) require modal confirmation.

## Manual test flights

- **Auth**: register → login → logout → open `/#/jobs` logged out (must redirect).
- **Jobs**: create / edit / status change via the flight-plan stepper / delete (confirm modal) / submit an empty form (inline errors).
- **Authorization**: user B cannot read user A's job ids (enforced by RLS in prod).
- **AI**: analyze with no resume (clear error), with a short description (blocked), valid run (score + skills + recs), re-run (history keeps both).
- **Interview**: generate 5 questions → answer → evaluate → feedback panel; empty answer is rejected; averages update.

The same checklist is available in-app under **Field Manual**.
