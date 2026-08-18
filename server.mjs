import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { extname, join } from "node:path";

function loadLocalEnv() {
  for (const filename of [".env.local", ".env"]) {
    if (!existsSync(filename)) continue;
    for (const line of readFileSync(filename, "utf8").split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/i);
      if (!match || process.env[match[1]]) continue;
      process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
    }
  }
}

loadLocalEnv();
const questions = JSON.parse(readFileSync("data/questions.json", "utf8"));
const questionMap = new Map(questions.map((question) => [question.id, question]));
const cache = new Map();
const port = Number(process.env.PORT || 3000);

const staticFiles = {
  "/": ["public/index.html", "text/html; charset=utf-8"],
  "/app.js": ["public/app.js", "text/javascript; charset=utf-8"],
  "/styles.css": ["public/styles.css", "text/css; charset=utf-8"],
  "/data/questions.json": ["data/questions.json", "application/json; charset=utf-8"],
};

function json(response, status, body) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  response.end(JSON.stringify(body));
}

async function readBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 16_384) throw new Error("Request is too large.");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function responseText(payload) {
  for (const item of payload.output || []) {
    for (const part of item.content || []) if (typeof part.text === "string") return part.text;
  }
  throw new Error("OpenAI returned no answer text.");
}

async function answerQuestion(request, response) {
  try {
    const { questionId } = await readBody(request);
    const question = questionMap.get(questionId);
    if (!question) return json(response, 404, { error: "Question not found." });
    if (cache.has(questionId)) return json(response, 200, cache.get(questionId));
    if (!process.env.OPENAI_API_KEY) {
      return json(response, 503, { error: "OPENAI_API_KEY is not configured. Add it to .env.local and restart the app." });
    }

    const apiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5.6-luna",
        reasoning: { effort: "low" },
        instructions: "You are an expert ADRE exam tutor. Solve the MCQ accurately. Return the zero-based index of the single best answer. Give a concise factual explanation and short elimination or calculation logic. If wording is imperfect, interpret the intended exam question and briefly mention ambiguity.",
        input: `Question: ${question.question}\nOptions:\n${question.options.map((option, index) => `${String.fromCharCode(65 + index)}. ${option}`).join("\n")}`,
        text: { format: { type: "json_schema", name: "mcq_answer", strict: true, schema: {
          type: "object",
          properties: { correctIndex: { type: "integer", minimum: 0, maximum: 3 }, explanation: { type: "string" }, logic: { type: "string" } },
          required: ["correctIndex", "explanation", "logic"], additionalProperties: false,
        } } },
      }),
    });
    const payload = await apiResponse.json();
    if (!apiResponse.ok) throw new Error(payload.error?.message || "OpenAI request failed.");
    const answer = JSON.parse(responseText(payload));
    if (!Number.isInteger(answer.correctIndex) || answer.correctIndex < 0 || answer.correctIndex > 3) throw new Error("OpenAI returned an invalid answer.");
    cache.set(questionId, answer);
    json(response, 200, answer);
  } catch (error) {
    json(response, 500, { error: error instanceof Error ? error.message : "Unable to check this answer." });
  }
}

createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  if (request.method === "POST" && url.pathname === "/api/answer") return answerQuestion(request, response);
  if (request.method !== "GET" || !staticFiles[url.pathname]) return json(response, 404, { error: "Not found." });
  const [path, type] = staticFiles[url.pathname];
  try {
    const content = readFileSync(path);
    response.writeHead(200, { "Content-Type": type, "Cache-Control": url.pathname === "/data/questions.json" ? "public, max-age=3600" : "no-cache" });
    response.end(content);
  } catch {
    json(response, 500, { error: "Unable to load app file." });
  }
}).listen(port, "127.0.0.1", () => console.log(`ADRE Quiz running at http://127.0.0.1:${port}`));
