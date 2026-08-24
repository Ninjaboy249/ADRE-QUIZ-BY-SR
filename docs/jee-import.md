# JEE Main and JEE Advanced content import

JEE Main and JEE Advanced are registered in the shared exam catalog but remain disabled until owner-supplied syllabus and licensed/official questions are verified. Apply both migrations in `supabase/migrations/` first.

Use the same `POST /api/admin/validate-import` endpoint and admin/reviewer authorization as NEET. JEE records additionally require `paper`; `session` is supported for JEE Main and Paper 1/Paper 2 are supported for JEE Advanced.

## Single-correct example

```json
{
  "exam": "JEE Main",
  "year": 2025,
  "paper": "Paper 1",
  "session": "Session 1",
  "question_number": "17",
  "subject": "Mathematics",
  "chapter": "Owner-supplied official chapter",
  "topic": "Owner-supplied official topic",
  "question_type": "single_correct_mcq",
  "question": "Authorized question text",
  "options": ["A text", "B text", "C text", "D text"],
  "correct_answer": "B",
  "explanation": "Verified explanation",
  "is_pyq": true,
  "source": "Authorized source",
  "answer_key_source": "Official answer-key reference",
  "verification_status": "pending"
}
```

## Numerical example

```json
{
  "exam": "JEE Main",
  "year": 2025,
  "paper": "Paper 1",
  "session": "Session 2",
  "subject": "Physics",
  "chapter": "Owner-supplied official chapter",
  "topic": "Owner-supplied official topic",
  "question_type": "numerical",
  "question": "Authorized numerical question",
  "options": [],
  "numeric_answer": 12.5,
  "explanation": "Verified explanation",
  "is_pyq": true,
  "source": "Authorized source",
  "answer_key_source": "Official answer-key reference"
}
```

Multiple-correct questions use `question_type: "multiple_correct_mcq"` and an answer array such as `"correct_answer": ["A", "C"]`. Supported types are single correct, multiple correct, numerical, integer answer, true/false, assertion/reason, match following, matrix match, and passage.

JEE Advanced patterns must be stored by year, paper, and section. Never copy one year's marks or negative-marking rules into another year. The `exam_sections.marking_rules` JSON is the scoring source of truth.
