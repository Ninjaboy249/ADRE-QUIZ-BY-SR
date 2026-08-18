import { readFileSync } from "node:fs";
import { join } from "node:path";

const questions = readFileSync(
  join(process.cwd(), "data", "questions.json"),
  "utf8",
);

export default function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ error: "Method not allowed." });
  }

  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  return response.status(200).send(questions);
}
