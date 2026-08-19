/* Job CRUD service — always scoped to the authenticated user,
   mirroring the Row Level Security policies in the real database. */

import { getSessionUserId, latency, readDB, uid, writeDB } from "../lib/db";
import type { Job, Status } from "../lib/types";
import { STATUSES } from "../lib/types";
import { validateJob } from "../utils/validation";

function requireUser(): string {
  const userId = getSessionUserId();
  if (!userId) throw new Error("You are not logged in.");
  return userId;
}

export interface JobInput {
  companyName: string;
  jobTitle: string;
  location: string;
  jobDescription: string;
  status: Status;
}

export async function listJobs(): Promise<Job[]> {
  const userId = requireUser();
  await latency();
  return readDB()
    .jobs.filter((j) => j.userId === userId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getJob(id: string): Promise<Job> {
  const userId = requireUser();
  await latency(180, 420);
  const job = readDB().jobs.find((j) => j.id === id && j.userId === userId);
  if (!job) throw new Error("This application does not exist or belongs to another account.");
  return job;
}

export async function createJob(input: JobInput): Promise<Job> {
  const userId = requireUser();
  const errors = validateJob(input);
  if (Object.keys(errors).length > 0) throw new Error(Object.values(errors)[0]);
  await latency(320, 640);
  const now = new Date().toISOString();
  const job: Job = {
    id: uid(),
    userId,
    companyName: input.companyName.trim(),
    jobTitle: input.jobTitle.trim(),
    location: input.location.trim() || "—",
    jobDescription: input.jobDescription.trim(),
    status: STATUSES.includes(input.status) ? input.status : "Saved",
    createdAt: now,
    updatedAt: now,
  };
  const db = readDB();
  db.jobs.push(job);
  writeDB(db);
  return job;
}

export async function updateJob(id: string, patch: Partial<JobInput>): Promise<Job> {
  const userId = requireUser();
  await latency(300, 600);
  const db = readDB();
  const job = db.jobs.find((j) => j.id === id && j.userId === userId);
  if (!job) throw new Error("This application does not exist or belongs to another account.");
  if (patch.companyName !== undefined) {
    if (!patch.companyName.trim()) throw new Error("Company name is required.");
    job.companyName = patch.companyName.trim();
  }
  if (patch.jobTitle !== undefined) {
    if (!patch.jobTitle.trim()) throw new Error("Job title is required.");
    job.jobTitle = patch.jobTitle.trim();
  }
  if (patch.location !== undefined) job.location = patch.location.trim() || "—";
  if (patch.jobDescription !== undefined) job.jobDescription = patch.jobDescription.trim();
  if (patch.status !== undefined && STATUSES.includes(patch.status)) job.status = patch.status;
  job.updatedAt = new Date().toISOString();
  writeDB(db);
  return job;
}

export async function deleteJob(id: string): Promise<void> {
  const userId = requireUser();
  await latency(320, 640);
  const db = readDB();
  const job = db.jobs.find((j) => j.id === id && j.userId === userId);
  if (!job) throw new Error("This application does not exist or belongs to another account.");
  db.jobs = db.jobs.filter((j) => j.id !== id);
  db.analyses = db.analyses.filter((a) => a.jobId !== id);
  const sessionIds = new Set(db.sessions.filter((s) => s.jobId === id).map((s) => s.id));
  db.sessions = db.sessions.filter((s) => s.jobId !== id);
  db.questions = db.questions.filter((q) => !sessionIds.has(q.sessionId));
  writeDB(db);
}
