import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { extname, join } from "node:path";
import { randomUUID } from "node:crypto";

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
  "/auth.js": ["public/auth.js", "text/javascript; charset=utf-8"],
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
    const token = request.headers.authorization?.replace(/^Bearer\s+/i, "");
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
    if (!token || !supabaseUrl || !supabaseKey) return json(response, 401, { error: "Please sign in again." });
    const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { Authorization: `Bearer ${token}`, apikey: supabaseKey } });
    if (!authResponse.ok) return json(response, 401, { error: "Your session has expired. Please sign in again." });

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

async function translateQuestion(request, response) {
  try {
    const { questionId, language: code } = await readBody(request);
    const question = questionMap.get(questionId);
    const language = { hi: "Hindi", as: "Assamese", brx: "Boro (Devanagari script)" }[code];
    if (!question || !language) return json(response, 400, { error: "Invalid question or language." });
    if (!process.env.OPENAI_API_KEY) return json(response, 503, { error: "Translation is not configured yet." });
    const apiResponse = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-5.6-luna", reasoning: { effort: "low" },
      instructions: `Translate this exam MCQ faithfully into ${language}. Preserve meaning, proper nouns, and option order. Return only the requested JSON.`,
      input: JSON.stringify({ question: question.question, options: question.options }),
      text: { format: { type: "json_schema", name: "translation", strict: true, schema: { type: "object", properties: { question: { type: "string" }, options: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 4 } }, required: ["question", "options"], additionalProperties: false } } },
    }) });
    const payload = await apiResponse.json();
    if (!apiResponse.ok) throw new Error(payload.error?.message || "Translation failed.");
    return json(response, 200, JSON.parse(responseText(payload)));
  } catch (error) { return json(response, 500, { error: error instanceof Error ? error.message : "Translation failed." }); }
}

async function donate(request, response) {
  if (!process.env.CASHFREE_CLIENT_ID || !process.env.CASHFREE_CLIENT_SECRET) return json(response, 503, { error: "Donations are not configured yet." });
  try {
    const body = await readBody(request);
    if (body.action === "verify") {
      const orderId = String(body.orderId || "");
      if (!/^adre_[A-Za-z0-9_-]{8,40}$/.test(orderId)) return json(response, 400, { error: "Invalid order." });
      const apiResponse = await fetch(`${process.env.CASHFREE_MODE === "production" ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg"}/orders/${encodeURIComponent(orderId)}`, { headers: { "x-api-version": "2025-01-01", "x-client-id": process.env.CASHFREE_CLIENT_ID, "x-client-secret": process.env.CASHFREE_CLIENT_SECRET } });
      const order = await apiResponse.json();
      if (!apiResponse.ok) throw new Error(order.message || "Could not verify payment.");
      return json(response, order.order_status === "PAID" ? 200 : 202, { verified: order.order_status === "PAID", status: order.order_status });
    }
    const amount = Number(body.amount);
    const phone = String(body.phone || "").replace(/\D/g, "");
    if (!Number.isInteger(amount) || amount < 5 || amount > 100) return json(response, 400, { error: "Choose an amount from ₹5 to ₹100." });
    if (!/^[6-9]\d{9}$/.test(phone)) return json(response, 400, { error: "Enter a valid 10-digit Indian mobile number." });
    const orderId = `adre_${Date.now()}_${randomUUID().slice(0, 8)}`;
    const apiResponse = await fetch(`${process.env.CASHFREE_MODE === "production" ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg"}/orders`, { method: "POST", headers: { "Content-Type": "application/json", "x-api-version": "2025-01-01", "x-client-id": process.env.CASHFREE_CLIENT_ID, "x-client-secret": process.env.CASHFREE_CLIENT_SECRET, "x-idempotency-key": randomUUID() }, body: JSON.stringify({ order_id: orderId, order_amount: amount, order_currency: "INR", order_note: "Support ADRE Quiz", customer_details: { customer_id: `donor_${randomUUID().replaceAll("-", "").slice(0, 16)}`, customer_phone: phone, customer_name: String(body.name || "ADRE supporter").slice(0, 100), customer_email: String(body.email || "").slice(0, 100) } }) });
    const order = await apiResponse.json();
    if (!apiResponse.ok) throw new Error(order.message || order.type || "Could not start payment.");
    return json(response, 200, { orderId: order.order_id, paymentSessionId: order.payment_session_id });
  } catch (error) { return json(response, 500, { error: error instanceof Error ? error.message : "Payment could not be started." }); }
}

createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  if (request.method === "POST" && url.pathname === "/api/answer") return answerQuestion(request, response);
  if (request.method === "POST" && url.pathname === "/api/translate") return translateQuestion(request, response);
  if (request.method === "POST" && url.pathname === "/api/donate") return donate(request, response);
  if (request.method === "GET" && url.pathname === "/api/config") {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) return json(response, 503, { error: "Supabase authentication is not configured yet." });
    return json(response, 200, { supabaseUrl, supabaseKey, cashfreeMode: process.env.CASHFREE_MODE === "production" ? "production" : "sandbox", cashfreeEnabled: Boolean(process.env.CASHFREE_CLIENT_ID && process.env.CASHFREE_CLIENT_SECRET), supportEmail: process.env.SUPPORT_EMAIL || "" });
  }
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
