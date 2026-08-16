/* ------------------------------------------------------------------ */
/* Auth service.                                                       */
/* Demo mode: credential check against the local store. Production:    */
/* swap the bodies for supabase.auth.signInWithPassword / signUp /     */
/* signOut — the signatures stay identical, so pages never change.     */
/* ------------------------------------------------------------------ */

import { clearSession, DEMO_EMAIL, DEMO_PASSWORD, getSessionUserId, hashPassword, latency, readDB, setSession, uid, writeDB } from "../lib/db";
import type { SessionUser } from "../lib/types";
import { isEmail } from "../utils/validation";

function toSessionUser(row: { id: string; fullName: string; email: string; createdAt: string }): SessionUser {
  return { id: row.id, fullName: row.fullName, email: row.email, createdAt: row.createdAt };
}

export async function getSession(): Promise<SessionUser | null> {
  await latency(150, 300);
  const userId = getSessionUserId();
  if (!userId) return null;
  const user = readDB().users.find((u) => u.id === userId);
  return user ? toSessionUser(user) : null;
}

export async function register(fullName: string, email: string, password: string): Promise<SessionUser> {
  await latency();
  const normalized = email.trim().toLowerCase();
  if (!isEmail(normalized)) throw new Error("Enter a valid email address.");
  const db = readDB();
  if (db.users.some((u) => u.email === normalized)) {
    throw new Error("An account with this email already exists. Try logging in instead.");
  }
  const user = {
    id: uid(),
    fullName: fullName.trim(),
    email: normalized,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  };
  db.users.push(user);
  writeDB(db);
  setSession(user.id);
  return toSessionUser(user);
}

export async function login(email: string, password: string): Promise<SessionUser> {
  await latency();
  const normalized = email.trim().toLowerCase();
  const db = readDB();
  const user = db.users.find((u) => u.email === normalized);
  if (!user || user.passwordHash !== hashPassword(password)) {
    throw new Error("Invalid email or password.");
  }
  setSession(user.id);
  return toSessionUser(user);
}

export async function loginDemo(): Promise<SessionUser> {
  return login(DEMO_EMAIL, DEMO_PASSWORD);
}

export async function logout(): Promise<void> {
  await latency(120, 240);
  clearSession();
}

export async function updateFullName(userId: string, fullName: string): Promise<SessionUser> {
  await latency();
  if (fullName.trim().length < 2) throw new Error("Name is too short.");
  const db = readDB();
  const user = db.users.find((u) => u.id === userId);
  if (!user) throw new Error("Account not found.");
  user.fullName = fullName.trim();
  writeDB(db);
  return toSessionUser(user);
}

/* Remove the account and every row it owns (what ON DELETE CASCADE does in Postgres). */
export async function deleteAccount(userId: string): Promise<void> {
  await latency(400, 700);
  const db = readDB();
  db.users = db.users.filter((u) => u.id !== userId);
  db.jobs = db.jobs.filter((r) => r.userId !== userId);
  db.resumes = db.resumes.filter((r) => r.userId !== userId);
  db.analyses = db.analyses.filter((r) => r.userId !== userId);
  const sessionIds = new Set(db.sessions.filter((s) => s.userId === userId).map((s) => s.id));
  db.sessions = db.sessions.filter((s) => s.userId !== userId);
  db.questions = db.questions.filter((q) => !sessionIds.has(q.sessionId));
  writeDB(db);
  clearSession();
}

export function exportAll(userId: string): object {
  const db = readDB();
  const user = db.users.find((u) => u.id === userId);
  const sessions = db.sessions.filter((s) => s.userId === userId);
  const sessionIds = new Set(sessions.map((s) => s.id));
  return {
    exportedAt: new Date().toISOString(),
    profile: user ? toSessionUser(user) : null,
    jobs: db.jobs.filter((r) => r.userId === userId),
    resume: db.resumes.find((r) => r.userId === userId) ?? null,
    analyses: db.analyses.filter((r) => r.userId === userId),
    interviewSessions: sessions,
    interviewQuestions: db.questions.filter((q) => sessionIds.has(q.sessionId)),
  };
}
