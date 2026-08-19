/* Interview sessions + questions (interview_sessions / interview_questions). */

import { getSessionUserId, latency, readDB, uid, writeDB } from "../lib/db";
import type { EvaluationPayload, InterviewQuestion, InterviewSession, Job, QuestionPayload } from "../lib/types";

function requireUser(): string {
  const userId = getSessionUserId();
  if (!userId) throw new Error("You are not logged in.");
  return userId;
}

export interface SessionWithDetails {
  session: InterviewSession;
  job: Job;
  questions: InterviewQuestion[];
}

export async function createSession(jobId: string, questions: QuestionPayload[]): Promise<SessionWithDetails> {
  const userId = requireUser();
  if (questions.length === 0) throw new Error("The AI did not generate any questions. Check the job description.");
  await latency(260, 500);
  const db = readDB();
  const job = db.jobs.find((j) => j.id === jobId && j.userId === userId);
  if (!job) throw new Error("Job not found.");
  const now = new Date().toISOString();
  const session: InterviewSession = { id: uid(), userId, jobId, createdAt: now };
  db.sessions.push(session);
  for (const q of questions) {
    db.questions.push({
      id: uid(),
      sessionId: session.id,
      question: q.question,
      category: q.category,
      difficulty: q.difficulty,
      answer: null,
      score: null,
      strengths: null,
      weaknesses: null,
      suggestions: null,
      feedback: null,
      createdAt: now,
    });
  }
  writeDB(db);
  return { session, job, questions: db.questions.filter((q) => q.sessionId === session.id) };
}

export async function getSessionWithQuestions(sessionId: string): Promise<SessionWithDetails> {
  const userId = requireUser();
  await latency(220, 460);
  const db = readDB();
  const session = db.sessions.find((s) => s.id === sessionId && s.userId === userId);
  if (!session) throw new Error("Interview session not found.");
  const job = db.jobs.find((j) => j.id === session.jobId && j.userId === userId);
  if (!job) throw new Error("The job linked to this session no longer exists.");
  const questions = db.questions.filter((q) => q.sessionId === session.id);
  return { session, job, questions };
}

export interface SessionSummary {
  session: InterviewSession;
  job: Job | null;
  questionCount: number;
  answeredCount: number;
  avgScore: number | null;
}

export async function listSessions(): Promise<SessionSummary[]> {
  const userId = requireUser();
  await latency(200, 440);
  const db = readDB();
  return db.sessions
    .filter((s) => s.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((session) => {
      const questions = db.questions.filter((q) => q.sessionId === session.id);
      const scored = questions.filter((q) => q.score !== null);
      const avg = scored.length ? scored.reduce((sum, q) => sum + (q.score ?? 0), 0) / scored.length : null;
      return {
        session,
        job: db.jobs.find((j) => j.id === session.jobId) ?? null,
        questionCount: questions.length,
        answeredCount: scored.length,
        avgScore: avg === null ? null : Math.round(avg * 10) / 10,
      };
    });
}

export async function saveEvaluation(questionId: string, answerText: string, evaluation: EvaluationPayload): Promise<InterviewQuestion> {
  requireUser();
  await latency(220, 460);
  const db = readDB();
  const question = db.questions.find((q) => q.id === questionId);
  if (!question) throw new Error("Question not found.");
  question.answer = answerText.trim();
  question.score = evaluation.score;
  question.strengths = evaluation.strengths;
  question.weaknesses = evaluation.weaknesses;
  question.suggestions = evaluation.suggestions;
  question.feedback = evaluation.feedback;
  writeDB(db);
  return question;
}
