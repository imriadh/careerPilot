import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Briefcase, ChevronRight, MapPin, Plus, Search } from "lucide-react";
import { ButtonLink, EmptyState, PageHeader, Skeleton, StatusBadge } from "../components/ui";
import type { Job, Status } from "../lib/types";
import { STATUSES } from "../lib/types";
import * as jobsService from "../services/jobs";
import { timeAgo } from "../utils/format";

type Filter = "All" | Status;

export default function Jobs() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filter, setFilter] = useState<Filter>("All");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setJobs(await jobsService.listJobs());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load applications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jobs.filter((job) => {
      if (filter !== "All" && job.status !== filter) return false;
      if (!q) return true;
      return `${job.companyName} ${job.jobTitle} ${job.location}`.toLowerCase().includes(q);
    });
  }, [jobs, filter, query]);

  const countFor = (f: Filter) => (f === "All" ? jobs.length : jobs.filter((j) => j.status === f).length);

  if (error) {
    return (
      <div className="panel mx-auto max-w-lg p-8 text-center">
        <p className="micro mb-2 !text-flare-400">Request failed</p>
        <p className="text-sm text-fog-300">{error}</p>
        <ButtonLink to="/" variant="ghost" size="sm" className="mt-4">
          ← Back to dashboard
        </ButtonLink>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        kicker="Flight log"
        title="Applications"
        desc="Every role you are tracking, in one log. Open an application to analyze it with AI or start interview prep."
        actions={
          <ButtonLink to="/jobs/new">
            <Plus className="h-4 w-4" /> New application
          </ButtonLink>
        }
      />

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full max-w-sm" />
          <Skeleton className="h-12 w-full" />
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-[74px] w-full" />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <EmptyState
          icon={<Briefcase className="h-6 w-6" />}
          title="No applications yet"
          body="Add a job posting you found — the AI will tell you how closely it matches your resume and what to fix before applying."
          action={
            <ButtonLink to="/jobs/new">
              <Plus className="h-4 w-4" /> Log your first application
            </ButtonLink>
          }
        />
      ) : (
        <>
          {/* toolbar */}
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-xs">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fog-600" />
              <input
                className="field pl-10"
                placeholder="Search company, title, location…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search applications"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(["All", ...STATUSES] as Filter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-all ${
                    filter === f
                      ? "border-radar-500/40 bg-radar-500/12 text-radar-300"
                      : "border-ink-600 bg-ink-800/50 text-fog-400 hover:border-ink-500 hover:text-fog-200"
                  }`}
                >
                  {f} <span className="ml-1 font-mono text-[10.5px] opacity-70">{countFor(f)}</span>
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="panel p-8 text-center">
              <p className="text-sm text-fog-400">
                Nothing matches {query ? `"${query}"` : `the ${filter} filter`}.
              </p>
              <button
                onClick={() => {
                  setQuery("");
                  setFilter("All");
                }}
                className="mt-3 text-[13px] font-medium text-radar-400 hover:text-radar-300"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filtered.map((job, i) => (
                <Link
                  key={job.id}
                  to={`/jobs/${job.id}`}
                  className={`panel panel-hover rise rise-${Math.min(i, 4)} group flex items-center gap-4 px-4 py-4 sm:px-5`}
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-ink-600 bg-ink-750 font-display text-[15px] font-bold text-fog-200">
                    {job.companyName.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                      <span className="text-[14.5px] font-semibold text-fog-50 transition-colors group-hover:text-radar-300">
                        {job.jobTitle}
                      </span>
                      <StatusBadge status={job.status} size="sm" />
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12.5px] text-fog-500">
                      <span className="font-medium text-fog-300">{job.companyName}</span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" /> {job.location}
                      </span>
                      <span className="hidden font-mono text-[11px] text-fog-600 sm:inline">upd {timeAgo(job.updatedAt)}</span>
                    </span>
                  </span>
                  <ChevronRight className="h-4.5 w-4.5 shrink-0 text-fog-600 transition-transform group-hover:translate-x-0.5 group-hover:text-radar-400" />
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
