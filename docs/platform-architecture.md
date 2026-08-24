# Multi-exam platform architecture

## Current architecture audit

The application is a dependency-light JavaScript web app. `public/auth.js` initializes Supabase Google OAuth and dynamically loads the single-file UI in `public/app.js`. Questions are stored in `data/questions.json`; there is no application database schema yet. Local development uses `server.mjs`, while production uses independent Vercel functions under `api/`. OpenAI Responses powers answer explanations, translations, and current affairs. Cashfree handles donations.

Working ADRE capabilities to preserve are authentication, ten-paper practice, subject filtering, mock questions, answer explanations, translations, current affairs, responsive UI, and donation checkout.

## Problems and technical debt

- Local and Vercel API implementations are duplicated and had already diverged: production answer evaluation did not use the shared mathematics normalizer.
- `public/app.js` is a monolithic state store, router, renderer, and service client.
- Exam, subject, and paper rules are hardcoded in the frontend.
- Questions are flat JSON; attempts live only in browser storage, so there is no cross-device progress, analytics, mastery, or audit trail.
- Correct answers are generated on demand rather than curated and versioned.
- Translation and current-affairs endpoints lack the same authentication enforcement as all protected AI work should have.
- There is no request schema validation, rate limiting, structured logging, role model, admin boundary, pagination, or AI cost accounting.
- Supabase is used only for identity; no migrations or row-level security policies are present in the repository.

## Incremental target architecture

Keep the current static client and Vercel deployment during migration. Introduce boundaries in this order:

1. **Catalog domain** — exam, category, version, stage, paper, section, subject, chapter, topic, language, and feature configuration. `data/exams.json` is the catalog adapter; only exams with verified content expose practice features.
2. **Content domain** — normalized questions, options, explanations, PYQ metadata, tags, imports, and content versions behind APIs.
3. **Assessment domain** — test definitions, test questions, attempts, answers, scoring policies, and timing.
4. **Learning domain** — topic mastery, sessions, plans, recommendations, streaks, and readiness.
5. **AI domain** — provider-neutral tutor interface, retrieval, prompt policies, structured outputs, safety, and usage records.
6. **Admin domain** — role-protected catalog/content/import workflows with validation and publishing states.

The browser should eventually consume `/api/catalog`, `/api/questions`, `/api/tests`, `/api/attempts`, `/api/mastery`, and `/api/tutor`; mobile and future Capacitor clients reuse the same contracts.

## Database design

Use Supabase Postgres and migrations. Core tables:

- `exam_categories`, `exams`, `exam_patterns`, `subjects`, `exam_subjects`, `chapters`, `topics`
- `questions`, `question_options`, `question_translations`, `question_tags`, `previous_year_questions`
- `mock_tests`, `mock_test_sections`, `mock_test_questions`
- `user_attempts`, `user_answers`, `user_topic_mastery`, `learning_sessions`
- `study_plans`, `study_plan_items`, `ai_conversations`, `ai_messages`, `ai_recommendations`
- `knowledge_documents`, `knowledge_chunks`, `content_imports`, `ai_usage_events`

Use UUID primary keys, `created_at`/`updated_at`, publishing status and content version fields. Index foreign keys and common filters: `(exam_id, subject_id, topic_id, year, difficulty)`, `(user_id, created_at)`, and `(user_id, topic_id)`. Enable row-level security so students access only their learning records, while published catalog/content is readable and admin writes require a server-verified role.

## AI and RAG boundary

Define provider-neutral operations: `solveQuestion`, `explainConcept`, `generatePractice`, `buildStudyPlan`, and `analyzePerformance`. Each request carries `examId`, `subjectId`, `topicId`, language, user mastery summary, and an explicit task policy. Retrieval filters knowledge chunks by the same metadata before ranking; never send the full content store. Persist prompt version, retrieved chunk IDs, provider/model, latency, tokens, and cost. Curated answers take precedence over generated answers.

## Migration phases

1. Eliminate local/production API divergence and establish the catalog contract.
2. Add Supabase migrations, repositories, validation, RLS, and server-side profiles/roles.
3. Import ADRE catalog and questions into the generic schema while retaining JSON fallback.
4. Persist attempts and build deterministic scoring plus performance summaries.
5. Split the frontend into catalog, practice, assessment, analytics, and tutor modules.
6. Add document ingestion/vector retrieval and provider-neutral AI services.
7. Add admin imports and publishing workflow.
8. Add one fully sourced second exam to prove reuse.
9. Add PWA/offline shell and prepare Capacitor packaging.

## Risks

The largest risks are inaccurate extracted questions, AI-generated answer correctness, content licensing, AI cost abuse, schema migration without data validation, and broad admin privileges. Mitigate with content versioning, curated answer keys, import reports, per-user rate limits, usage budgets, RLS tests, audit logs, and staged rollout with the existing ADRE JSON path as fallback.
