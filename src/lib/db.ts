/* ------------------------------------------------------------------ */
/* Demo data store.                                                    */
/*                                                                     */
/* In production this layer is replaced by Supabase (Postgres + Auth). */
/* Every service module talks to this store through the same async     */
/* interface the Supabase client uses, so swapping backends means      */
/* changing the service internals only — pages never notice.           */
/* ------------------------------------------------------------------ */

import type { Analysis, InterviewQuestion, InterviewSession, Job, Resume } from "./types";

export interface StoredUser {
  id: string;
  fullName: string;
  email: string;
  passwordHash: string; // demo only — Supabase Auth handles hashing in production
  createdAt: string;
}

export interface DBShape {
  users: StoredUser[];
  jobs: Job[];
  resumes: Resume[];
  analyses: Analysis[];
  sessions: InterviewSession[];
  questions: InterviewQuestion[];
}

const DB_KEY = "careerpilot_db_v1";
const SESSION_KEY = "careerpilot_session_v1";

export const DEMO_EMAIL = "demo@careerpilot.app";
export const DEMO_PASSWORD = "Demo1234!";

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/* Small non-cryptographic hash — good enough to avoid storing plain text in the
   demo; NEVER use this in production (Supabase Auth uses bcrypt). */
export function hashPassword(pw: string): string {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < pw.length; i++) {
    const ch = pw.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(16).padStart(8, "0") + (h1 >>> 0).toString(16).padStart(8, "0");
}

const emptyDB = (): DBShape => ({
  users: [], jobs: [], resumes: [], analyses: [], sessions: [], questions: [],
});

export function readDB(): DBShape {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) return emptyDB();
    const parsed = JSON.parse(raw) as DBShape;
    if (!parsed || !Array.isArray(parsed.users)) return emptyDB();
    return parsed;
  } catch {
    return emptyDB();
  }
}

export function writeDB(db: DBShape): void {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

/* Simulated network latency so loading states behave like a real backend. */
export function latency(min = 240, max = 560): Promise<void> {
  const ms = Math.floor(min + Math.random() * (max - min));
  return new Promise((res) => setTimeout(res, ms));
}

/* ------------------------------ session ------------------------------ */

export function getSessionUserId(): string | null {
  return localStorage.getItem(SESSION_KEY);
}
export function setSession(userId: string): void {
  localStorage.setItem(SESSION_KEY, userId);
}
export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

/* ------------------------------ seed data ----------------------------- */

const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();

export function ensureSeed(): void {
  const db = readDB();
  if (db.users.some((u) => u.email === DEMO_EMAIL)) return;

  const demoId = uid();
  db.users.push({
    id: demoId,
    fullName: "Alex Rivera",
    email: DEMO_EMAIL,
    passwordHash: hashPassword(DEMO_PASSWORD),
    createdAt: daysAgo(34),
  });

  db.resumes.push({
    id: uid(),
    userId: demoId,
    resumeText: [
      "Alex Rivera — Computer Science student, graduating 2026.",
      "",
      "SKILLS: JavaScript (ES6+), HTML, CSS, React, Git, Node.js basics, SQL, REST APIs, responsive design, Figma, teamwork, communication.",
      "",
      "PROJECTS:",
      "• StudyBuddy (React + Node.js): full-stack study planner with authentication, REST API and a PostgreSQL database. Deployed on Vercel.",
      "• Weather Dashboard: responsive web app using the OpenWeather REST API, built with HTML, CSS and JavaScript.",
      "• Portfolio site: accessible, semantic HTML and modern CSS, 95+ Lighthouse score.",
      "",
      "EXPERIENCE:",
      "• Teaching assistant for an intro web development course — mentored 30 students on HTML, CSS and JavaScript basics.",
      "• Freelance landing pages for two local businesses using responsive design and Git version control.",
    ].join("\n"),
    createdAt: daysAgo(30),
    updatedAt: daysAgo(6),
  });

  const jobs: Array<Omit<Job, "id" | "userId">> = [
    {
      companyName: "Northwind Labs",
      jobTitle: "Frontend Developer",
      location: "Berlin · Hybrid",
      status: "Interview",
      jobDescription:
        "We build analytics dashboards used by 400+ companies. You will work with React, TypeScript and Next.js to ship accessible, high-performance UI. Requirements: strong JavaScript, React hooks, HTML and CSS, experience with REST APIs, unit testing with Jest, Git workflows and agile sprints. Bonus: GraphQL, design systems, Docker.",
      createdAt: daysAgo(21),
      updatedAt: daysAgo(2),
    },
    {
      companyName: "Brightpath Studio",
      jobTitle: "Junior Web Developer",
      location: "Remote (EU)",
      status: "Applied",
      jobDescription:
        "Digital agency looking for a junior web developer to build marketing sites and small web apps. Stack: HTML, CSS, JavaScript, WordPress theming, basic PHP, responsive design, SEO fundamentals, Git. You should communicate clearly with designers and clients and manage your time well.",
      createdAt: daysAgo(14),
      updatedAt: daysAgo(9),
    },
    {
      companyName: "Helios Fintech",
      jobTitle: "Software Engineer Intern",
      location: "London · On-site",
      status: "Saved",
      jobDescription:
        "Internship on our payments platform team. You will write Java services with Spring Boot, design SQL schemas in PostgreSQL, write unit tests, review code in Git and join an agile squad. Interest in security, APIs and microservices is a plus. Python or TypeScript experience is welcome.",
      createdAt: daysAgo(8),
      updatedAt: daysAgo(8),
    },
    {
      companyName: "Lumen Health",
      jobTitle: "UI Engineer",
      location: "Amsterdam · Hybrid",
      status: "Offer",
      jobDescription:
        "Join the patient portal team building a design system in React and TypeScript. Strong CSS, accessibility (WCAG), Storybook, testing with Jest and Cypress, and Figma-to-code workflows required. Experience with Node.js services and REST is a plus.",
      createdAt: daysAgo(26),
      updatedAt: daysAgo(1),
    },
    {
      companyName: "Quartz Analytics",
      jobTitle: "Full-Stack Engineer",
      location: "Munich · Hybrid",
      status: "Rejected",
      jobDescription:
        "Full-stack role on our data platform: Node.js and Express microservices, React frontends, PostgreSQL, Redis, Docker, AWS deployment, CI/CD with GitHub Actions, TypeScript across the stack. Looking for 3+ years of professional experience with microservices and cloud infrastructure.",
      createdAt: daysAgo(19),
      updatedAt: daysAgo(5),
    },
  ];

  for (const j of jobs) {
    db.jobs.push({ id: uid(), userId: demoId, ...j });
  }

  writeDB(db);
}

ensureSeed();
