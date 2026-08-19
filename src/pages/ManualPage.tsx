import type { ReactNode } from "react";
import { ArrowRight, BookOpen } from "lucide-react";
import { PageHeader } from "../components/ui";

/* The in-app "Field Manual": everything a student needs to explain
   the architecture to an instructor, in one readable place. */

const FLOW = [
  { title: "React SPA", sub: "Vite · Router · services layer", tone: "border-beacon-500/30 text-beacon-400" },
  { title: "Supabase", sub: "Auth (JWT) · Postgres + RLS", tone: "border-radar-500/30 text-radar-400" },
  { title: "Edge Functions", sub: "Deno · TypeScript · secrets", tone: "border-signal-500/30 text-signal-400" },
  { title: "NVIDIA NIM", sub: "LLM chat-completions API", tone: "border-flare-500/30 text-flare-400" },
];

const RLS_POLICIES = [
  { table: "profiles", rule: "id = auth.uid()", note: "Users read/update only their own profile row." },
  { table: "jobs", rule: "user_id = auth.uid()", note: "Full CRUD, but every row is scoped to its owner." },
  { table: "resumes", rule: "user_id = auth.uid()", note: "One resume per user (unique constraint)." },
  { table: "ai_analyses", rule: "user_id = auth.uid()", note: "Analyses readable/writable by owner only." },
  { table: "interview_sessions", rule: "user_id = auth.uid()", note: "Owner-only." },
  { table: "interview_questions", rule: "EXISTS (session owned by auth.uid())", note: "Child rows protected through their parent session." },
];

const SCHEMA: Array<{ table: string; fields: string[] }> = [
  { table: "profiles", fields: ["id → auth.users", "full_name", "email", "created_at"] },
  { table: "jobs", fields: ["id", "user_id → auth.users", "company_name", "job_title", "location", "job_description", "status (check)", "created_at", "updated_at"] },
  { table: "resumes", fields: ["id", "user_id (unique) → auth.users", "resume_text", "created_at", "updated_at"] },
  { table: "ai_analyses", fields: ["id", "user_id", "job_id → jobs", "match_score 0–100", "matching_skills text[]", "missing_skills text[]", "recommendations text[]", "created_at"] },
  { table: "interview_sessions", fields: ["id", "user_id", "job_id → jobs", "created_at"] },
  { table: "interview_questions", fields: ["id", "session_id → sessions", "question", "category", "difficulty", "answer", "score 0–10", "strengths", "weaknesses", "suggestions", "feedback", "created_at"] },
];

const MAPPING = [
  { demo: "lib/db.ts (localStorage, latency())", prod: "Supabase client + Postgres over HTTPS" },
  { demo: "services/auth.ts (hashed locally)", prod: "supabase.auth.signUp / signInWithPassword" },
  { demo: "services/jobs|resume|analyses|interviews", prod: "Same signatures → supabase.from('…') queries" },
  { demo: "utils/ai.ts on-device engine", prod: "Edge Functions → NVIDIA NIM chat-completions" },
  { demo: "User-scoped filtering in services", prod: "Row Level Security enforced in Postgres" },
];

function Section({ id, kicker, title, children }: { id: string; kicker: string; title: string; children: ReactNode }) {
  return (
    <section className="panel rise p-5 sm:p-6" id={id} aria-label={title}>
      <p className="micro mb-1.5">{kicker}</p>
      <h2 className="mb-4 font-display text-[19px] font-bold text-fog-50">{title}</h2>
      {children}
    </section>
  );
}

