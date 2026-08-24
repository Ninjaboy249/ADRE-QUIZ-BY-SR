alter type public.question_type add value if not exists 'integer_answer';
alter type public.question_type add value if not exists 'matrix_match';

create table if not exists public.exam_papers (
  id uuid primary key default gen_random_uuid(), exam_pattern_id uuid not null references public.exam_patterns(id) on delete cascade,
  code text not null, name text not null, session text, duration_minutes integer not null check(duration_minutes > 0),
  display_order integer not null default 0, instructions jsonb not null default '{}', unique(exam_pattern_id,code,session)
);
create table if not exists public.exam_sections (
  id uuid primary key default gen_random_uuid(), exam_paper_id uuid not null references public.exam_papers(id) on delete cascade,
  subject_slug text not null, code text not null, question_type public.question_type, question_count integer,
  attempt_limit integer, marking_rules jsonb not null default '{}', instructions jsonb not null default '{}',
  display_order integer not null default 0, unique(exam_paper_id,code)
);

alter table public.questions add column if not exists paper_id uuid references public.exam_papers(id);
alter table public.questions add column if not exists session text;
alter table public.questions add column if not exists question_number text;
alter table public.questions add column if not exists numeric_answer numeric;
alter table public.questions add column if not exists answer_payload jsonb;

create index if not exists questions_jee_filter_idx on public.questions(exam_id,year,paper_id,session,question_type,verification_status);
alter table public.exam_papers enable row level security;
alter table public.exam_sections enable row level security;
create policy "exam papers readable" on public.exam_papers for select using (true);
create policy "exam sections readable" on public.exam_sections for select using (true);

comment on column public.exam_sections.marking_rules is 'Versioned JSON rules for positive, negative, partial, zero and section-specific scoring.';
comment on column public.questions.answer_payload is 'Server-only structured answer for multiple-correct, match/matrix, passage and other non-scalar types.';
