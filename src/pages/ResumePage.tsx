import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { FileText, Save, Sparkles } from "lucide-react";
import { Button, PageHeader, Skeleton, SkillChip } from "../components/ui";
import { useToast } from "../context/ToastContext";
import type { Resume } from "../lib/types";
import * as analysesService from "../services/analyses";
import * as resumeService from "../services/resume";
import { extractSkills } from "../utils/ai";
import { wordCount } from "../utils/format";

export default function ResumePage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [resume, setResume] = useState<Resume | null>(null);
  const [text, setText] = useState("");
  const [analysisCount, setAnalysisCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, analyses] = await Promise.all([resumeService.getResume(), analysesService.latestAnalyses(100)]);
      setResume(r);
      setText(r?.resumeText ?? "");
      setAnalysisCount(analyses.length);
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Unable to load your resume.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const detectedSkills = useMemo(() => extractSkills(text), [text]);
  const dirty = text !== (resume?.resumeText ?? "");

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const saved = await resumeService.saveResume(text);
      setResume(saved);
      toast("success", "Resume saved. Future analyses will use this version.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unable to save the resume. Please try again.";
      setError(msg);
      toast("error", msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        kicker="Pilot profile"
        title="Resume"
        desc="Plain text is enough — paste your resume once and every AI analysis compares job postings against it."
      />

      {loading ? (
        <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-[1fr_340px]">
          <form onSubmit={handleSave} className="panel rise p-5 sm:p-6" noValidate>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="micro">Resume text</p>
              <p className="font-mono text-[11px] text-fog-500">
                {wordCount(text)} words · {text.length} chars
                {resume && <span className="ml-3 text-fog-600">updated {new Date(resume.updatedAt).toLocaleDateString()}</span>}
              </p>
            </div>
            <textarea
              className="field min-h-[380px] font-[450] leading-[1.7]"
              placeholder={"Paste your resume as plain text…\n\nExample structure:\nSKILLS: JavaScript, React, SQL, Git…\nPROJECTS: …\nEXPERIENCE: …\nEDUCATION: …"}
              value={text}
              onChange={(e) => setText(e.target.value)}
              aria-label="Resume text"
              aria-invalid={!!error}
            />
            {error && <p className="mt-2 text-[12.5px] text-flare-400">{error}</p>}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-ink-700/60 pt-4">
              <p className="text-[12px] text-fog-500">
                {dirty ? "Unsaved changes" : "All changes saved"}
                {analysisCount > 0 && <span className="ml-3 font-mono text-[11px] text-fog-600">used in {analysisCount} analyses</span>}
              </p>
              <Button type="submit" loading={saving} disabled={!dirty}>
                <Save className="h-4 w-4" /> Save resume
              </Button>
            </div>
          </form>

          <div className="space-y-5">
            <section className="panel rise rise-1 p-5" aria-label="Skills the AI can see">
              <p className="micro mb-3">
                Skill scan · {detectedSkills.length} detected
              </p>
              {detectedSkills.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {detectedSkills.map((s) => (
                    <SkillChip key={s.name} name={s.name} />
                  ))}
                </div>
              ) : (
                <p className="text-[13px] leading-relaxed text-fog-400">
                  Start typing — the engine reads your resume live and lists the skills it can match against job postings.
                </p>
              )}
              <p className="mt-3 border-t border-ink-700/60 pt-3 font-mono text-[10.5px] leading-relaxed text-fog-600">
                Skills not listed here can't count toward your match score — name them explicitly.
              </p>
            </section>

            <section className="panel rise rise-2 p-5" aria-label="Tips">
              <p className="micro mb-3">
                <FileText className="mr-1.5 inline h-3.5 w-3.5" /> Writing tips
              </p>
              <ul className="space-y-2.5">
                {[
                  "List skills by their common names — “React”, “PostgreSQL”, “Git” — exactly as job posts spell them.",
                  "Add a project bullet per major skill; the recommendations engine leans on visible evidence.",
                  "Include soft skills (communication, teamwork) — many junior postings screen for them.",
                  "No PDF parsing needed in v1: keep a plain-text master resume and paste it here.",
                ].map((tip, i) => (
                  <li key={i} className="flex gap-2.5 text-[13px] leading-relaxed text-fog-300">
                    <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-radar-500" />
                    {tip}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      )}
    </>
  );
}
