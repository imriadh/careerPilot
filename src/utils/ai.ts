/* ------------------------------------------------------------------ */
/* On-device AI engine (demo mode).                                    */
/*                                                                     */
/* In production these three operations run inside Supabase Edge       */
/* Functions that call the NVIDIA NIM API — see                        */
/* supabase/functions/ai-analysis and ai-interview. This module        */
/* implements the SAME contracts locally so the full product works     */
/* without a server: it extracts skills with a taxonomy, scores the    */
/* resume ↔ job overlap, generates interview questions from a bank,    */
/* and evaluates answers with transparent heuristics.                  */
/* ------------------------------------------------------------------ */

import type { AnalysisPayload, EvaluationPayload, QuestionPayload } from "../lib/types";

export interface Skill {
  name: string;
  cat: string;
  al: string[]; // aliases
}

export const SKILL_TAXONOMY: Skill[] = [
  // Frontend
  { name: "React", cat: "Frontend", al: ["react", "reactjs", "react.js"] },
  { name: "JavaScript", cat: "Frontend", al: ["javascript", "js", "es6", "ecmascript"] },
  { name: "TypeScript", cat: "Frontend", al: ["typescript", "ts"] },
  { name: "HTML", cat: "Frontend", al: ["html", "html5"] },
  { name: "CSS", cat: "Frontend", al: ["css", "css3"] },
  { name: "Next.js", cat: "Frontend", al: ["next.js", "nextjs", "next js"] },
  { name: "Vue", cat: "Frontend", al: ["vue", "vuejs", "vue.js"] },
  { name: "Angular", cat: "Frontend", al: ["angular"] },
  { name: "Svelte", cat: "Frontend", al: ["svelte"] },
  { name: "Tailwind", cat: "Frontend", al: ["tailwind", "tailwindcss", "tailwind css"] },
  { name: "Redux", cat: "Frontend", al: ["redux", "zustand"] },
  { name: "Accessibility", cat: "Frontend", al: ["accessibility", "a11y", "wcag", "aria"] },
  { name: "Responsive Design", cat: "Frontend", al: ["responsive design", "responsive", "mobile-first"] },
  { name: "Jest", cat: "Frontend", al: ["jest", "unit testing", "unit tests", "testing library"] },
  { name: "Cypress", cat: "Frontend", al: ["cypress", "playwright", "e2e testing"] },
  { name: "Vite", cat: "Frontend", al: ["vite", "webpack", "bundlers"] },
  { name: "Web Performance", cat: "Frontend", al: ["performance", "lighthouse", "web vitals", "optimization"] },
  { name: "Storybook", cat: "Frontend", al: ["storybook", "design system", "design systems", "component library"] },
  // Backend
  { name: "Node.js", cat: "Backend", al: ["node.js", "node", "nodejs"] },
  { name: "Express", cat: "Backend", al: ["express", "expressjs", "express.js"] },
  { name: "REST APIs", cat: "Backend", al: ["rest", "rest api", "rest apis", "restful", "api", "apis"] },
  { name: "GraphQL", cat: "Backend", al: ["graphql", "apollo"] },
  { name: "Python", cat: "Backend", al: ["python"] },
  { name: "Django", cat: "Backend", al: ["django", "flask", "fastapi"] },
  { name: "Java", cat: "Backend", al: ["java"] },
  { name: "Spring", cat: "Backend", al: ["spring", "spring boot"] },
  { name: "C#", cat: "Backend", al: ["c#", ".net", "dotnet", "asp.net"] },
  { name: "PHP", cat: "Backend", al: ["php", "laravel", "wordpress"] },
  { name: "Go", cat: "Backend", al: ["golang"] },
  { name: "Authentication", cat: "Backend", al: ["authentication", "auth", "oauth", "jwt", "login"] },
  { name: "Microservices", cat: "Backend", al: ["microservices", "micro-service"] },
  { name: "WebSockets", cat: "Backend", al: ["websocket", "websockets", "real-time", "realtime"] },
  // Data
  { name: "SQL", cat: "Data", al: ["sql"] },
  { name: "PostgreSQL", cat: "Data", al: ["postgresql", "postgres"] },
  { name: "MySQL", cat: "Data", al: ["mysql", "mariadb"] },
  { name: "MongoDB", cat: "Data", al: ["mongodb", "mongo", "nosql"] },
  { name: "Redis", cat: "Data", al: ["redis", "caching"] },
  { name: "Prisma", cat: "Data", al: ["prisma", "orm", "sequelize"] },
  { name: "Supabase", cat: "Data", al: ["supabase", "firebase"] },
  { name: "Data Analysis", cat: "Data", al: ["data analysis", "analytics", "pandas", "numpy", "excel"] },
  { name: "Machine Learning", cat: "Data", al: ["machine learning", "ml", "scikit", "ai"] },
  { name: "Visualization", cat: "Data", al: ["tableau", "power bi", "d3", "data visualization", "dashboards"] },
  // DevOps & Cloud
  { name: "Git", cat: "DevOps", al: ["git", "github", "gitlab", "version control"] },
  { name: "Docker", cat: "DevOps", al: ["docker", "containers"] },
  { name: "Kubernetes", cat: "DevOps", al: ["kubernetes", "k8s"] },
  { name: "AWS", cat: "DevOps", al: ["aws", "amazon web services", "ec2", "s3", "lambda"] },
  { name: "Azure", cat: "DevOps", al: ["azure"] },
  { name: "GCP", cat: "DevOps", al: ["google cloud", "gcp"] },
  { name: "CI/CD", cat: "DevOps", al: ["ci/cd", "ci cd", "continuous integration", "jenkins", "github actions", "cicd"] },
  { name: "Linux", cat: "DevOps", al: ["linux", "bash", "shell scripting"] },
  { name: "Agile", cat: "DevOps", al: ["agile", "scrum", "kanban", "jira", "sprints"] },
  // Mobile & Design
  { name: "React Native", cat: "Mobile", al: ["react native"] },
  { name: "Flutter", cat: "Mobile", al: ["flutter", "dart"] },
  { name: "Swift", cat: "Mobile", al: ["swift", "ios"] },
  { name: "Kotlin", cat: "Mobile", al: ["kotlin", "android"] },
  { name: "Figma", cat: "Design", al: ["figma"] },
  { name: "UI Design", cat: "Design", al: ["ui", "ui design", "visual design"] },
  { name: "UX Research", cat: "Design", al: ["ux", "ux research", "user research", "wireframes", "prototyping", "usability"] },
  // Working style
  { name: "Communication", cat: "Soft skills", al: ["communication", "communicate", "presentation"] },
  { name: "Teamwork", cat: "Soft skills", al: ["teamwork", "collaboration", "cross-functional", "team player"] },
  { name: "Problem Solving", cat: "Soft skills", al: ["problem solving", "problem-solving", "analytical", "troubleshooting"] },
  { name: "Leadership", cat: "Soft skills", al: ["leadership", "mentoring", "led", "leading"] },
  { name: "Time Management", cat: "Soft skills", al: ["time management", "prioritization", "deadline", "deadlines"] },
  { name: "SEO", cat: "Marketing", al: ["seo", "search engine optimization"] },
  { name: "Security", cat: "Backend", al: ["security", "owasp", "encryption", "secure"] },
];

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export interface DetectedSkill extends Skill {
  pos: number;
}

