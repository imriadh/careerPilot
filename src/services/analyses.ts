/* Stores validated AI analysis results (ai_analyses table). */

import { getSessionUserId, latency, readDB, uid, writeDB } from "../lib/db";
import type { Analysis, AnalysisPayload } from "../lib/types";
import { isAnalysisPayload } from "../utils/ai";

function requireUser(): string {
  const userId = getSessionUserId();
  if (!userId) throw new Error("You are not logged in.");
  return userId;
}

export async function listAnalysesForJob(jobId: string): Promise<Analysis[]> {
  const userId = requireUser();
  await latency(160, 360);
  return readDB()
    .analyses.filter((a) => a.userId === userId && a.jobId === jobId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function latestAnalyses(limit = 3): Promise<Analysis[]> {
  const userId = requireUser();
  await latency(160, 360);
  return readDB()
    .analyses.filter((a) => a.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

/* Only persist payloads that pass validation — the frontend never
   trusts raw AI output, exactly like the Edge Function. */
export async function createAnalysis(jobId: string, payload: AnalysisPayload): Promise<Analysis> {
  const userId = requireUser();
  if (!isAnalysisPayload(payload)) throw new Error("The AI returned an invalid analysis payload.");
  await latency(220, 480);
  const row: Analysis = {
    id: uid(),
    userId,
    jobId,
    matchScore: Math.round(payload.matchScore),
    matchingSkills: payload.matchingSkills,
    missingSkills: payload.missingSkills,
    recommendations: payload.recommendations,
    createdAt: new Date().toISOString(),
  };
  const db = readDB();
  db.analyses.push(row);
  writeDB(db);
  return row;
}
