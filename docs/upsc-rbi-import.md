# UPSC and RBI verified-content import

UPSC CSE and RBI Grade B use the same question import endpoint and database tables as the existing exams. Their catalog configurations are intentionally marked `awaiting_verified_content`; configuration readiness does not imply that syllabus items, PYQs, answer keys, marking schemes, current affairs, or model answers are verified.

## Required question fields

Every record requires `exam`, `exam_version`, `stage`, `paper`, `subject`, `chapter`, `topic`, `year`, `question_type`, `question`, `source`, `source_url`, `verification_status`, and `license_metadata`.

Objective records also require `answer_key_source`, `options` where applicable, and a valid `correct_answer`. Descriptive records use `descriptive_short`, `descriptive_long`, or `essay`, and may include `word_limit`, `model_answer`, and `key_points`. A model answer must only be imported when its use is authorized; it must not be labelled as an official answer unless the source explicitly establishes that.

Supported specialized types are `multiple_statement`, `assertion_reason`, `match_following`, `passage`, `image_map`, `numerical`, and the existing MCQ/JEE types. Set `is_pyq: true` only for source-verified previous-year questions. Set `is_ai_generated: true` for every generated practice question; generated material must never be presented as a PYQ.

## Example descriptive record

```json
{
  "exam": "UPSC CSE",
  "exam_version": "2026",
  "stage": "mains",
  "paper": "GS Paper II",
  "subject": "Polity",
  "chapter": "Owner-imported chapter",
  "topic": "Owner-imported topic",
  "year": 2026,
  "question_type": "descriptive_long",
  "question": "Owner-provided or properly licensed question text",
  "word_limit": 250,
  "source": "Source name",
  "source_url": "https://official-or-licensed-source.example/item",
  "verification_status": "pending",
  "license_metadata": { "permission": "owner_provided" },
  "is_pyq": false,
  "is_ai_generated": false
}
```

Run `node scripts/validate_question_import.mjs <file.json>` before submitting records to `POST /api/admin/validate-import`. Publishing and database writes must remain server-side and role-protected.

## Required official inputs

- UPSC CSE notification and syllabus for each supported year/version.
- UPSC stage/paper rules and permitted question papers or licensed PYQs.
- RBI Grade B notification, syllabus, section timing, question counts, and marking rules for each panel year.
- Source and licensing metadata for explanations, model answers, and third-party study material.

Optional subjects are catalog data linked to an exam/version. Adding one must not require a frontend code change.