/* Extract recognizable skills from free text, ordered by first appearance. */
export function extractSkills(text: string): DetectedSkill[] {
  const found: DetectedSkill[] = [];
  const seen = new Set<string>();
  for (const skill of SKILL_TAXONOMY) {
    for (const alias of skill.al) {
      const re = new RegExp(`(?<![a-z0-9])${escapeRe(alias.toLowerCase())}(?![a-z0-9])`, "i");
      const m = text.toLowerCase().match(re);
      if (m && !seen.has(skill.name)) {
        seen.add(skill.name);
        found.push({ ...skill, pos: m.index ?? Number.MAX_SAFE_INTEGER });
        break;
      }
    }
  }
  return found.sort((a, b) => a.pos - b.pos);
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/* ------------------------- 1. JOB MATCH ANALYSIS ------------------------- */

export function analyzeMatch(resumeText: string, jobTitle: string, jobDescription: string): AnalysisPayload {
  if (!resumeText.trim()) throw new Error("Resume is empty — add your resume before running an analysis.");
  if (!jobDescription.trim()) throw new Error("Job description is empty — nothing to compare against.");

  const jobSkills = extractSkills(`${jobTitle}\n${jobDescription}`);
  const resumeSkills = extractSkills(resumeText);
  const resumeNames = new Set(resumeSkills.map((s) => s.name));

  const matchingSkills = jobSkills.filter((s) => resumeNames.has(s.name)).map((s) => s.name);
  const missingSkills = jobSkills.filter((s) => !resumeNames.has(s.name)).map((s) => s.name);

  if (jobSkills.length === 0) {
    return {
      matchScore: 0,
      matchingSkills: [],
      missingSkills: [],
      recommendations: [
        "The job description contains too few recognizable skills for a reliable comparison. Paste the full posting, including the requirements section.",
        "If the posting is vague, list concrete technologies yourself and re-run the analysis.",
      ],
    };
  }

  const coverage = matchingSkills.length / jobSkills.length;
  const matchScore = clamp(Math.round(18 + 74 * coverage + Math.min(matchingSkills.length, 6)), 4, 97);

  const recommendations: string[] = [];
  if (matchingSkills.length > 0) {
    recommendations.push(
      `Lead your resume with ${matchingSkills.slice(0, 3).join(", ")} — they align directly with this role.`
    );
  }
  const gapTemplates = [
    (s: string) => `Address the ${s} gap: the posting lists it explicitly but it never appears in your resume.`,
    (s: string) => `A small weekend project or certificate demonstrating ${s} would close the most visible gap.`,
    (s: string) => `If you have any ${s} exposure — coursework, tutorials, side work — make it visible in your skills section.`,
  ];
  missingSkills.slice(0, 3).forEach((s, i) => recommendations.push(gapTemplates[i % gapTemplates.length]!(s)));
  recommendations.push("Mirror the posting's language: reuse the exact skill names and keywords in your resume bullets.");
  if (matchScore >= 70) {
    recommendations.push("This is a strong match — tailor your summary paragraph to the company's product and apply soon.");
  } else {
    recommendations.push("Quantify impact in at least two bullet points (numbers, scale, outcomes) to raise your profile.");
  }

  return {
    matchScore,
    matchingSkills,
    missingSkills,
    recommendations: recommendations.slice(0, 6),
  };
}

/* -------------------- 2. INTERVIEW QUESTION GENERATION -------------------- */

interface QuestionSeed {
  q: string;
  d: "Easy" | "Medium" | "Hard";
  c: string;
}

const TECH_BANK: Record<string, QuestionSeed[]> = {
  react: [
    { q: "What is the difference between useState and useEffect, and when would you use each?", d: "Medium", c: "React" },
    { q: "How does React's reconciliation (virtual DOM) work, and why do list items need keys?", d: "Medium", c: "React" },
    { q: "When would you reach for useMemo or useCallback — and when are they premature optimization?", d: "Hard", c: "React" },
    { q: "What is the difference between a controlled and an uncontrolled form component?", d: "Easy", c: "React" },
  ],
  javascript: [
    { q: "Explain closures in JavaScript with a practical example.", d: "Medium", c: "JavaScript" },
    { q: "Walk me through the event loop: how do microtasks and macrotasks differ?", d: "Hard", c: "JavaScript" },
    { q: "What is the difference between == and ===, and between null and undefined?", d: "Easy", c: "JavaScript" },
    { q: "How do Promises relate to async/await, and how do you handle errors in both?", d: "Medium", c: "JavaScript" },
  ],
  typescript: [
    { q: "What is the difference between an interface and a type alias in TypeScript?", d: "Medium", c: "TypeScript" },
    { q: "Explain generics with a small real-world example. Why are they useful?", d: "Hard", c: "TypeScript" },
    { q: "What is the difference between any and unknown, and why does strict mode matter?", d: "Medium", c: "TypeScript" },
  ],
  "html": [
    { q: "Why does semantic HTML matter, and can you name five semantic elements?", d: "Easy", c: "HTML" },
    { q: "How would you audit and improve the accessibility of an existing page?", d: "Medium", c: "HTML" },
  ],
  "css": [
    { q: "Explain the CSS box model, including the difference between content-box and border-box.", d: "Easy", c: "CSS" },
    { q: "How is CSS specificity calculated, and how do you keep styles maintainable in a large app?", d: "Medium", c: "CSS" },
    { q: "When would you choose CSS Grid over Flexbox? Describe a layout you built with each.", d: "Medium", c: "CSS" },
  ],
  "next.js": [
    { q: "Compare client-side rendering, server-side rendering and static generation. When is each appropriate?", d: "Hard", c: "Next.js" },
    { q: "How does routing work in Next.js, and how would you handle dynamic routes?", d: "Medium", c: "Next.js" },
  ],
  "node.js": [
    { q: "Why is Node.js described as non-blocking? Explain with an example of I/O handling.", d: "Medium", c: "Node.js" },
    { q: "What is middleware in Express, and can you sketch a simple auth middleware?", d: "Medium", c: "Node.js" },
  ],
  "rest apis": [
    { q: "What makes an API 'RESTful'? Name the main HTTP methods and what status codes you'd return for errors.", d: "Medium", c: "REST APIs" },
    { q: "How would you design pagination and filtering for a list endpoint?", d: "Hard", c: "REST APIs" },
  ],
  sql: [
    { q: "Explain the difference between INNER, LEFT and RIGHT JOIN with a small example.", d: "Medium", c: "SQL" },
    { q: "What is an index, why does it speed up reads, and what does it cost on writes?", d: "Medium", c: "SQL" },
  ],
  postgresql: [
    { q: "How would you model a simple users ↔ posts relationship in PostgreSQL?", d: "Medium", c: "PostgreSQL" },
  ],
  python: [
    { q: "What is the difference between a list and a tuple in Python?", d: "Easy", c: "Python" },
    { q: "Explain decorators in Python with an example.", d: "Hard", c: "Python" },
  ],
  java: [
    { q: "Name the four pillars of OOP and give a Java example of polymorphism.", d: "Easy", c: "Java" },
    { q: "How does a HashMap work internally in Java?", d: "Hard", c: "Java" },
  ],
  spring: [
    { q: "What is dependency injection, and how does Spring implement it?", d: "Medium", c: "Spring" },
  ],
  git: [
    { q: "What is the difference between git merge and git rebase? When would you use each?", d: "Medium", c: "Git" },
    { q: "Describe a Git workflow you have used in a team (branches, PRs, reviews).", d: "Easy", c: "Git" },
  ],
  jest: [
    { q: "What is the difference between unit, integration and end-to-end tests? What would you test first?", d: "Medium", c: "Testing" },
    { q: "What makes a test 'good'? How do you avoid brittle tests?", d: "Easy", c: "Testing" },
  ],
  cypress: [
    { q: "How would you structure end-to-end tests so they stay reliable across deploys?", d: "Hard", c: "Testing" },
  ],
  docker: [
    { q: "What is the difference between an image and a container? When is Docker useful in development?", d: "Medium", c: "Docker" },
  ],
  aws: [
    { q: "Describe how you would deploy a small web application to the cloud. Which services and why?", d: "Medium", c: "Cloud" },
  ],
  "ci/cd": [
    { q: "What is CI/CD, and what would you put in a pipeline for a student project?", d: "Easy", c: "CI/CD" },
  ],
  graphql: [
    { q: "How does GraphQL differ from REST? Name one situation where each wins.", d: "Medium", c: "GraphQL" },
  ],
  vue: [
    { q: "How does Vue's reactivity system work at a high level?", d: "Medium", c: "Vue" },
  ],
  accessibility: [
    { q: "What are the WCAG POUR principles? Give two concrete fixes for a typical form.", d: "Medium", c: "Accessibility" },
  ],
  "responsive design": [
    { q: "Describe your approach to building a responsive layout from a Figma mockup.", d: "Easy", c: "Responsive Design" },
  ],
  figma: [
    { q: "How do you hand off designs from Figma to code without losing fidelity?", d: "Easy", c: "Design" },
  ],
  agile: [
    { q: "Describe how you have worked in an agile team: ceremonies, boards, iterations.", d: "Easy", c: "Agile" },
  ],
  microservices: [
    { q: "What problem do microservices solve, and what new problems do they introduce?", d: "Hard", c: "Architecture" },
  ],
};

const BEHAVIORAL: QuestionSeed[] = [
  { q: "Tell me about a time you disagreed with a teammate. How did you resolve it?", d: "Medium", c: "Behavioral" },
  { q: "Describe a project you are proud of. What was your specific contribution?", d: "Easy", c: "Behavioral" },
  { q: "Tell me about a time you missed a deadline or failed at something. What did you learn?", d: "Medium", c: "Behavioral" },
  { q: "How do you prioritize when everything is due at once?", d: "Medium", c: "Behavioral" },
  { q: "Tell me about a time you had to learn a new technology quickly. How did you approach it?", d: "Easy", c: "Behavioral" },
  { q: "Describe a time you received difficult feedback. What did you change afterwards?", d: "Medium", c: "Behavioral" },
  { q: "Tell me about a time you explained something technical to a non-technical person.", d: "Easy", c: "Behavioral" },
  { q: "Where do you want to be in three years, and how does this role fit that plan?", d: "Easy", c: "Behavioral" },
];

const GENERAL: QuestionSeed[] = [
  { q: "Walk me through a recent project end to end: idea, stack, challenges, outcome.", d: "Medium", c: "General" },
  { q: "What happens in the browser from the moment you type a URL until the page renders?", d: "Hard", c: "General" },
  { q: "How do you keep your skills current? What did you learn recently?", d: "Easy", c: "General" },
  { q: "Why do you want this role at this company specifically?", d: "Easy", c: "General" },
  { q: "Describe your debugging process when something breaks and the error message is useless.", d: "Medium", c: "General" },
  { q: "What does clean, maintainable code mean to you in practice?", d: "Medium", c: "General" },
];

export function generateQuestions(jobTitle: string, jobDescription: string, count = 5): QuestionPayload[] {
  const detected = extractSkills(`${jobTitle}\n${jobDescription}`).filter((s) => s.cat !== "Soft skills");
  const techPool: QuestionSeed[] = [];
  for (const skill of detected) {
    const bank = TECH_BANK[skill.name.toLowerCase()];
    if (bank) techPool.push(...bank);
  }

  const picked: QuestionSeed[] = [];
  const seen = new Set<string>();
  const push = (seed: QuestionSeed) => {
    if (!seen.has(seed.q) && picked.length < count) {
      seen.add(seed.q);
      picked.push(seed);
    }
  };

  const junior = /intern|junior|working student|werkstudent/i.test(jobTitle);
  const orderedTech = [...shuffle(techPool)].sort((a, b) => {
    const rank = (d: string) => (d === "Easy" ? 0 : d === "Medium" ? 1 : 2);
    return junior ? rank(a.d) - rank(b.d) : 0;
  });

  for (const seed of orderedTech) push(seed);
  for (const seed of shuffle(BEHAVIORAL)) if (picked.length < 3) push(seed);
  for (const seed of shuffle(GENERAL)) push(seed);
  for (const seed of shuffle(BEHAVIORAL)) push(seed);

  return picked.slice(0, count).map((s) => ({ question: s.q, category: s.c, difficulty: s.d }));
}

/* ---------------------- 3. ANSWER EVALUATION ---------------------- */

const STOPWORDS = new Set(
  "a an and are as at be but by for from had has have how i if in is it its of on or that the their them they this to was we what when where which who will with you your what's".split(" ")
);

function keywords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9+#.\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !STOPWORDS.has(w))
  );
}

