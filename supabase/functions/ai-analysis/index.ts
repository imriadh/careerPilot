// ============================================================
// Edge Function: ai-analysis
// Compares a job description against the user's resume using
// the NVIDIA NIM (OpenAI-compatible) chat-completions API.
//
// Deploy:  supabase functions deploy ai-analysis --no-verify-jwt
// Secret:  supabase secrets set NVIDIA_API_KEY=...
// Call:    supabase.functions.invoke("ai-analysis", { body: {...} })
//
// NOTE: verify the current model id and endpoint in the NVIDIA
// NIM docs before grading — models rotate. The request shape
// below follows the OpenAI-compatible contract.
// ============================================================

import { createClient } from "npm:@supabase/supabase-js@2";

const NVIDIA_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const NVIDIA_MODEL = "meta/llama-3.1-70b-instruct"; // verify against NVIDIA docs
const TIMEOUT_MS = 25_000;

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

/* ---------- strict validation of the model's output ---------- */

function toStringArray(value: unknown, limit: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim())
    .filter((v) => v.length > 0 && v.length <= 60)
    .slice(0, limit);
}

function validateAnalysis(raw: unknown) {
  if (!raw || typeof raw !== "object") throw new Error("AI response is not an object.");
  const o = raw as Record<string, unknown>;
  const score = Number(o.match_score);
  if (!Number.isFinite(score)) throw new Error("match_score is not a number.");
  const result = {
    matchScore: Math.max(0, Math.min(100, Math.round(score))),
    matchingSkills: toStringArray(o.matching_skills, 20),
    missingSkills: toStringArray(o.missing_skills, 20),
    recommendations: toStringArray(o.recommendations, 8),
  };
  if (result.matchingSkills.length === 0 && result.missingSkills.length === 0) {
    throw new Error("AI returned no skills at all.");
  }
  return result;
}

function extractJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end <= start) throw new Error("AI response contains no JSON object.");
    return JSON.parse(text.slice(start, end + 1));
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  try {
    // 1. Authenticate the caller — the browser's JWT is forwarded automatically.
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData, error: authError } = await supabase.auth.getUser();
    if (authError || !userData.user) return json({ error: "Unauthorized." }, 401);
    const userId = userData.user.id;

    // 2. Validate input.
    const body = await req.json().catch(() => null);
    const jobTitle = typeof body?.jobTitle === "string" ? body.jobTitle.trim() : "";
    const jobDescription = typeof body?.jobDescription === "string" ? body.jobDescription.trim() : "";
    const resumeText = typeof body?.resumeText === "string" ? body.resumeText.trim() : "";
    if (jobDescription.length < 40) return json({ error: "Job description is missing or too short." }, 400);
    if (resumeText.length < 40) return json({ error: "Resume text is missing or too short." }, 400);

    const nvidiaKey = Deno.env.get("NVIDIA_API_KEY");
    if (!nvidiaKey) return json({ error: "AI service is not configured." }, 500);

    // 3. Call NVIDIA NIM with an explicit schema and labelled inputs.
    const systemPrompt = [
      "You are a technical recruiter assistant. Compare the RESUME against the JOB POSTING.",
      "Respond with ONLY a JSON object, no markdown, no prose, exactly this shape:",
      '{"match_score": <integer 0-100>, "matching_skills": [<skills present in both>],',
      ' "missing_skills": [<skills required by the posting but absent from the resume>],',
      ' "recommendations": [<3-5 concrete, actionable tips based only on the two texts>]}',
      "Never invent skills that are not literally supported by the texts.",
    ].join("\n");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let aiText = "";
    try {
      const aiRes = await fetch(NVIDIA_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${nvidiaKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: NVIDIA_MODEL,
          temperature: 0.2,
          max_tokens: 1024,
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `JOB TITLE:\n${jobTitle}\n\nJOB DESCRIPTION:\n${jobDescription}\n\nRESUME:\n${resumeText}`,
            },
          ],
        }),
        signal: controller.signal,
      });
      if (!aiRes.ok) {
        return json({ error: "The AI service failed. Please try again." }, 502);
      }
      const aiBody = await aiRes.json();
      aiText = aiBody?.choices?.[0]?.message?.content ?? "";
    } catch (err) {
      if ((err as Error).name === "AbortError") return json({ error: "The AI service timed out." }, 504);
      return json({ error: "The AI service failed. Please try again." }, 502);
    } finally {
      clearTimeout(timer);
    }

    if (!aiText.trim()) return json({ error: "The AI returned an empty response." }, 502);

    // 4. Validate the model output before anything touches the client.
    const analysis = validateAnalysis(extractJson(aiText));

    // 5. Persist so the user owns their result (RLS applies).
    const { error: insertError } = await supabase.from("ai_analyses").insert({
      user_id: userId,
      job_id: typeof body?.jobId === "string" ? body.jobId : null,
      match_score: analysis.matchScore,
      matching_skills: analysis.matchingSkills,
      missing_skills: analysis.missingSkills,
      recommendations: analysis.recommendations,
    });
    if (insertError) return json({ error: "Analysis succeeded but could not be saved.", analysis }, 200);

    return json({ analysis });
  } catch (err) {
    console.error("ai-analysis error:", (err as Error).message); // no secrets in logs
    return json({ error: "Unable to complete the analysis. Please try again." }, 500);
  }
});
