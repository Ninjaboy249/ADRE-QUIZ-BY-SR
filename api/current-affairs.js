function responseText(payload) {
  for (const item of payload.output || []) {
    for (const part of item.content || []) if (typeof part.text === "string") return part.text;
  }
  throw new Error("AI returned no current-affairs content.");
}

export default async function handler(request, response) {
  if (request.method !== "POST") return response.status(405).json({ error: "Method not allowed." });
  try {
    const token = request.headers.authorization?.replace(/^Bearer\s+/i, "");
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
    if (!token || !supabaseUrl || !supabaseKey) return response.status(401).json({ error: "Please sign in again." });
    const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { Authorization: `Bearer ${token}`, apikey: supabaseKey } });
    if (!authResponse.ok) return response.status(401).json({ error: "Your session has expired. Please sign in again." });
    if (!process.env.OPENAI_API_KEY) return response.status(503).json({ error: "OPENAI_API_KEY is not configured." });

    const year = new Date().getFullYear();
    const apiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5.6-luna",
        reasoning: { effort: "low" },
        tools: [{ type: "web_search" }],
        instructions: `Research factual, recent Assam current affairs for ${year}. Focus on government, economy, awards, environment, culture, infrastructure and sports useful for ADRE exams. Prefer authoritative and recent sources. Never invent an event. Return concise study notes and five direct question-answer pairs.`,
        input: `Create an Assam current-affairs study briefing for ${year}, current through today.`,
        text: { format: { type: "json_schema", name: "assam_current_affairs", strict: true, schema: {
          type: "object",
          properties: {
            year: { type: "string" },
            updates: { type: "array", minItems: 5, maxItems: 7, items: { type: "object", properties: { title: { type: "string" }, summary: { type: "string" } }, required: ["title", "summary"], additionalProperties: false } },
            questions: { type: "array", minItems: 5, maxItems: 5, items: { type: "object", properties: { question: { type: "string" }, answer: { type: "string" } }, required: ["question", "answer"], additionalProperties: false } },
          },
          required: ["year", "updates", "questions"], additionalProperties: false,
        } } },
      }),
    });
    const payload = await apiResponse.json();
    if (!apiResponse.ok) throw new Error(payload.error?.message || "OpenAI request failed.");
    return response.status(200).json(JSON.parse(responseText(payload)));
  } catch (error) {
    return response.status(500).json({ error: error instanceof Error ? error.message : "Unable to generate current affairs." });
  }
}
