import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { Button, Field, Input, PageHeader, Select, Skeleton, Textarea } from "../components/ui";
import { useToast } from "../context/ToastContext";
import type { Status } from "../lib/types";
import { STATUSES } from "../lib/types";
import * as jobsService from "../services/jobs";
import { validateJob } from "../utils/validation";
import type { FormErrors } from "../utils/validation";

export default function JobEditor() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState<Status>("Saved");
  const [jobDescription, setJobDescription] = useState("");

  const [errors, setErrors] = useState<FormErrors<"companyName" | "jobTitle" | "jobDescription">>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pageLoading, setPageLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit || !id) return;
    let cancelled = false;
    jobsService
      .getJob(id)
      .then((job) => {
        if (cancelled) return;
        setCompanyName(job.companyName);
        setJobTitle(job.jobTitle);
        setLocation(job.location === "—" ? "" : job.location);
        setStatus(job.status);
        setJobDescription(job.jobDescription);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Unable to load this application.");
      })
      .finally(() => {
        if (!cancelled) setPageLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, isEdit]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const nextErrors = validateJob({ companyName, jobTitle, jobDescription });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setSaving(true);
    try {
      const input = { companyName, jobTitle, location, jobDescription, status };
      const saved = isEdit && id ? await jobsService.updateJob(id, input) : await jobsService.createJob(input);
      toast("success", isEdit ? "Application updated." : "Application logged. Ready for AI analysis.");
      navigate(`/jobs/${saved.id}`, { replace: true });
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Unable to save the application. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loadError) {
    return (
      <div className="panel mx-auto max-w-lg p-8 text-center">
        <p className="micro mb-2 !text-flare-400">Not found</p>
        <p className="text-sm text-fog-300">{loadError}</p>
        <Button variant="outline" className="mt-5" onClick={() => navigate("/jobs")}>
          Back to applications
        </Button>
      </div>
    );
  }

  return (
    <>
      <Link to={isEdit ? `/jobs/${id}` : "/jobs"} className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-fog-400 transition-colors hover:text-radar-400">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <PageHeader
        kicker={isEdit ? "Amend flight plan" : "New entry"}
        title={isEdit ? "Edit application" : "Log a job application"}
        desc="Paste the full job description — the richer it is, the more accurate the AI match analysis becomes."
      />

      {pageLoading ? (
        <div className="panel max-w-2xl space-y-4 p-6">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="panel rise max-w-2xl space-y-5 p-6" noValidate>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Company name" error={errors.companyName} required>
              <Input
                placeholder="Northwind Labs"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                aria-invalid={!!errors.companyName}
              />
            </Field>
            <Field label="Job title" error={errors.jobTitle} required>
              <Input
                placeholder="Frontend Developer"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                aria-invalid={!!errors.jobTitle}
              />
            </Field>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Location" hint="optional">
              <Input placeholder="Berlin · Hybrid" value={location} onChange={(e) => setLocation(e.target.value)} />
            </Field>
            <Field label="Status">
              <Select value={status} onChange={(e) => setStatus(e.target.value as Status)} aria-label="Application status">
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field
            label="Job description"
            error={errors.jobDescription}
            hint={`${jobDescription.trim().length} chars`}
            required
          >
            <Textarea
              rows={9}
              placeholder="Paste the full posting here, including the requirements section…"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              aria-invalid={!!errors.jobDescription}
            />
          </Field>
          <div className="flex items-center justify-end gap-2.5 border-t border-ink-700/60 pt-5">
            <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              <Save className="h-4 w-4" /> {isEdit ? "Save changes" : "Log application"}
            </Button>
          </div>
        </form>
      )}
    </>
  );
}
