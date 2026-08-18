import { readFileSync } from "node:fs";
import { join } from "node:path";

const questions = JSON.parse(
  readFileSync(join(process.cwd(), "data", "questions.json"), "utf8"),
);
const questionMap = new Map(questions.map((question) => [question.id, question]));

function responseText(payload) {
  for (const item of payload.output || []) {
    for (const part of item.content || []) {
      if (typeof part.text === "string") return part.text;
    }
  }
  throw new Error("OpenAI returned no answer text.");
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed." });
  }

  try {
    const token = request.headers.authorization?.replace(/^Bearer\s+/i, "");
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
    if (!token || !supabaseUrl || !supabaseKey) return response.status(401).json({ error: "Please sign in again." });
    const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { Authorization: `Bearer ${token}`, apikey: supabaseKey } });
    if (!authResponse.ok) return response.status(401).json({ error: "Your session has expired. Please sign in again." });

    const question = questionMap.get(request.body?.questionId);
    if (!question) return response.status(404).json({ error: "Question not found." });
    if (!process.env.OPENAI_API_KEY) {
      return response.status(503).json({
        error: "OPENAI_API_KEY is not configured in the Vercel project.",
      });
    }

    const apiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5.6-luna",
        reasoning: { effort: "low" },
        instructions: "You are an expert ADRE exam tutor. Solve the MCQ accurately. Return the zero-based index of the single best answer. Give a concise factual explanation and short elimination or calculation logic. If wording is imperfect, interpret the intended exam question and briefly mention ambiguity.",
        input: `Question: ${question.question}\nOptions:\n${question.options.map((option, index) => `${String.fromCharCode(65 + index)}. ${option}`).join("\n")}`,
        text: { format: { type: "json_schema", name: "mcq_answer", strict: true, schema: {
          type: "object",
          properties: {
            correctIndex: { type: "integer", minimum: 0, maximum: 3 },
            explanation: { type: "string" },
            logic: { type: "string" },
          },
          required: ["correctIndex", "explanation", "logic"],
          additionalProperties: false,
        } } },
      }),
    });

    const payload = await apiResponse.json();
    if (!apiResponse.ok) throw new Error(payload.error?.message || "OpenAI request failed.");
    const answer = JSON.parse(responseText(payload));
    if (!Number.isInteger(answer.correctIndex) || answer.correctIndex < 0 || answer.correctIndex > 3) {
      throw new Error("OpenAI returned an invalid answer.");
    }
    return response.status(200).json(answer);
  } catch (error) {
    return response.status(500).json({
      error: error instanceof Error ? error.message : "Unable to check this answer.",
    });
  }
}
