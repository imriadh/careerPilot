import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Briefcase, ChevronRight, FileText, Plus, Radar, RefreshCw } from "lucide-react";
import { Button, ButtonLink, EmptyState, PageHeader, Skeleton, StatusBadge } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import type { Analysis, Job, Resume } from "../lib/types";
import { STATUSES, STATUS_META } from "../lib/types";
import * as analysesService from "../services/analyses";
import * as jobsService from "../services/jobs";
import * as resumeService from "../services/resume";
import { extractSkills } from "../utils/ai";
import { formatDate, greeting, timeAgo } from "../utils/format";

export default function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [resume, setResume] = useState<Resume | null>(null);
  const [latest, setLatest] = useState<Analysis | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [j, r, a] = await Promise.all([jobsService.listJobs(), resumeService.getResume(), analysesService.latestAnalyses(1)]);
      setJobs(j);
      setResume(r);
      setLatest(a[0] ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load the dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = STATUSES.map((s) => ({ status: s, count: jobs.filter((j) => j.status === s).length }));
  const inFlight = jobs.filter((j) => j.status === "Applied" || j.status === "Interview").length;
  const recent = jobs.slice(0, 5);
  const latestJob = latest ? jobs.find((j) => j.id === latest.jobId) : null;
  const resumeSkills = resume ? extractSkills(resume.resumeText).length : 0;
  const firstName = user?.fullName.split(" ")[0] ?? "pilot";

  if (error) {
    return (
      <div className="panel mx-auto max-w-lg p-8 text-center">
        <p className="micro mb-2 !text-flare-400">Telemetry lost</p>
        <p className="text-sm text-fog-300">{error}</p>
        <Button variant="outline" className="mt-5" onClick={load}>
          <RefreshCw className="h-4 w-4" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        kicker={`Flight deck · ${formatDate(new Date().toISOString())}`}
        title={`${greeting()}, ${firstName}`}
        desc="Your application pipeline at a glance — status changes, AI analyses and interview prep all start here."
        actions={
          <>
            <ButtonLink to="/jobs/new" size="md">
              <Plus className="h-4 w-4" /> New application
            </ButtonLink>
          </>
        }
      />

      {loading ? (
        <div className="grid gap-5 lg:grid-cols-12">
          <div className="space-y-5 lg:col-span-7">
            <Skeleton className="h-44 w-full" />
            <Skeleton className="h-72 w-full" />
          </div>
          <div className="space-y-5 lg:col-span-5">
            <Skeleton className="h-56 w-full" />
            <Skeleton className="h-36 w-full" />
          </div>
        </div>
      ) : jobs.length === 0 ? (
        <EmptyState
          icon={<Briefcase className="h-6 w-6" />}
          title="No applications yet"
          body="Log your first job application, then let the AI score how well it matches your resume and brief you for the interview."
          action={
            <ButtonLink to="/jobs/new">
              <Plus className="h-4 w-4" /> Log your first application
            </ButtonLink>
          }
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-12">
          {/* left column */}
          <div className="space-y-5 lg:col-span-7">
            <section className="panel rise p-5" aria-label="Application pipeline">
              <div className="mb-4 flex items-baseline justify-between">
                <div>
                  <p className="micro mb-1">Pipeline</p>
                  <h2 className="font-display text-lg font-semibold text-fog-50">
                    {inFlight} in flight <span className="text-fog-500">/ {jobs.length} total</span>
                  </h2>
                </div>
                <Link to="/jobs" className="text-[13px] font-medium text-radar-400 transition-colors hover:text-radar-300">
                  All applications →
                </Link>
              </div>
              <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-ink-750" role="img" aria-label="Applications by status">
                {counts.map(
                  ({ status, count }) =>
                    count > 0 && (
                      <div
                        key={status}
                        className={`${STATUS_META[status].bar} transition-all duration-700`}
                        style={{ width: `${(count / jobs.length) * 100}%` }}
                        title={`${status}: ${count}`}
                      />
                    )
                )}
              </div>
              <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-5">
                {counts.map(({ status, count }) => (
                  <li key={status} className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${STATUS_META[status].dot}`} />
                    <span className="text-[12px] text-fog-400">{status}</span>
                    <span className={`ml-auto font-mono text-[12.5px] font-semibold ${STATUS_META[status].text}`}>{count}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="panel rise rise-1 overflow-hidden" aria-label="Recent applications">
              <div className="flex items-center justify-between border-b border-ink-700/60 px-5 py-4">
                <h2 className="font-display text-[15px] font-semibold text-fog-50">Recent activity</h2>
                <span className="micro">Latest {recent.length}</span>
              </div>
              <ul>
                {recent.map((job) => (
                  <li key={job.id} className="border-b border-ink-700/40 last:border-0">
                    <Link
                      to={`/jobs/${job.id}`}
                      className="group flex items-center gap-3.5 px-5 py-3.5 transition-colors hover:bg-ink-800/60"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-ink-600 bg-ink-750 font-display text-[12px] font-bold text-fog-200">
                        {job.companyName.slice(0, 1).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-medium text-fog-100">{job.jobTitle}</span>
                        <span className="block truncate text-[12px] text-fog-500">
                          {job.companyName} · {job.location}
                        </span>
                      </span>
                      <StatusBadge status={job.status} size="sm" />
                      <span className="hidden w-16 text-right font-mono text-[11px] text-fog-600 sm:block">{timeAgo(job.updatedAt)}</span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-fog-600 transition-transform group-hover:translate-x-0.5 group-hover:text-radar-400" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* right column */}
          <div className="space-y-5 lg:col-span-5">
            <section className="panel rise rise-1 p-5" aria-label="Key numbers">
              <p className="micro mb-3">Telemetry</p>
              <ul className="divide-y divide-ink-700/50">
                {[
                  { label: "Total applications", value: jobs.length, tone: "text-fog-50" },
                  { label: "Active (Applied + Interview)", value: inFlight, tone: "text-beacon-400" },
                  { label: "Interviews", value: counts.find((c) => c.status === "Interview")!.count, tone: "text-signal-400" },
                  { label: "Offers", value: counts.find((c) => c.status === "Offer")!.count, tone: "text-radar-400" },
                  { label: "Rejected", value: counts.find((c) => c.status === "Rejected")!.count, tone: "text-flare-400" },
                ].map((row) => (
                  <li key={row.label} className="flex items-center justify-between py-2.5">
                    <span className="text-[13px] text-fog-400">{row.label}</span>
                    <span className={`font-display text-xl font-bold ${row.tone}`}>{row.value}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="panel rise rise-2 p-5" aria-label="Latest AI analysis">
              <p className="micro mb-3">Latest AI analysis</p>
              {latest && latestJob ? (
                <Link to={`/jobs/${latestJob.id}`} className="group flex items-center gap-4">
                  <span
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border font-display text-lg font-bold ${
                      latest.matchScore >= 75
                        ? "border-radar-500/30 bg-radar-500/10 text-radar-400"
                        : latest.matchScore >= 55
                          ? "border-beacon-500/30 bg-beacon-500/10 text-beacon-400"
                          : "border-signal-500/30 bg-signal-500/10 text-signal-400"
                    }`}
                  >
                    {latest.matchScore}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[13.5px] font-medium text-fog-100 group-hover:text-radar-300">
                      {latestJob.jobTitle} @ {latestJob.companyName}
                    </span>
                    <span className="mt-0.5 block text-[12px] text-fog-500">
                      {latest.matchingSkills.length} matching · {latest.missingSkills.length} missing skills · {timeAgo(latest.createdAt)}
                    </span>
                  </span>
                </Link>
              ) : (
                <div>
                  <p className="text-[13px] leading-relaxed text-fog-400">
                    No analyses yet. Open any application and hit <span className="text-radar-400">Analyze with AI</span> to score it
                    against your resume.
                  </p>
                  <ButtonLink to="/jobs" variant="outline" size="sm" className="mt-3.5">
                    <Radar className="h-3.5 w-3.5" /> Browse applications
                  </ButtonLink>
                </div>
              )}
            </section>

            <section className="panel rise rise-3 p-5" aria-label="Resume status">
              <p className="micro mb-3">Resume status</p>
              {resume ? (
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[13.5px] font-medium text-fog-100">On file · updated {timeAgo(resume.updatedAt)}</p>
                    <p className="mt-0.5 font-mono text-[11.5px] text-fog-500">{resumeSkills} skills detected by the AI</p>
                  </div>
                  <ButtonLink to="/resume" variant="outline" size="sm">
                    <FileText className="h-3.5 w-3.5" /> Edit
                  </ButtonLink>
                </div>
              ) : (                <div>
                  <p className="text-[13px] leading-relaxed text-fog-400">
                    <span className="font-medium text-signal-400">Missing.</span> AI analysis compares each job against your resume —
                    add it to unlock matching scores.
                  </p>
                  <ButtonLink to="/resume" size="sm" className="mt-3.5">
                    Add resume
                  </ButtonLink>
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </>
  );
}
