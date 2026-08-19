import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, MessageSquare, Send } from "lucide-react";
import { Button, DifficultyBadge, Skeleton } from "../components/ui";
import { useToast } from "../context/ToastContext";
import type { InterviewQuestion } from "../lib/types";
import type { AiProgress } from "../services/ai";
import { runEvaluation } from "../services/ai";
import * as interviewsService from "../services/interviews";
import { formatDate } from "../utils/format";

const MIN_ANSWER_CHARS = 20;

function scoreColor(score: number): string {
  if (score >= 8) return "text-radar-400";
  if (score >= 6) return "text-beacon-400";
  if (score >= 4) return "text-signal-400";
  return "text-flare-400";
}

export default function InterviewPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jobTitle, setJobTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [sessionDate, setSessionDate] = useState("");
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [answerError, setAnswerError] = useState<string | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [progress, setProgress] = useState<AiProgress | null>(null);

  const load = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    try {
      const details = await interviewsService.getSessionWithQuestions(sessionId);
      setJobTitle(details.job.jobTitle);
      setCompanyName(details.job.companyName);
      setJobId(details.job.id);
      setSessionDate(details.session.createdAt);
      setQuestions(details.questions);
      const initial: Record<string, string> = {};
      for (const q of details.questions) initial[q.id] = q.answer ?? "";
      setAnswers(initial);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load this interview session.");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    load();
  }, [load]);

  const active = questions[activeIdx] ?? null;
  const answered = questions.filter((q) => q.score !== null);
  const avg = answered.length ? answered.reduce((s, q) => s + (q.score ?? 0), 0) / answered.length : null;

  const handleEvaluate = async () => {
    if (!active) return;
    const answerText = (answers[active.id] ?? "").trim();
    if (answerText.length < MIN_ANSWER_CHARS) {
      setAnswerError(`Write at least ${MIN_ANSWER_CHARS} characters — a full sentence or two.`);
      return;
    }
    setAnswerError(null);
    setEvaluating(true);
    setProgress({ step: "Contacting AI service…", pct: 4 });
    try {
      const evaluation = await runEvaluation(
        { question: active.question, answer: answerText, category: active.category },
        setProgress
      );
      const updated = await interviewsService.saveEvaluation(active.id, answerText, evaluation);
      setQuestions((prev) => prev.map((q) => (q.id === updated.id ? updated : q)));
      toast("success", `Feedback saved — score ${evaluation.score}/10.`);
      if (activeIdx < questions.length - 1) setActiveIdx(activeIdx + 1);
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Unable to evaluate the answer. Please try again.");
    } finally {
      setEvaluating(false);
      setProgress(null);
    }
  };

  if (error) {
    return (
      <div className="panel mx-auto max-w-lg p-8 text-center">
        <p className="micro mb-2 !text-flare-400">Session not found</p>
        <p className="text-sm text-fog-300">{error}</p>
        <Link to="/jobs" className="mt-4 inline-block text-[13px] font-medium text-radar-400 hover:text-radar-300">
          ← Back to applications
        </Link>
      </div>
    );
  }

  if (loading || !active) {
    return (
      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        <Skeleton className="h-80 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <>
      {jobId && (
        <Link to={`/jobs/${jobId}`} className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-fog-400 transition-colors hover:text-radar-400">
          <ArrowLeft className="h-4 w-4" /> Back to {companyName}
        </Link>
      )}

      {/* briefing header */}
      <div className="panel rise mb-5 flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <p className="micro mb-1">Interview briefing · {formatDate(sessionDate)}</p>
          <h1 className="font-display text-[22px] font-bold text-fog-50">
            {jobTitle} <span className="text-fog-500">@ {companyName}</span>
          </h1>
        </div>
        <div className="text-right">
          <p className="font-display text-2xl font-bold text-fog-50">
            {answered.length}
            <span className="text-fog-500">/{questions.length}</span>
          </p>
          <p className="font-mono text-[10.5px] tracking-[0.14em] text-fog-500 uppercase">
            evaluated {avg !== null && <span className={`ml-2 font-semibold ${scoreColor(Math.round(avg))}`}>avg {avg.toFixed(1)}/10</span>}
          </p>
          <div className="mt-1.5 h-1.5 w-36 overflow-hidden rounded-full bg-ink-750">
            <div className="h-full rounded-full bg-radar-500 transition-all duration-500" style={{ width: `${(answered.length / questions.length) * 100}%` }} />
          </div>
        </div>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[280px_1fr]">
        {/* question navigator */}
        <nav className="panel rise rise-1 overflow-hidden" aria-label="Questions">
          <p className="micro border-b border-ink-700/60 px-4 py-3">Questions</p>
          <ul>
            {questions.map((q, i) => (
              <li key={q.id} className="border-b border-ink-700/40 last:border-0">
                <button
                  onClick={() => {
                    setActiveIdx(i);
                    setAnswerError(null);
                  }}
                  className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors ${
                    i === activeIdx ? "bg-radar-500/8" : "hover:bg-ink-800/60"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md font-mono text-[11px] font-semibold ${
                      q.score !== null
                        ? "bg-radar-500/15 text-radar-400"
                        : i === activeIdx
                          ? "bg-ink-600 text-fog-100"
                          : "bg-ink-750 text-fog-500"
                    }`}
                  >
                    {q.score !== null ? <Check className="h-3.5 w-3.5" /> : i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block text-[12.5px] font-medium leading-snug ${i === activeIdx ? "text-fog-50" : "text-fog-300"}`}>
                      {q.category}
                    </span>
                    <span className="mt-0.5 flex items-center gap-2">
                      <DifficultyBadge difficulty={q.difficulty} />
                      {q.score !== null && <span className={`font-mono text-[11px] font-semibold ${scoreColor(q.score)}`}>{q.score}/10</span>}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* active question */}
        <div className="space-y-4">
          <section className="panel rise rise-2 p-5 sm:p-6" aria-label="Current question">
            <div className="mb-3 flex flex-wrap items-center gap-2.5">
              <span className="font-mono text-[11px] tracking-[0.16em] text-radar-400 uppercase">
                Question {activeIdx + 1} / {questions.length}
              </span>
              <DifficultyBadge difficulty={active.difficulty} />
              <span className="rounded-full border border-ink-600 bg-ink-750 px-2 py-0.5 text-[11px] font-medium text-fog-300">
                {active.category}
              </span>
            </div>
            <h2 className="font-display text-[19px] font-semibold leading-snug text-fog-50 sm:text-[21px]">{active.question}</h2>

            <label className="mt-5 block">
              <span className="mb-1.5 flex items-baseline justify-between">
                <span className="text-[13px] font-medium text-fog-300">Your answer</span>
                <span className="font-mono text-[10.5px] text-fog-600">{(answers[active.id] ?? "").trim().length} chars</span>
              </span>
              <textarea
                className="field min-h-[150px] leading-[1.7]"
                placeholder="Answer as if the interviewer just asked you this. Structure beats length: point → reasoning → example."
                value={answers[active.id] ?? ""}
                onChange={(e) => setAnswers((prev) => ({ ...prev, [active.id]: e.target.value }))}
                aria-label="Your answer"
                aria-invalid={!!answerError}
              />
            </label>
            {answerError && <p className="mt-2 text-[12.5px] text-flare-400">{answerError}</p>}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <Button
                variant="ghost"
                size="sm"
                disabled={activeIdx === 0}
                onClick={() => setActiveIdx((i) => Math.max(0, i - 1))}
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Previous
              </Button>
              <Button onClick={handleEvaluate} loading={evaluating}>
                {!evaluating && <Send className="h-4 w-4" />}
                {evaluating ? "Evaluating…" : active.score !== null ? "Re-evaluate answer" : "Evaluate answer"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={activeIdx === questions.length - 1}
                onClick={() => setActiveIdx((i) => Math.min(questions.length - 1, i + 1))}
              >
                Next <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>

            {evaluating && progress && (
              <div className="mt-4 rounded-[10px] border border-beacon-500/25 bg-beacon-500/6 p-3.5">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-mono text-[11px] text-beacon-400">{progress.step}</span>
                  <span className="font-mono text-[11px] text-fog-500">{progress.pct}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-ink-750">
                  <div className="h-full rounded-full bg-beacon-500 transition-all duration-500" style={{ width: `${progress.pct}%` }} />
                </div>
              </div>
            )}
          </section>

          {/* feedback */}
          {active.score !== null && !evaluating && (
            <section className="panel rise p-5 sm:p-6" aria-label="AI feedback">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-700/60 pb-4">
                <p className="micro">AI-assisted feedback</p>
                <p className="font-display text-[26px] font-bold leading-none">
                  <span className={scoreColor(active.score)}>{active.score}</span>
                  <span className="text-fog-500">/10</span>
                </p>
              </div>

              <p className="mt-4 text-[14px] leading-relaxed text-fog-200">{active.feedback}</p>

              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="micro mb-2 !text-radar-400">Strengths</p>
                  <ul className="space-y-2">
                    {(active.strengths ?? []).map((s, i) => (
                      <li key={i} className="flex gap-2 text-[12.5px] leading-relaxed text-fog-300">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-radar-500" /> {s}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="micro mb-2 !text-signal-400">Weaknesses</p>
                  <ul className="space-y-2">
                    {(active.weaknesses ?? []).map((s, i) => (
                      <li key={i} className="flex gap-2 text-[12.5px] leading-relaxed text-fog-300">
                        <span className="mt-0.5 font-mono text-[12px] font-bold text-signal-500">−</span> {s}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="micro mb-2 !text-beacon-400">Try next</p>
                  <ul className="space-y-2">
                    {(active.suggestions ?? []).map((s, i) => (
                      <li key={i} className="flex gap-2 text-[12.5px] leading-relaxed text-fog-300">
                        <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-beacon-500" /> {s}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <p className="mt-5 border-t border-ink-700/60 pt-3 font-mono text-[10.5px] leading-relaxed text-fog-600">
                This is AI-assisted practice feedback, not an objective judgment — use it to structure your thinking, then rehearse out loud.
              </p>
            </section>
          )}

          {answered.length === questions.length && (
            <section className="panel rise flex flex-wrap items-center justify-between gap-4 border-radar-500/25 p-5" aria-label="Session summary">
              <div className="flex items-center gap-3.5">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-radar-500/30 bg-radar-500/10">
                  <MessageSquare className="h-5 w-5 text-radar-400" />
                </span>
                <div>
                  <p className="font-display text-[16px] font-semibold text-fog-50">Briefing complete</p>
                  <p className="text-[13px] text-fog-400">
                    Average score {avg !== null ? avg.toFixed(1) : "—"}/10. Re-run any question to improve it.
                  </p>
                </div>
              </div>
              {jobId && (
                <Button variant="outline" size="sm" onClick={() => navigate(`/jobs/${jobId}`)}>
                  Back to application
                </Button>
              )}
            </section>
          )}
        </div>
      </div>
    </>
  );
}
