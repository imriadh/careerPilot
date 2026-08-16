/* ------------------------------------------------------------------ */
/* Shared domain types + status metadata.                              */
/* These mirror the PostgreSQL schema in supabase/migrations.          */
/* ------------------------------------------------------------------ */

export type Status = "Saved" | "Applied" | "Interview" | "Offer" | "Rejected";

export const STATUSES: Status[] = ["Saved", "Applied", "Interview", "Offer", "Rejected"];

export interface SessionUser {
  id: string;
  fullName: string;
  email: string;
  createdAt: string;
}

export interface Job {
  id: string;
  userId: string;
  companyName: string;
  jobTitle: string;
  location: string;
  jobDescription: string;
  status: Status;
  createdAt: string;
  updatedAt: string;
}

export interface Resume {
  id: string;
  userId: string;
  resumeText: string;
  createdAt: string;
  updatedAt: string;
}

/* Payload shape returned by the AI (Edge Function in prod, on-device engine in demo). */
export interface AnalysisPayload {
  matchScore: number;
  matchingSkills: string[];
  missingSkills: string[];
  recommendations: string[];
}

export interface Analysis extends AnalysisPayload {
  id: string;
  userId: string;
  jobId: string;
  createdAt: string;
}

export type Difficulty = "Easy" | "Medium" | "Hard";

export interface InterviewSession {
  id: string;
  userId: string;
  jobId: string;
  createdAt: string;
}

export interface InterviewQuestion {
  id: string;
  sessionId: string;
  question: string;
  category: string;
  difficulty: Difficulty;
  answer: string | null;
  score: number | null;
  strengths: string[] | null;
  weaknesses: string[] | null;
  suggestions: string[] | null;
  feedback: string | null;
  createdAt: string;
}

export interface QuestionPayload {
  question: string;
  category: string;
  difficulty: Difficulty;
}

export interface EvaluationPayload {
  score: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  feedback: string;
}

/* ----------------------------- status meta ----------------------------- */

export interface StatusMeta {
  label: Status;
  dot: string;      /* dot color class */
  badge: string;    /* pill classes */
  bar: string;      /* stacked-bar segment color */
  text: string;     /* plain text color */
}

export const STATUS_META: Record<Status, StatusMeta> = {
  Saved: {
    label: "Saved",
    dot: "bg-fog-500",
    badge: "bg-fog-500/10 text-fog-300 border-fog-500/30",
    bar: "bg-fog-500",
    text: "text-fog-300",
  },
  Applied: {
    label: "Applied",
    dot: "bg-beacon-500",
    badge: "bg-beacon-500/10 text-beacon-400 border-beacon-500/30",
    bar: "bg-beacon-500",
    text: "text-beacon-400",
  },
  Interview: {
    label: "Interview",
    dot: "bg-signal-500",
    badge: "bg-signal-500/10 text-signal-400 border-signal-500/30",
    bar: "bg-signal-500",
    text: "text-signal-400",
  },
  Offer: {
    label: "Offer",
    dot: "bg-radar-500",
    badge: "bg-radar-500/10 text-radar-400 border-radar-500/30",
    bar: "bg-radar-500",
    text: "text-radar-400",
  },
  Rejected: {
    label: "Rejected",
    dot: "bg-flare-500",
    badge: "bg-flare-500/10 text-flare-400 border-flare-500/30",
    bar: "bg-flare-500",
    text: "text-flare-400",
  },
};
