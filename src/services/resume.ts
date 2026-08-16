/* Resume service — one row per user (unique user_id in Postgres). */

import { getSessionUserId, latency, readDB, uid, writeDB } from "../lib/db";
import type { Resume } from "../lib/types";
import { validateResume } from "../utils/validation";

function requireUser(): string {
  const userId = getSessionUserId();
  if (!userId) throw new Error("You are not logged in.");
  return userId;
}

export async function getResume(): Promise<Resume | null> {
  const userId = requireUser();
  await latency(180, 400);
  return readDB().resumes.find((r) => r.userId === userId) ?? null;
}

export async function saveResume(resumeText: string): Promise<Resume> {
  const userId = requireUser();
  const errors = validateResume(resumeText);
  if (Object.keys(errors).length > 0) throw new Error(Object.values(errors)[0]);
  await latency(320, 640);
  const db = readDB();
  const now = new Date().toISOString();
  const existing = db.resumes.find((r) => r.userId === userId);
  if (existing) {
    existing.resumeText = resumeText.trim();
    existing.updatedAt = now;
    writeDB(db);
    return existing;
  }
  const created: Resume = { id: uid(), userId, resumeText: resumeText.trim(), createdAt: now, updatedAt: now };
  db.resumes.push(created);
  writeDB(db);
  return created;
}
