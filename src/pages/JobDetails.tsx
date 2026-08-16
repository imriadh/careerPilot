import { Fragment, useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, ChevronRight, Clock, ClipboardList, MapPin, Pencil, Radar, Sparkles, Trash2 } from "lucide-react";
import { Button, ButtonLink, Modal, ScoreRing, Segmented, Skeleton, SkillChip, StatusBadge } from "../components/ui";
import { useToast } from "../context/ToastContext";
import type { Analysis, Job, Resume, Status } from "../lib/types";
import { STATUSES, STATUS_META } from "../lib/types";
import type { AiProgress } from "../services/ai";
import { runAnalysis, runQuestionGeneration } from "../services/ai";
import * as analysesService from "../services/analyses";
import * as interviewsService from "../services/interviews";
import * as jobsService from "../services/jobs";
import * as resumeService from "../services/resume";
import { formatDate, scoreBand, timeAgo } from "../utils/format";

type Tab = "analysis" | "interview";

function StatusPipeline({ status, onPick, busy }: { status: Status; onPick: (s: Status) => void; busy: boolean }) {
  const activeIdx = STATUSES.indexOf(status);
  return (
    <div className="flex items-start overflow-x-auto pb-1" role="tablist" aria-label="Change application status">
      {STATUSES.map((s, i) => {
        const active = s === status;
        return (
          <Fragment key={s}>
            {i > 0 && <div className={`mt-[13px] h-px min-w-4 flex-1 ${i <= activeIdx ? "bg-fog-500/50" : "bg-ink-600"}`} />}
            <button
              onClick={() => !busy && onPick(s)}
              disabled={busy}
              className="group flex w-16 shrink-0 flex-col items-center gap-1.5 disabled:opacity-60 sm:w-20"
              aria-label={`Set status to ${s}`}
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full border transition-all ${
                  active
                    ? `${STATUS_META[s].badge} shadow-[0_0_16px_rgba(124,144,180,0.25)]`
                    : "border-ink-600 bg-ink-800 group-hover:border-fog-500/60"
                }`}
              >
                <span className={`h-2.5 w-2.5 rounded-full ${active ? STATUS_META[s].dot : "bg-ink-600 group-hover:bg-fog-600"}`} />
              </span>
              <span className={`text-[10.5px] font-medium ${active ? STATUS_META[s].text : "text-fog-600 group-hover:text-fog-400"}`}>
                {s}
              </span>
            </button>
          </Fragment>
        );
      })}
    </div>
  );
}

export default function JobDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [resume, setResume] = useState<Resume | null>(null);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [current, setCurrent] = useState<Analysis | null>(null);
  const [sessions, setSessions] = useState<interviewsService.SessionSummary[]>([]);
  const [tab, setTab] = useState<Tab>("analysis");

  const [aiRunning, setAiRunning] = useState(false);
  const [aiProgress, setAiProgress] = useState<AiProgress | null>(null);
  const [statusBusy, setStatusBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState<AiProgress | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [j, r, a, s] = await Promise.all([
        jobsService.getJob(id),
        resumeService.getResume(),
        analysesService.listAnalysesForJob(id),
        interviewsService.listSessions(),
      ]);
      setJob(j);
      setResume(r);
      setAnalyses(a);
      setCurrent(a[0] ?? null);
      setSessions(s.filter((x) => x.session.jobId === id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load this application.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleStatus = async (status: Status) => {
    if (!job || status === job.status) return;
    const prev = job;
    setJob({ ...job, status });
    setStatusBusy(true);
    try {
      const updated = await jobsService.updateJob(job.id, { status });
      setJob(updated);
      toast("success", `Status changed to ${status}.`);
    } catch (err) {
      setJob(prev);
      toast("error", err instanceof Error ? err.message : "Unable to change the status.");
    } finally {
      setStatusBusy(false);
    }
  };

  const handleAnalyze = async () => {
    if (!job) return;
    if (!resume || !resume.resumeText.trim()) {
      toast("error", "Add your resume first — the AI compares the job against it.");
      return;
    }
    setAiRunning(true);
    setAiProgress({ step: "Contacting AI service…", pct: 4 });
    try {
      const payload = await runAnalysis(
        { resumeText: resume.resumeText, jobTitle: job.jobTitle, jobDescription: job.jobDescription },
        setAiProgress
      );
      const saved = await analysesService.createAnalysis(job.id, payload);
      setAnalyses((prev) => [saved, ...prev]);
      setCurrent(saved);
      toast("success", "Analysis completed.");
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Unable to complete the analysis. Please try again.");
    } finally {
      setAiRunning(false);
      setAiProgress(null);
    }
  };

  const handlePrepare = async () => {
    if (!job) return;
    setGenerating(true);
    setGenProgress({ step: "Contacting AI service…", pct: 4 });
    try {
      const questions = await runQuestionGeneration({ jobTitle: job.jobTitle, jobDescription: job.jobDescription }, setGenProgress);
      const details = await interviewsService.createSession(job.id, questions);
      toast("success", "Interview briefing ready — 5 questions generated.");
      navigate(`/interview/${details.session.id}`);
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Unable to generate questions. Please try again.");
    } finally {
      setGenerating(false);
      setGenProgress(null);
    }
  };

  const handleDelete = async () => {
    if (!job) return;
    setDeleting(true);
    try {
      await jobsService.deleteJob(job.id);
      toast("info", "Application deleted, including its analyses and interview sessions.");
      navigate("/jobs", { replace: true });
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Unable to delete the application.");
      setDeleting(false);
    }
  };

  if (error || (!loading && !job)) {
    return (
      <div className="panel mx-auto max-w-lg p-8 text-center">
        <p className="micro mb-2 !text-flare-400">Not found</p>
        <p className="text-sm text-fog-300">{error ?? "This application does not exist or belongs to another account."}</p>
        <Button variant="outline" className="mt-5" onClick={() => navigate("/jobs")}>
          Back to applications
        </Button>
      </div>
    );
  }

  if (loading || !job) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-32 w-full" />
        <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      </div>
    );
  }

  const descriptionTooShort = job.jobDescription.trim().length < 40;
  const history = analyses.filter((a) => a.id !== current?.id);

  return (
    <>
      <Link to="/jobs" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-fog-400 transition-colors hover:text-radar-400">
        <ArrowLeft className="h-4 w-4" /> All applications
      </Link>

      {/* header */}
      <div className="panel rise mb-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <span className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-xl border border-ink-600 bg-ink-750 font-display text-xl font-bold text-fog-100">
              {job.companyName.slice(0, 1).toUpperCase()}
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="font-display text-[22px] font-bold leading-tight text-fog-50 sm:text-[25px]">{job.jobTitle}</h1>
                <StatusBadge status={job.status} />
              </div>
              <p className="mt-1 text-sm font-medium text-fog-300">{job.companyName}</p>
              <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11.5px] text-fog-500">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" /> {job.location}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" /> logged {formatDate(job.createdAt)} · updated {timeAgo(job.updatedAt)}
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ButtonLink to={`/jobs/${job.id}/edit`} variant="outline" size="sm">
              <Pencil className="h-3.5 w-3.5" /> Edit
            </ButtonLink>
            <Button variant="danger" size="sm" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </Button>
          </div>
        </div>
        <div className="mt-5 border-t border-ink-700/60 pt-4">
          <p className="micro mb-3">Flight plan — click a stage to update status</p>
          <StatusPipeline status={job.status} onPick={handleStatus} busy={statusBusy} />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        {/* description */}
        <section className="panel rise rise-1 self-start p-5 sm:p-6" aria-label="Job description">
          <p className="micro mb-3">Job description</p>
          <p className="whitespace-pre-line text-[14px] leading-[1.75] text-fog-200">{job.jobDescription}</p>
        </section>

        {/* AI mission control */}
        <aside className="space-y-4" aria-label="AI tools">
          <div className="panel rise rise-2 p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="micro">Mission control</p>
              <Segmented<Tab>
                value={tab}
                onChange={setTab}
                options={[
                  { value: "analysis", label: "Analysis" },
                  { value: "interview", label: "Interview" },
                ]}
              />
            </div>

            {tab === "analysis" ? (
              <div className="space-y-4">
                {!resume || !resume.resumeText.trim() ? (
                  <div className="flex items-start gap-2.5 rounded-[10px] border border-signal-500/30 bg-signal-500/8 px-3.5 py-3 text-[13px] text-signal-400">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      Analysis needs your resume to compare against.{" "}
                      <Link to="/resume" className="font-semibold underline underline-offset-2 hover:text-signal-500">
                        Add it now
                      </Link>
                      .
                    </span>
                  </div>
                ) : (
                  <Button className="w-full" onClick={handleAnalyze} loading={aiRunning} disabled={descriptionTooShort}>
                    {!aiRunning && <Sparkles className="h-4 w-4" />}
                    {aiRunning ? "Analyzing…" : analyses.length > 0 ? "Re-run analysis" : "Analyze with AI"}
                  </Button>
                )}
                {descriptionTooShort && (
                  <p className="text-[12px] text-fog-500">The job description is too short for a reliable analysis — edit it first.</p>
                )}

                {aiRunning && aiProgress && (
                  <div className="rounded-[10px] border border-radar-500/25 bg-radar-500/6 p-3.5">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-mono text-[11px] text-radar-400">{aiProgress.step}</span>
                      <span className="font-mono text-[11px] text-fog-500">{aiProgress.pct}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-ink-750">
                      <div className="h-full rounded-full bg-radar-500 transition-all duration-500" style={{ width: `${aiProgress.pct}%` }} />
                    </div>
                  </div>
                )}

                {current && !aiRunning && (
                  <div className="space-y-4 border-t border-ink-700/60 pt-4">
                    <div className="flex items-center justify-center">
                      <ScoreRing value={current.matchScore} label={scoreBand(current.matchScore).label} />
                    </div>

                    <div>
                      <p className="micro mb-2">Matching skills · {current.matchingSkills.length}</p>
                      {current.matchingSkills.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {current.matchingSkills.map((s) => (
                            <SkillChip key={s} name={s} tone="match" />
                          ))}
                        </div>
                      ) : (
                        <p className="text-[12.5px] text-fog-500">No direct skill overlap detected.</p>
                      )}
                    </div>

                    <div>
                      <p className="micro mb-2">Missing skills · {current.missingSkills.length}</p>
                      {current.missingSkills.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {current.missingSkills.map((s) => (
                            <SkillChip key={s} name={s} tone="gap" />
                          ))}
                        </div>
                      ) : (
                        <p className="text-[12.5px] text-fog-500">Nothing obviously missing — strong coverage.</p>
                      )}
                    </div>

                    <div>
                      <p className="micro mb-2">Recommendations</p>
                      <ol className="space-y-2">
                        {current.recommendations.map((rec, i) => (
                          <li key={i} className="flex gap-2.5 text-[13px] leading-relaxed text-fog-300">
                            <span className="mt-0.5 font-mono text-[11px] font-semibold text-radar-500">{String(i + 1).padStart(2, "0")}</span>
                            {rec}
                          </li>
                        ))}
                      </ol>
                    </div>

                    <p className="border-t border-ink-700/60 pt-3 font-mono text-[10.5px] leading-relaxed text-fog-600">
                      AI-assisted estimate from {timeAgo(current.createdAt)} — not an objective prediction of hiring outcomes.
                    </p>
                  </div>
                )}

                {!current && !aiRunning && (
                  <div className="flex flex-col items-center rounded-[10px] border border-dashed border-ink-600 px-4 py-7 text-center">
                    <Radar className="mb-2.5 h-6 w-6 text-fog-500" />
                    <p className="text-[13px] leading-relaxed text-fog-400">
                      Run the analysis to get a match score, skill gaps and concrete recommendations for this role.
                    </p>
                  </div>
                )}

                {history.length > 0 && (
                  <div>
                    <p className="micro mb-2">Previous runs</p>
                    <ul className="space-y-1.5">
                      {history.map((a) => (
                        <li key={a.id}>
                          <button
                            onClick={() => setCurrent(a)}
                            className="flex w-full items-center justify-between rounded-lg border border-ink-700 bg-ink-850 px-3 py-2 text-[12.5px] text-fog-400 transition-colors hover:border-ink-500 hover:text-fog-200"
                          >
                            <span className="font-mono">score {a.matchScore}</span>
                            <span className="inline-flex items-center gap-1">
                              {formatDate(a.createdAt)} <ChevronRight className="h-3.5 w-3.5" />
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <Button className="w-full" onClick={handlePrepare} loading={generating}>
                  {!generating && <ClipboardList className="h-4 w-4" />}
                  {generating ? "Preparing briefing…" : "Prepare for Interview"}
                </Button>

                {generating && genProgress && (
                  <div className="rounded-[10px] border border-signal-500/25 bg-signal-500/6 p-3.5">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-mono text-[11px] text-signal-400">{genProgress.step}</span>
                      <span className="font-mono text-[11px] text-fog-500">{genProgress.pct}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-ink-750">
                      <div className="h-full rounded-full bg-signal-500 transition-all duration-500" style={{ width: `${genProgress.pct}%` }} />
                    </div>
                  </div>
                )}

                <p className="text-[12.5px] leading-relaxed text-fog-400">
                  The AI drafts ~5 questions from the job title, description and required skills — then scores your answers with
                  strengths, weaknesses and suggestions.
                </p>

                {sessions.length > 0 && (
                  <div>
                    <p className="micro mb-2">Past sessions</p>
                    <ul className="space-y-1.5">
                      {sessions.map((s) => (
                        <li key={s.session.id}>
                          <Link
                            to={`/interview/${s.session.id}`}
                            className="flex w-full items-center justify-between rounded-lg border border-ink-700 bg-ink-850 px-3 py-2 text-[12.5px] text-fog-400 transition-colors hover:border-ink-500 hover:text-fog-200"
                          >
                            <span>
                              {formatDate(s.session.createdAt)} · {s.answeredCount}/{s.questionCount} answered
                            </span>
                            <span className="inline-flex items-center gap-1 font-mono">
                              {s.avgScore !== null ? `avg ${s.avgScore}/10` : "not scored"}
                              <ChevronRight className="h-3.5 w-3.5" />
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete this application?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              Keep it
            </Button>
            <Button variant="danger" onClick={handleDelete} loading={deleting}>
              <Trash2 className="h-4 w-4" /> Delete permanently
            </Button>
          </>
        }
      >
        <p>
          <span className="font-semibold text-fog-100">
            {job.jobTitle} @ {job.companyName}
          </span>{" "}
          will be removed along with its AI analyses and interview sessions. This cannot be undone.
        </p>
      </Modal>
    </>
  );
}
