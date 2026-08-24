# ExamPrep AI

A mobile-friendly quiz app containing all 1,205 English MCQs extracted from the supplied ADRE merged PDF (2022 and 2024, Papers I-V). Answers, reasoning, and explanations are generated through the OpenAI Responses API. The app has no third-party runtime dependencies.

## Run locally

1. Copy `.env.example` to `.env.local` and add your OpenAI API key.
2. Start the app: `npm run dev`
3. Open `http://localhost:3000`

The API key is read only by the server route and is never sent to the browser. `OPENAI_MODEL` is optional; it defaults to `gpt-5.6-luna`.

## Deploy to Vercel

1. Import the repository into Vercel and leave the framework preset as **Other**.
2. Add `OPENAI_API_KEY` under Project Settings → Environment Variables.
3. Add `SUPABASE_URL` and either `SUPABASE_PUBLISHABLE_KEY` or `SUPABASE_ANON_KEY`.
4. Enable Google under Supabase Authentication → Providers and add the deployed site URL to Supabase's redirect allow list.
5. For donations, add `CASHFREE_CLIENT_ID` and `CASHFREE_CLIENT_SECRET` from Cashfree Dashboard → Developers → API Keys. Set `CASHFREE_MODE=sandbox` while testing and `production` when going live.
6. Add `SUPPORT_EMAIL` for help, feature requests, and requests for other exam apps.
7. Optionally add `OPENAI_MODEL`, then redeploy so the environment changes take effect.

Hindi, Assamese, and Boro translations are generated on demand with the configured OpenAI model. Cashfree donation amounts are restricted to ₹5–₹100 and successful orders are verified on the server.

The files in `public/` are served statically and the handlers in `api/` run as Vercel Functions.

## Platform evolution

The multi-exam migration starts with the exam-agnostic catalog at `GET /api/catalog`. ADRE remains the only active exam until a second exam has validated syllabus and question content. See [docs/platform-architecture.md](docs/platform-architecture.md) for the repository audit, target data model, AI/RAG boundaries, migration phases, and risks.

NEET UG is registered with the official NTA 2026 pattern and is marked as awaiting verified content. Apply the migration under `supabase/migrations/`, set the server-only `SUPABASE_SERVICE_ROLE_KEY` for protected admin validation, and follow [docs/neet-import.md](docs/neet-import.md). Never expose the service-role key to browser code.

## Refresh the PDF extraction

Run `python scripts/extract_questions.py "C:\path\to\ADRE_merged.pdf"`. The extractor validates the expected count for each paper before replacing `data/questions.json`.
