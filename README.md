# ADRE Quiz

A mobile-friendly quiz app containing all 1,205 English MCQs extracted from the supplied ADRE merged PDF (2022 and 2024, Papers I-V). Answers, reasoning, and explanations are generated through the OpenAI Responses API. The app has no third-party runtime dependencies.

## Run locally

1. Copy `.env.example` to `.env.local` and add your OpenAI API key.
2. Start the app: `npm run dev`
3. Open `http://localhost:3000`

The API key is read only by the server route and is never sent to the browser. `OPENAI_MODEL` is optional; it defaults to `gpt-5.6-luna`.

## Refresh the PDF extraction

Run `python scripts/extract_questions.py "C:\path\to\ADRE_merged.pdf"`. The extractor validates the expected count for each paper before replacing `data/questions.json`.
