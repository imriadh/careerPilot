// ============================================================
// Edge Function: ai-interview
// Two modes:
//   generate  → 5 interview questions from the job posting
//   evaluate  → score + feedback for a candidate's answer
//
// Secret:  supabase secrets set NVIDIA_API_KEY=...
// NOTE: verify the model id against the current NVIDIA NIM docs.
// ============================================================

import { createClient } from "npm:@supabase/supabase-js@2";

const NVIDIA_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const NVIDIA_MODEL = "meta/llama-3.1-70b-instruct";
const TIMEOUT_MS = 25_000;
const DIFFICULTIES = ["Easy", "Medium", "Hard"] as const;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function extractJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const start = Math.min(
      ...["{", "["].map((ch) => {
        const i = text.indexOf(ch);
        return i === -1 ? Number.MAX_SAFE_INTEGER : i;
      })
    );
    const endObj = text.lastIndexOf("}");
    const endArr = text.lastIndexOf("]");
    const end = Math.max(endObj, endArr);
    if (start === Number.MAX_SAFE_INTEGER || end <= start) throw new Error("No JSON found in AI response.");
    return JSON.parse(text.slice(start, end + 1));
  }
}

async function callNvidia(key: string, systemPrompt: string, userPrompt: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(NVIDIA_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: NVIDIA_MODEL,
        temperature: 0.4,
        max_tokens: 1024,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error("nvidia_error");
    const body = await res.json();
    const text: string = body?.choices?.[0]?.message?.content ?? "";
    if (!text.trim()) throw new Error("empty_response");
    return text;
  } finally {
    clearTimeout(timer);
  }
}

function validateQuestions(raw: unknown) {
  const arr = Array.isArray(raw) ? raw : (raw as Record<string, unknown>)?.questions;
  if (!Array.isArray(arr) || arr.length === 0) throw new Error("AI returned no questions.");
  return arr.slice(0, 8).flatMap((item) => {
    const q = item as Record<string, unknown>;
    if (typeof q.question !== "string" || q.question.trim().length < 10) return [];
    const difficulty = DIFFICULTIES.includes(q.difficulty as (typeof DIFFICULTIES)[number])
      ? (q.difficulty as string)
      : "Medium";
    return [{
      question: q.question.trim().slice(0, 300),
      category: typeof q.category === "string" ? q.category.trim().slice(0, 40) : "General",
      difficulty,
    }];
  });
}

function validateEvaluation(raw: unknown) {
  if (!raw || typeof raw !== "object") throw new Error("AI response is not an object.");
  const o = raw as Record<string, unknown>;
  const score = Number(o.score);
  const strs = (v: unknown, limit: number) =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").map((x) => x.trim()).filter(Boolean).slice(0, limit) : [];
  return {
    score: Number.isFinite(score) ? Math.max(0, Math.min(10, Math.round(score))) : 0,
    strengths: strs(o.strengths, 5),
    weaknesses: strs(o.weaknesses, 5),
    suggestions: strs(o.suggestions, 5),
    feedback: typeof o.feedback === "string" ? o.feedback.trim().slice(0, 600) : "",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData, error: authError } = await supabase.auth.getUser();
    if (authError || !userData.user) return json({ error: "Unauthorized." }, 401);

    const nvidiaKey = Deno.env.get("NVIDIA_API_KEY");
    if (!nvidiaKey) return json({ error: "AI service is not configured." }, 500);

    const body = await req.json().catch(() => null);
    const mode = body?.mode;

    if (mode === "generate") {
      const jobTitle = String(body?.jobTitle ?? "").trim();
      const jobDescription = String(body?.jobDescription ?? "").trim();
      if (jobDescription.length < 40) return json({ error: "Job description is missing or too short." }, 400);

      const text = await callNvidia(
        nvidiaKey,
        [
          "You are an interviewer preparing a candidate. Generate exactly 5 questions for the given job.",
          "Mix: ~3 technical questions tied to the posting's skills, ~2 behavioral questions.",
          "Respond with ONLY a JSON array, no markdown: ",
          '[{"question": "...", "category": "<skill or Behavioral>", "difficulty": "Easy|Medium|Hard"}]',
        ].join("\n"),
        `JOB TITLE:\n${jobTitle}\n\nJOB DESCRIPTION:\n${jobDescription}`
      ).catch((err) => {
        throw err;
      });

      const questions = validateQuestions(extractJson(text));
      if (questions.length < 3) return json({ error: "The AI generated too few usable questions." }, 502);
      return json({ questions: questions.slice(0, 5) });
    }

    if (mode === "evaluate") {
      const question = String(body?.question ?? "").trim();
      const answer = String(body?.answer ?? "").trim();
      const category = String(body?.category ?? "General").trim();
      const jobContext = String(body?.jobContext ?? "").trim();
      if (question.length < 10) return json({ error: "Invalid question." }, 400);
      if (answer.length < 10) return json({ error: "The answer is too short to evaluate." }, 400);

      const text = await callNvidia(
        nvidiaKey,
        [
          "You are a supportive interview coach. Evaluate the candidate's answer honestly but constructively.",
          "Respond with ONLY a JSON object, no markdown:",
          '{"score": <integer 0-10>, "strengths": [2-3 items], "weaknesses": [1-3 items],',
          ' "suggestions": [1-3 concrete improvements], "feedback": "<2-3 sentence summary>"}',
          "Base everything only on the given answer; never invent facts about the candidate.",
        ].join("\n"),
        `JOB CONTEXT:\n${jobContext || "not provided"}\n\nQUESTION:\n${question}\n\nCANDIDATE ANSWER:\n${answer}\n\nCATEGORY:\n${category}`
      );

      return json({ evaluation: validateEvaluation(extractJson(text)) });
    }

    return json({ error: "Unknown mode. Use 'generate' or 'evaluate'." }, 400);
  } catch (err) {
    const message = (err as Error).message;
    if (message === "nvidia_error") return json({ error: "The AI service failed. Please try again." }, 502);
    if (message === "empty_response") return json({ error: "The AI returned an empty response." }, 502);
    console.error("ai-interview error:", message);
    return json({ error: "Unable to complete the request. Please try again." }, 500);
  }
});
