import { readFileSync } from "node:fs";
import { join } from "node:path";

const questions = JSON.parse(readFileSync(join(process.cwd(), "data", "questions.json"), "utf8"));
const questionMap = new Map(questions.map((question) => [question.id, question]));
const languages = { hi: "Hindi", as: "Assamese", brx: "Boro (Devanagari script)" };

function responseText(payload) {
  for (const item of payload.output || []) for (const part of item.content || []) if (typeof part.text === "string") return part.text;
  throw new Error("OpenAI returned no translation.");
}

export default async function handler(request, response) {
  if (request.method !== "POST") return response.status(405).json({ error: "Method not allowed." });
  try {
    const question = questionMap.get(request.body?.questionId);
    const language = languages[request.body?.language];
    if (!question || !language) return response.status(400).json({ error: "Invalid question or language." });
    if (!process.env.OPENAI_API_KEY) return response.status(503).json({ error: "Translation is not configured yet." });
    const apiResponse = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-5.6-luna", reasoning: { effort: "low" },
      instructions: `Translate this exam MCQ faithfully into ${language}. Preserve meaning, numbering, proper nouns, and option order. Return only the requested JSON.`,
      input: JSON.stringify({ question: question.question, options: question.options }),
      text: { format: { type: "json_schema", name: "translation", strict: true, schema: { type: "object", properties: { question: { type: "string" }, options: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 4 } }, required: ["question", "options"], additionalProperties: false } } },
    }) });
    const payload = await apiResponse.json();
    if (!apiResponse.ok) throw new Error(payload.error?.message || "Translation failed.");
    return response.status(200).json(JSON.parse(responseText(payload)));
  } catch (error) { return response.status(500).json({ error: error instanceof Error ? error.message : "Translation failed." }); }
}