export default function ManualPage() {
  return (
    <>
      <PageHeader
        kicker="Field manual"
        title="How CareerPilot works"
        desc="The whole architecture on one page — what each piece does, why it exists, and how the demo build maps to the production Supabase + NVIDIA setup."
      />

      <div className="space-y-5">
        <Section id="flow" kicker="01 · System flow" title="One request path, end to end">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] sm:items-stretch">
            {FLOW.map((step, i) => (
              <div key={step.title} className="contents">
                <div className={`rounded-xl border bg-ink-850 p-4 ${step.tone.split(" ")[0]}`}>
                  <p className={`font-display text-[15px] font-semibold ${step.tone.split(" ")[1]}`}>{step.title}</p>
                  <p className="mt-1 font-mono text-[10.5px] leading-relaxed text-fog-500">{step.sub}</p>
                </div>
                {i < FLOW.length - 1 && (
                  <div className="hidden items-center sm:flex">
                    <ArrowRight className="h-4 w-4 text-fog-600" />
                  </div>
                )}
              </div>
            ))}
          </div>
          <ol className="mt-5 space-y-2">
            {[
              "The browser never talks to NVIDIA. React calls services, and services call Supabase.",
              "Supabase Auth issues a JWT; Postgres checks it on every query via Row Level Security.",
              "AI work goes to an Edge Function, which authenticates the caller, validates input, calls NIM with the secret key, validates the JSON the model returns, and sends back a safe payload.",
              "The frontend validates that payload again before rendering or saving it.",
            ].map((line, i) => (
              <li key={i} className="flex gap-2.5 text-[13.5px] leading-relaxed text-fog-300">
                <span className="mt-0.5 font-mono text-[11px] font-semibold text-radar-500">{String(i + 1).padStart(2, "0")}</span>
                {line}
              </li>
            ))}
          </ol>
        </Section>

        <Section id="concepts" kicker="02 · Concepts" title="The five ideas to be able to explain">
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ["API / REST", "An agreement about URLs + JSON shapes. Our services expose functions; production replaces them with supabase.from('jobs').select() and functions.invoke('ai-analysis')."],
              ["Authentication & JWT", "Supabase verifies the password and hands the browser a signed token (JWT). Every request carries it, so the database knows who is asking — we never store passwords ourselves."],
              ["Row Level Security", "SQL policies attached to tables. Even a forged frontend can only touch rows where user_id = auth.uid(). Authorization lives in the database, not in React."],
              ["Edge Functions", "Tiny Deno/TypeScript servers that run on Supabase. They are the only place the NVIDIA key exists — environment secret in, validated JSON out."],
              ["Environment variables", "Config injected at build/run time. VITE_-prefixed vars are public (Supabase URL + anon key); the NVIDIA key is a Supabase secret, never in the repo."],
              ["async/await + services layer", "All I/O is async and wrapped in try/catch. Pages call service functions and handle loading/error/success states — no SQL or fetch URLs inside components."],
            ].map(([term, body]) => (
              <div key={term} className="rounded-xl border border-ink-700 bg-ink-850 p-4">
                <p className="font-display text-[14px] font-semibold text-radar-400">{term}</p>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-fog-400">{body}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section id="rls" kicker="03 · Security" title="Row Level Security, policy by policy">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-[12.5px]">
              <thead>
                <tr className="border-b border-ink-600">
                  <th className="py-2 pr-4 font-mono text-[10.5px] font-semibold tracking-[0.14em] text-fog-500 uppercase">Table</th>
                  <th className="py-2 pr-4 font-mono text-[10.5px] font-semibold tracking-[0.14em] text-fog-500 uppercase">Policy (USING / WITH CHECK)</th>
                  <th className="py-2 font-mono text-[10.5px] font-semibold tracking-[0.14em] text-fog-500 uppercase">Effect</th>
                </tr>
              </thead>
              <tbody>
                {RLS_POLICIES.map((p) => (
                  <tr key={p.table} className="border-b border-ink-700/50 last:border-0">
                    <td className="py-2.5 pr-4 font-mono text-radar-400">{p.table}</td>
                    <td className="py-2.5 pr-4 font-mono text-fog-300">{p.rule}</td>
                    <td className="py-2.5 text-fog-400">{p.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 rounded-[10px] border border-ink-700 bg-ink-850 px-3.5 py-3 font-mono text-[11px] leading-relaxed text-fog-500">
            Test it: log in as user A, copy a job id, log in as user B, try to fetch it — Postgres returns nothing, because the policy
            filters rows before your code ever sees them.
          </p>
        </Section>

        <Section id="schema" kicker="04 · Database" title="Schema at a glance">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SCHEMA.map((t) => (
              <div key={t.table} className="rounded-xl border border-ink-700 bg-ink-850 p-4">
                <p className="font-mono text-[12.5px] font-semibold text-radar-400">{t.table}</p>
                <ul className="mt-2 space-y-1">
                  {t.fields.map((f) => (
                    <li key={f} className="font-mono text-[10.5px] text-fog-500">
                      · {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[12.5px] text-fog-500">
            Full DDL with foreign keys, indexes, constraints and RLS policies:{" "}
            <span className="font-mono text-fog-300">supabase/migrations/database.sql</span>
          </p>
        </Section>

        <Section id="mapping" kicker="05 · Demo ↔ production" title="What swaps when you go live">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-[12.5px]">
              <thead>
                <tr className="border-b border-ink-600">
                  <th className="py-2 pr-4 font-mono text-[10.5px] font-semibold tracking-[0.14em] text-fog-500 uppercase">This demo build</th>
                  <th className="py-2 font-mono text-[10.5px] font-semibold tracking-[0.14em] text-fog-500 uppercase">Production equivalent</th>
                </tr>
              </thead>
              <tbody>
                {MAPPING.map((m) => (
                  <tr key={m.demo} className="border-b border-ink-700/50 last:border-0">
                    <td className="py-2.5 pr-4 font-mono text-fog-300">{m.demo}</td>
                    <td className="py-2.5 text-fog-400">{m.prod}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-[12.5px] leading-relaxed text-fog-500">
            Secrets checklist: <span className="font-mono text-signal-400">NVIDIA_API_KEY</span> lives only in{" "}
            <span className="font-mono text-fog-300">supabase secrets</span>; the browser env holds only{" "}
            <span className="font-mono text-fog-300">VITE_SUPABASE_URL</span> and <span className="font-mono text-fog-300">VITE_SUPABASE_ANON_KEY</span>{" "}
            (see <span className="font-mono text-fog-300">.env.example</span>).
          </p>
        </Section>

        <Section id="testing" kicker="06 · Checklist" title="Manual test flights">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["Auth", ["Register → lands on Resume page", "Login with wrong password → inline error", "Open /#/jobs logged out → redirected to login", "Demo flight button → seeded account"]],
              ["Applications", ["Create with empty title → inline error", "Change status via the flight plan stepper", "Delete → confirm modal → cascades away"]],
              ["AI analysis", ["Analyze without resume → clear error", "Analyze with short description → blocked", "Result shows score, ±skills, recs", "Re-run → history keeps both scores"]],
              ["Interview", ["Prepare → 5 questions with category + difficulty", "Evaluate an empty answer → validation", "Feedback shows score, strengths, weaknesses", "Avg score updates as you finish questions"]],
              ["Security", ["User B cannot fetch User A's job (RLS in prod)", "No NVIDIA key anywhere in the browser bundle", "All secrets in .env.example are placeholders"]],
              ["States", ["Every async action shows a spinner", "Empty dashboard / jobs / resume states", "Toasts for success & failure paths"]],
            ].map(([title, items]) => (
              <div key={title as string} className="rounded-xl border border-ink-700 bg-ink-850 p-4">
                <p className="mb-2 font-display text-[14px] font-semibold text-fog-100">{title}</p>
                <ul className="space-y-1.5">
                  {(items as string[]).map((item) => (
                    <li key={item} className="flex gap-2 text-[12px] leading-relaxed text-fog-400">
                      <ArrowRight className="mt-0.5 h-3 w-3 shrink-0 text-radar-500" /> {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>

        <p className="flex items-center gap-2 px-1 pb-4 font-mono text-[10.5px] tracking-[0.16em] text-fog-600 uppercase">
          <BookOpen className="h-3.5 w-3.5" /> End of manual — full setup guide in README.md
        </p>
      </div>
    </>
  );
}
