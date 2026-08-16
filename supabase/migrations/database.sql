-- ============================================================
-- CareerPilot — PostgreSQL schema + Row Level Security
-- Run in the Supabase SQL editor (or via `supabase db push`).
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- trigger helpers ----------

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------- profiles ----------

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default '',
  email       text not null default '',
  created_at  timestamptz not null default now()
);

-- Auto-create a profile row whenever a new user signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), new.email);
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- jobs ----------

create table public.jobs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  company_name    text not null,
  job_title       text not null,
  location        text not null default '',
  job_description text not null default '',
  status          text not null default 'Saved'
                  check (status in ('Saved', 'Applied', 'Interview', 'Offer', 'Rejected')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index jobs_user_id_idx        on public.jobs (user_id);
create index jobs_user_status_idx    on public.jobs (user_id, status);
create trigger jobs_set_updated_at before update on public.jobs
  for each row execute function public.set_updated_at();

-- ---------- resumes (one per user) ----------

create table public.resumes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null unique references auth.users (id) on delete cascade,
  resume_text text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger resumes_set_updated_at before update on public.resumes
  for each row execute function public.set_updated_at();

-- ---------- ai_analyses ----------

create table public.ai_analyses (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  job_id            uuid not null references public.jobs (id) on delete cascade,
  match_score       integer not null check (match_score between 0 and 100),
  matching_skills   text[] not null default '{}',
  missing_skills    text[] not null default '{}',
  recommendations   text[] not null default '{}',
  created_at        timestamptz not null default now()
);

create index ai_analyses_user_job_idx on public.ai_analyses (user_id, job_id, created_at desc);

-- ---------- interview_sessions ----------

create table public.interview_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  job_id      uuid not null references public.jobs (id) on delete cascade,
  created_at  timestamptz not null default now()
);

create index interview_sessions_user_idx on public.interview_sessions (user_id, created_at desc);

-- ---------- interview_questions ----------

create table public.interview_questions (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.interview_sessions (id) on delete cascade,
  question    text not null,
  category    text not null default 'General',
  difficulty  text not null default 'Medium' check (difficulty in ('Easy', 'Medium', 'Hard')),
  answer      text,
  score       integer check (score between 0 and 10),
  strengths   text[] default '{}',
  weaknesses  text[] default '{}',
  suggestions text[] default '{}',
  feedback    text,
  created_at  timestamptz not null default now()
);

create index interview_questions_session_idx on public.interview_questions (session_id);

-- ============================================================
-- Row Level Security
-- Authorization lives HERE, not in the frontend. A request can
-- only touch rows whose user_id matches the JWT's auth.uid().
-- ============================================================

alter table public.profiles            enable row level security;
alter table public.jobs                enable row level security;
alter table public.resumes             enable row level security;
alter table public.ai_analyses         enable row level security;
alter table public.interview_sessions  enable row level security;
alter table public.interview_questions enable row level security;

-- profiles: you are exactly one profile — your own.
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- jobs: owner-only CRUD.
create policy "jobs_select_own" on public.jobs
  for select using (auth.uid() = user_id);
create policy "jobs_insert_own" on public.jobs
  for insert with check (auth.uid() = user_id);
create policy "jobs_update_own" on public.jobs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "jobs_delete_own" on public.jobs
  for delete using (auth.uid() = user_id);

-- resumes: owner-only CRUD.
create policy "resumes_select_own" on public.resumes
  for select using (auth.uid() = user_id);
create policy "resumes_insert_own" on public.resumes
  for insert with check (auth.uid() = user_id);
create policy "resumes_update_own" on public.resumes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "resumes_delete_own" on public.resumes
  for delete using (auth.uid() = user_id);

-- ai_analyses: owner-only.
create policy "analyses_select_own" on public.ai_analyses
  for select using (auth.uid() = user_id);
create policy "analyses_insert_own" on public.ai_analyses
  for insert with check (auth.uid() = user_id);
create policy "analyses_delete_own" on public.ai_analyses
  for delete using (auth.uid() = user_id);

-- interview_sessions: owner-only.
create policy "sessions_select_own" on public.interview_sessions
  for select using (auth.uid() = user_id);
create policy "sessions_insert_own" on public.interview_sessions
  for insert with check (auth.uid() = user_id);
create policy "sessions_delete_own" on public.interview_sessions
  for delete using (auth.uid() = user_id);

-- interview_questions: no user_id column — rights are inherited
-- from the parent session via EXISTS.
create policy "questions_select_own" on public.interview_questions
  for select using (
    exists (select 1 from public.interview_sessions s
            where s.id = session_id and s.user_id = auth.uid())
  );
create policy "questions_insert_own" on public.interview_questions
  for insert with check (
    exists (select 1 from public.interview_sessions s
            where s.id = session_id and s.user_id = auth.uid())
  );
create policy "questions_update_own" on public.interview_questions
  for update using (
    exists (select 1 from public.interview_sessions s
            where s.id = session_id and s.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.interview_sessions s
            where s.id = session_id and s.user_id = auth.uid())
  );
create policy "questions_delete_own" on public.interview_questions
  for delete using (
    exists (select 1 from public.interview_sessions s
            where s.id = session_id and s.user_id = auth.uid())
  );
