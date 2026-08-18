# ADRE Quiz

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
5. Optionally add `OPENAI_MODEL`, then redeploy so the environment changes take effect.

The files in `public/` are served statically and the handlers in `api/` run as Vercel Functions.

## Refresh the PDF extraction

Run `python scripts/extract_questions.py "C:\path\to\ADRE_merged.pdf"`. The extractor validates the expected count for each paper before replacing `data/questions.json`.
