import type { ReactNode } from "react";

/* Split-screen auth frame: brand + live "radar" panel on the left,
   the actual form on the right. Mobile collapses to the form with a compact header. */

const TELEMETRY_LINES = [
  "MATCH 78% · React · TypeScript · REST APIs",
  "5 QUESTIONS GENERATED · React · Behavioral",
  "ANSWER SCORED 7/10 · “add the dependency array”",
  "3 SKILL GAPS FOUND · Next.js · Jest · Docker",
];

function Radar() {
  return (
    <div className="relative mx-auto aspect-square w-[min(340px,32vw)]" aria-hidden="true">
      <div className="absolute inset-0 rounded-full border border-radar-500/25" />
      <div className="absolute inset-[16%] rounded-full border border-radar-500/20" />
      <div className="absolute inset-[32%] rounded-full border border-radar-500/15" />
      <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-radar-500/10" />
      <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-radar-500/10" />
      <div
        className="radar-sweep absolute inset-0 rounded-full"
        style={{ background: "conic-gradient(from 0deg, rgba(61,220,151,0.34), rgba(61,220,151,0.05) 26%, transparent 40%)" }}
      />
      <span className="radar-blip absolute left-[26%] top-[30%] h-2 w-2 rounded-full bg-radar-500 shadow-[0_0_14px_rgba(61,220,151,0.9)]" />
      <span className="radar-blip absolute left-[64%] top-[22%] h-2 w-2 rounded-full bg-beacon-500 shadow-[0_0_14px_rgba(79,179,255,0.9)]" style={{ animationDelay: "1.3s" }} />
      <span className="radar-blip absolute left-[58%] top-[66%] h-2 w-2 rounded-full bg-signal-500 shadow-[0_0_14px_rgba(255,178,36,0.9)]" style={{ animationDelay: "2.4s" }} />
      <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-radar-400" />
    </div>
  );
}

export default function AuthLayout({ children, footer }: { children: ReactNode; footer: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.08fr_1fr]">
      {/* brand / radar side */}
      <div className="relative hidden flex-col justify-between overflow-hidden border-r border-ink-700/60 bg-ink-900/50 p-10 lg:flex">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-radar-500/30 bg-radar-500/10">
            <svg viewBox="0 0 64 64" className="h-5 w-5" aria-hidden="true">
              <path d="M10 42 L54 14 L40 48 L30 39 Z" fill="#3ddc97" />
              <path d="M30 39 L40 48 L33 53 L27 42 Z" fill="#1fa971" />
            </svg>
          </span>
          <span className="font-display text-lg font-bold tracking-tight text-fog-50">CareerPilot</span>
        </div>

        <div className="space-y-9">
          <div>
            <p className="micro mb-3 !text-radar-400">AI job &amp; interview assistant</p>
            <h1 className="font-display text-[38px] font-bold leading-[1.08] tracking-tight text-fog-50">
              Every application,
              <br />
              on your radar.
            </h1>
            <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-fog-400">
              Track applications, score each posting against your resume, and rehearse interviews with AI-generated
              questions and feedback.
            </p>
          </div>
          <Radar />
        </div>

        <div className="space-y-4">
          <div className="panel overflow-hidden px-4 py-3">
            <p className="micro mb-2">Live telemetry</p>
            <div className="h-5 overflow-hidden">
              <div className="telemetry-ticker">
                {[...TELEMETRY_LINES, TELEMETRY_LINES[0]].map((line, i) => (
                  <p key={i} className="h-5 font-mono text-[11.5px] leading-5 text-fog-400">
                    <span className="mr-2 text-radar-500">▸</span>
                    {line}
                  </p>
                ))}
              </div>
            </div>
          </div>
          <p className="font-mono text-[10px] tracking-[0.18em] text-fog-600 uppercase">React · Supabase · NVIDIA NIM</p>
        </div>
      </div>

      {/* form side */}
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10 sm:px-8">
        <div className="mb-7 flex items-center gap-2.5 lg:hidden">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-radar-500/30 bg-radar-500/10">
            <svg viewBox="0 0 64 64" className="h-5 w-5" aria-hidden="true">
              <path d="M10 42 L54 14 L40 48 L30 39 Z" fill="#3ddc97" />
              <path d="M30 39 L40 48 L33 53 L27 42 Z" fill="#1fa971" />
            </svg>
          </span>
          <span className="font-display text-lg font-bold tracking-tight text-fog-50">CareerPilot</span>
        </div>
        <div className="w-full max-w-[420px]">{children}</div>
        <div className="mt-7 text-sm text-fog-400">{footer}</div>
      </div>
    </div>
  );
}
