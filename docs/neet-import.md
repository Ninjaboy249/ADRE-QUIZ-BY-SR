# NEET UG content import

NEET is configured from the official NTA 2026 pattern, but production content remains disabled until verified owner-supplied material is imported. Apply `supabase/migrations/202608230001_multi_exam_foundation.sql` before importing.

## JSON format

Submit `{ "records": [...] }` to `POST /api/admin/validate-import` with an authenticated admin/reviewer bearer token, or validate locally with `node scripts/validate_question_import.mjs questions.json`.

```json
{
  "exam": "NEET UG",
  "year": 2025,
  "subject": "Physics",
  "chapter": "Owner-supplied official chapter",
  "topic": "Owner-supplied official topic",
  "question": "Authorized question text",
  "options": ["A text", "B text", "C text", "D text"],
  "correct_answer": "B",
  "explanation": "Verified explanation",
  "difficulty": "medium",
  "language": "English",
  "is_pyq": true,
  "source": "Official or authorized source description",
  "answer_key_source": "Official answer-key reference",
  "verification_status": "pending",
  "image_url": null,
  "diagram_url": null,
  "license_metadata": { "permission": "Describe permission here" }
}
```

## Validation

Required fields are exam, year, subject, chapter, topic, question, four non-empty options, answer A-D, source, and answer-key source. Years, difficulty, status, and HTTPS image references are checked. A SHA-256 content hash detects duplicates inside a file and later supports database-level duplicate prevention. PYQs require explanations. Invalid rows are returned with their zero-based row index and are never silently accepted.

## CSV

CSV should use the same field names. Encode `options` and `license_metadata` as JSON values in their cells. Convert CSV to the JSON envelope before calling the API; direct CSV upload is intentionally deferred until a robust streaming parser is added rather than accepting ambiguous spreadsheet quoting.

## Syllabus import

The official 2026 syllabus URL is stored in `data/exams.json`. The owner must provide the approved hierarchy as exam → subject → chapter → topic with source/version metadata. Do not infer or generate missing chapters. Import chapters and topics as `pending`, review them, then publish.

## Images and translations

Upload authorized images to a private Supabase Storage bucket such as `question-assets`. Store only object URLs/paths in question records. Validate MIME type, file size, ownership, and signed access. Store Hindi content in `question_translations`; do not duplicate base questions.

## Verification workflow

1. Validate the file locally.
2. Upload as a `content_imports` job.
3. Resolve every validation and duplicate error.
4. A reviewer checks source, answer key, explanation, and licensing.
5. Set `verification_status=verified` and record reviewer/time.
6. Only verified/published questions may be selected for practice or tests.
