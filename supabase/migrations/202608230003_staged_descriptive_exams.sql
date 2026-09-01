alter type public.question_type add value if not exists 'multiple_statement';
alter type public.question_type add value if not exists 'image_map';
alter type public.question_type add value if not exists 'descriptive_short';
alter type public.question_type add value if not exists 'descriptive_long';
alter type public.question_type add value if not exists 'essay';

alter table public.exam_patterns alter column duration_minutes drop not null;
alter table public.exam_patterns alter column total_questions drop not null;
alter table public.exam_patterns alter column maximum_marks drop not null;
alter table public.exam_patterns alter column marks_correct drop not null;

create table if not exists public.exam_stages (
  id uuid primary key default gen_random_uuid(),
  exam_pattern_id uuid not null references public.exam_patterns(id) on delete cascade,
  code text not null, name text not null, stage_type text not null,
  display_order integer not null default 0,
  configuration jsonb not null default '{}',
  unique(exam_pattern_id,code)
);

alter table public.exam_papers add column if not exists exam_stage_id uuid references public.exam_stages(id) on delete cascade;
alter table public.exam_papers alter column duration_minutes drop not null;
alter table public.questions add column if not exists exam_stage_id uuid references public.exam_stages(id);
alter table public.questions add column if not exists statements jsonb not null default '[]';
alter table public.questions add column if not exists model_answer text;
alter table public.questions add column if not exists key_points jsonb not null default '[]';
alter table public.questions add column if not exists word_limit integer check(word_limit is null or word_limit > 0);

create table if not exists public.optional_subjects (
  id uuid primary key default gen_random_uuid(), exam_id uuid not null references public.exams(id) on delete cascade,
  slug text not null, name text not null, syllabus_version text not null,
  source_url text not null, status public.content_status not null default 'pending',
  metadata jsonb not null default '{}', unique(exam_id,slug,syllabus_version)
);

create table if not exists public.descriptive_answer_drafts (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  attempt_id uuid references public.user_attempts(id) on delete set null,
  answer_text text not null default '', word_count integer not null default 0,
  elapsed_seconds integer not null default 0, status text not null default 'draft' check(status in ('draft','submitted')),
  submitted_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(user_id,question_id,attempt_id)
);

create table if not exists public.ai_answer_evaluations (
  id uuid primary key default gen_random_uuid(), draft_id uuid not null references public.descriptive_answer_drafts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rubric_version text not null, estimated_score numeric, maximum_marks numeric,
  strengths jsonb not null default '[]', improvements jsonb not null default '[]',
  suggested_structure jsonb not null default '[]', dimension_scores jsonb not null default '{}',
  disclaimer text not null default 'AI-assisted feedback only; this is not an official examination evaluation.',
  provider_metadata jsonb not null default '{}', created_at timestamptz not null default now()
);

create table if not exists public.current_affairs_items (
  id uuid primary key default gen_random_uuid(), exam_id uuid not null references public.exams(id) on delete cascade,
  published_on date not null, category text not null, topic text not null, summary text not null,
  source text not null, source_url text not null, tags text[] not null default '{}',
  related_subject_id uuid references public.subjects(id), related_topic_id uuid references public.topics(id),
  verification_status public.content_status not null default 'pending', created_at timestamptz not null default now()
);

create index if not exists questions_stage_filter_idx on public.questions(exam_id,exam_stage_id,paper_id,year,question_type,verification_status);
create index if not exists descriptive_drafts_user_idx on public.descriptive_answer_drafts(user_id,updated_at desc);
create index if not exists ai_evaluations_user_idx on public.ai_answer_evaluations(user_id,created_at desc);
create index if not exists current_affairs_exam_date_idx on public.current_affairs_items(exam_id,published_on desc,verification_status);

alter table public.exam_stages enable row level security;
alter table public.optional_subjects enable row level security;
alter table public.descriptive_answer_drafts enable row level security;
alter table public.ai_answer_evaluations enable row level security;
alter table public.current_affairs_items enable row level security;
create policy "exam stages readable" on public.exam_stages for select using (true);
create policy "verified optional subjects readable" on public.optional_subjects for select using (status in ('verified','published'));
create policy "own descriptive drafts" on public.descriptive_answer_drafts for all using (auth.uid()=user_id) with check(auth.uid()=user_id);
create policy "own ai evaluations" on public.ai_answer_evaluations for select using (auth.uid()=user_id);
create policy "verified current affairs readable" on public.current_affairs_items for select using (verification_status in ('verified','published'));

comment on table public.ai_answer_evaluations is 'AI-assisted descriptive feedback; never an official UPSC or RBI assessment.';
