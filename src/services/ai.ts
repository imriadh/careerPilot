/* ------------------------------------------------------------------ */
/* AI service — the single place the frontend asks for AI work.        */
/*                                                                     */
/* Production: each function becomes one HTTPS call to a Supabase      */
/* Edge Function (which holds the NVIDIA key and talks to NIM):        */
/*                                                                     */
/*   const { data, error } = await supabase.functions.invoke(          */
/*     "ai-analysis", { body: { jobId, resumeText } }                  */
/*   );                                                                */
/*                                                                     */
/* Demo mode: the same contracts are fulfilled by the on-device        */
/* engine in utils/ai.ts, with the same validation on the way out.     */
/* ------------------------------------------------------------------ */

import type { AnalysisPayload, EvaluationPayload, QuestionPayload } from "../lib/types";
import { analyzeMatch, evaluateAnswer, generateQuestions, isAnalysisPayload } from "../utils/ai";

export const BACKEND_MODE = "demo" as "demo" | "supabase";

export interface AiProgress {
  step: string;
  pct: number; // 0..100
}

type OnProgress = (p: AiProgress) => void;

const wait = (ms: number) => new Promise<void>((res) => setTimeout(res, ms));

async function runSteps(steps: Array<[string, number]>, onProgress?: OnProgress): Promise<void> {
  for (const [step, pct] of steps) {
    onProgress?.({ step, pct });
    await wait(420 + Math.random() * 380);
  }
}

export async function runAnalysis(
  input: { resumeText: string; jobTitle: string; jobDescription: string },
  onProgress?: OnProgress
): Promise<AnalysisPayload> {
  await runSteps(
    [
      ["Parsing job description…", 18],
      ["Extracting required skills…", 42],
      ["Comparing against your resume…", 70],
      ["Scoring match & drafting recommendations…", 90],
    ],
    onProgress
  );
  const payload = analyzeMatch(input.resumeText, input.jobTitle, input.jobDescription);
  if (!isAnalysisPayload(payload)) {
    throw new Error("The AI returned an invalid analysis. Please try again.");
  }
  onProgress?.({ step: "Analysis completed", pct: 100 });
  return payload;
}

export async function runQuestionGeneration(
  input: { jobTitle: string; jobDescription: string },
  onProgress?: OnProgress
): Promise<QuestionPayload[]> {
  await runSteps(
    [
      ["Reading the role requirements…", 30],
      ["Selecting technical topics…", 62],
      ["Balancing difficulty & categories…", 88],
    ],
    onProgress
  );
  const questions = generateQuestions(input.jobTitle, input.jobDescription, 5);
  onProgress?.({ step: "Briefing ready", pct: 100 });
  return questions;
}

export async function runEvaluation(
  input: { question: string; answer: string; category: string },
  onProgress?: OnProgress
): Promise<EvaluationPayload> {
  await runSteps(
    [
      ["Reading your answer…", 35],
      ["Checking coverage of the question…", 70],
      ["Writing feedback…", 92],
    ],
    onProgress
  );
  const payload = evaluateAnswer(input.question, input.answer, input.category);
  onProgress?.({ step: "Feedback ready", pct: 100 });
  return payload;
}