export function evaluateAnswer(questionText: string, answer: string, category: string): EvaluationPayload {
  const text = answer.trim();
  if (!text) throw new Error("The answer is empty — write your response first.");

  const words = text.split(/\s+/).filter(Boolean);
  const lower = text.toLowerCase();

  let score = 0;
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const suggestions: string[] = [];

  // 1. Substance (length bands)
  if (words.length < 6) {
    score = 1;
    weaknesses.push("The answer is too short to demonstrate understanding.");
    suggestions.push("Aim for 4–8 sentences: definition → how it works → concrete example.");
  } else if (words.length < 16) {
    score = 3;
    weaknesses.push("You cover the idea briefly but stop before showing depth.");
    suggestions.push("Add one concrete example from a project or coursework.");
  } else if (words.length < 45) {
    score = 5;
    strengths.push("Solid length — you develop the idea beyond a one-liner.");
    suggestions.push("Tighten the opening sentence so the key point lands first.");
  } else if (words.length < 110) {
    score = 7;
    strengths.push("Well-developed answer with enough detail to be convincing.");
  } else {
    score = 7;
    strengths.push("You clearly know the topic and have plenty of material.");
    weaknesses.push("The answer runs long — interviewers may lose the thread.");
    suggestions.push("Cut to three beats: what, why, example. Practice saying it in under 90 seconds.");
  }

  // 2. Topic coverage — overlap with question keywords
  const qWords = keywords(questionText);
  const aWords = keywords(text);
  const overlap = [...qWords].filter((w) => [...aWords].some((aw) => aw.includes(w) || w.includes(aw)));
  const ratio = qWords.size ? overlap.length / qWords.size : 0;
  if (ratio >= 0.6) {
    score += 2;
    strengths.push(`You directly address the core concepts (${overlap.slice(0, 3).join(", ")}).`);
  } else if (ratio >= 0.3) {
    score += 1;
    weaknesses.push("Part of the question goes unanswered.");
    suggestions.push(`Re-read the question and explicitly cover: ${[...qWords].slice(0, 4).join(", ")}.`);
  } else {
    weaknesses.push("The answer drifts away from what was actually asked.");
    suggestions.push("Restate the question in one line, then answer that exact thing.");
  }

  // 3. Structure signals
  if (/(for example|e\.g\.|in my project|i built|we built|in one project)/.test(lower)) {
    score += 1;
    strengths.push("You back the theory with a concrete example — interviewers love this.");
  } else {
    weaknesses.push("No concrete example is given.");
    suggestions.push("Anchor the answer with a real project: what you built, what broke, what you did.");
  }
  if (/(because|this means|as a result|so that|therefore|the reason)/.test(lower)) {
    strengths.push("You explain reasoning, not just definitions.");
  }
  if (/(first|then|second|step|finally|trade-?off)/.test(lower)) {
    score += 1;
    strengths.push("The answer has a clear structure the listener can follow.");
  }
  if (/\d/.test(text) && words.length > 20) {
    strengths.push("You quantify something, which makes the answer memorable.");
  }

  // 4. Honesty penalty / rescue
  if (/(i don'?t know|no idea|i have no clue|never used)/.test(lower)) {
    score = Math.min(score, 2);
    weaknesses.push("Saying 'I don't know' with nothing after it ends the conversation.");
    suggestions.push("It's fine not to know — follow it with how you would find out or what you do know.");
  }

  score = clamp(Math.round(score), 0, 10);

  if (strengths.length === 0) strengths.push("You attempted a full answer rather than staying silent.");
  if (weaknesses.length === 0) weaknesses.push("Few weaknesses — push further with trade-offs and edge cases.");
  if (suggestions.length === 0)
    suggestions.push(`Try the STAR shape: Situation, Task, Action, Result — it suits ${category} questions well.`);

  const bands: Array<[number, string]> = [
    [8, `Strong response. You communicate ${category} concepts clearly and concretely — keep this energy in the real interview.`],
    [6, `A competent answer. The fundamentals are there; one vivid example and a sharper opening would push it into 'memorable' territory.`],
    [4, `You're heading in the right direction but the answer lacks depth or focus on ${category}. Rebuild it as: direct answer → reasoning → example.`],
    [2, `This answer wouldn't convince an interviewer yet. Study the core concept behind the question and prepare one project story you can reuse.`],
    [0, `This needs significant work. Break the question into smaller parts and answer each one in a single clear sentence.`],
  ];
  const feedback = bands.find(([min]) => score >= min)![1];

  return { score, strengths, weaknesses, suggestions, feedback };
}

/* Validate an AI payload the same way the Edge Function does before saving. */
export function isAnalysisPayload(v: unknown): v is AnalysisPayload {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.matchScore === "number" &&
    o.matchScore >= 0 && o.matchScore <= 100 &&
    Array.isArray(o.matchingSkills) && o.matchingSkills.every((s) => typeof s === "string") &&
    Array.isArray(o.missingSkills) && o.missingSkills.every((s) => typeof s === "string") &&
    Array.isArray(o.recommendations) && o.recommendations.every((s) => typeof s === "string")
  );
}
