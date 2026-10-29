-- Acordelot Treinos — esquema inicial
-- Aplique no SQL Editor do Supabase ou com `supabase db push`.

create extension if not exists pgcrypto;

-- =========================================================== tabelas
create table public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  join_code text not null unique default upper(substr(md5(random()::text), 1, 6)), -- alunos entram com este código
  created_at timestamptz not null default now()
);

-- código para novos professores entrarem numa escola existente (só professores leem)
create table public.school_secrets (
  school_id uuid primary key references public.schools(id) on delete cascade,
  teacher_code text not null unique default upper(substr(md5(random()::text), 1, 8))
);

create type public.user_role as enum ('teacher', 'student');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  full_name text not null,
  role public.user_role not null default 'student',
  instrument text not null default 'keyboard'
    check (instrument in ('keyboard', 'acoustic_guitar', 'electric_guitar', 'bass')),
  created_at timestamptz not null default now()
);

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  title text not null,
  kind text not null check (kind in ('scale', 'arpeggio', 'chord', 'recording')),
  instrument text not null,
  description text not null default '',
  notes jsonb not null default '[]',          -- gabarito: [{ "midi": 60, "beat": 0, "dur": 0.5 }, …]
  bpm_ref int not null default 80,
  beats_per_bar int not null default 4,
  timing_tol_ms int not null default 80 check (timing_tol_ms between 10 and 500),
  pitch_tol_cents int not null default 30 check (pitch_tol_cents between 5 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  assigned_by uuid references public.profiles(id) on delete set null,
  reps_per_day int not null default 10 check (reps_per_day > 0),
  start_bpm int not null default 60 check (start_bpm between 20 and 300),
  target_bpm int not null default 120 check (target_bpm between 20 and 300),
  bpm_step int not null default 4 check (bpm_step > 0),
  streak_required int not null default 6 check (streak_required > 0),  -- N perfeitas seguidas para subir
  current_bpm int not null,
  current_streak int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.executions (
  id uuid primary key,                       -- gerado no cliente: sincronização offline idempotente
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  performed_at timestamptz not null,
  bpm int not null,
  hits int not null,
  errors int not null,
  missed int not null,
  score int not null,
  perfect boolean not null,
  note_errors jsonb not null default '{}',   -- { "C4": 2, "F#4": 1 }
  input_mode text not null check (input_mode in ('midi', 'midi+mic', 'mic')),
  synced_at timestamptz not null default now()
);

create index on public.profiles (school_id);
create index on public.exercises (school_id);
create index on public.assignments (student_id);
create index on public.assignments (school_id);
create index on public.executions (student_id, performed_at desc);
create index on public.executions (school_id, performed_at desc);
create index on public.executions (assignment_id, performed_at);

-- =========================================================== helpers
create or replace function public.my_school() returns uuid
language sql stable security definer set search_path = public as $$
  select school_id from profiles where id = auth.uid()
$$;

create or replace function public.is_teacher() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'teacher')
$$;

-- =========================================================== cadastro
-- metadata do signUp: full_name, role, instrument, school_name, join_code
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_code text := upper(trim(coalesce(m->>'join_code', '')));
  v_school uuid;
  v_role public.user_role := 'student';
begin
  if m->>'role' = 'teacher' then
    v_role := 'teacher';
    if v_code <> '' then
      select school_id into v_school from school_secrets where teacher_code = v_code;
      if v_school is null then raise exception 'Código de professor inválido'; end if;
    else
      insert into schools (name) values (coalesce(nullif(m->>'school_name', ''), 'Minha escola')) returning id into v_school;
      insert into school_secrets (school_id) values (v_school);
    end if;
  else
    select id into v_school from schools where join_code = v_code;
    if v_school is null then raise exception 'Código da escola inválido'; end if;
  end if;

  insert into profiles (id, school_id, full_name, role, instrument)
  values (new.id, v_school, coalesce(nullif(m->>'full_name', ''), split_part(new.email, '@', 1)), v_role,
          coalesce(nullif(m->>'instrument', ''), 'keyboard'));
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================== execuções → progressão
-- Antes de inserir: a execução só vale para uma atribuição do próprio aluno; os vínculos vêm da atribuição.
create or replace function public.executions_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare a assignments;
begin
  select * into a from assignments where id = new.assignment_id;
  if a.id is null or a.student_id <> auth.uid() then
    raise exception 'Atribuição inválida para este aluno';
  end if;
  new.student_id := a.student_id;
  new.exercise_id := a.exercise_id;
  new.school_id := a.school_id;
  new.synced_at := now();
  return new;
end $$;

create trigger executions_before_insert before insert on public.executions
  for each row execute function public.executions_before_insert();

-- Regra de avanço (espelhada em src/engine/progression.ts):
-- N perfeitas seguidas → BPM sobe bpm_step (até o alvo) e a sequência zera; qualquer erro zera a sequência.
create or replace function public.apply_execution_progress() returns trigger
language plpgsql security definer set search_path = public as $$
declare a assignments; v_streak int; v_bpm int;
begin
  select * into a from assignments where id = new.assignment_id for update;
  v_bpm := a.current_bpm;
  if new.perfect then
    v_streak := a.current_streak + 1;
    if v_streak >= a.streak_required and a.current_bpm < a.target_bpm then
      v_bpm := least(a.target_bpm, a.current_bpm + a.bpm_step);
      v_streak := 0;
    end if;
  else
    v_streak := 0;
  end if;
  update assignments set current_bpm = v_bpm, current_streak = v_streak where id = a.id;
  return null;
end $$;

-- AFTER INSERT não dispara para linhas ignoradas por ON CONFLICT DO NOTHING → reenvios não contam duas vezes.
create trigger executions_progress after insert on public.executions
  for each row execute function public.apply_execution_progress();

-- =========================================================== RLS
alter table public.schools enable row level security;
alter table public.school_secrets enable row level security;
alter table public.profiles enable row level security;
alter table public.exercises enable row level security;
alter table public.assignments enable row level security;
alter table public.executions enable row level security;

create policy "membros veem a escola" on public.schools for select using (id = my_school());
create policy "professores atualizam a escola" on public.schools for update using (id = my_school() and is_teacher());

create policy "professores veem segredos" on public.school_secrets for select using (school_id = my_school() and is_teacher());

create policy "perfis da mesma escola" on public.profiles for select using (school_id = my_school());
create policy "editar o próprio perfil" on public.profiles for update using (id = auth.uid())
  with check (id = auth.uid() and school_id = my_school()
              and role = (select p.role from profiles p where p.id = auth.uid()));

create policy "exercícios da escola" on public.exercises for select using (school_id = my_school());
create policy "professor cria exercício" on public.exercises for insert with check (school_id = my_school() and is_teacher());
create policy "professor edita exercício" on public.exercises for update using (school_id = my_school() and is_teacher())
  with check (school_id = my_school());
create policy "professor apaga exercício" on public.exercises for delete using (school_id = my_school() and is_teacher());

create policy "ver atribuições" on public.assignments for select
  using (student_id = auth.uid() or (school_id = my_school() and is_teacher()));
create policy "professor cria atribuição" on public.assignments for insert with check (
  is_teacher() and school_id = my_school()
  and exists (select 1 from profiles p where p.id = student_id and p.school_id = my_school())
  and exists (select 1 from exercises e where e.id = exercise_id and e.school_id = my_school()));
create policy "professor edita atribuição" on public.assignments for update
  using (is_teacher() and school_id = my_school()) with check (school_id = my_school());
create policy "professor apaga atribuição" on public.assignments for delete using (is_teacher() and school_id = my_school());

create policy "ver execuções" on public.executions for select
  using (student_id = auth.uid() or (school_id = my_school() and is_teacher()));
create policy "aluno registra execução" on public.executions for insert with check (student_id = auth.uid());
-- sem update/delete: o histórico é imutável

-- =========================================================== ranking
-- Agregado por aluno × exercício. SECURITY DEFINER para o aluno ver o ranking da turma
-- sem acesso às execuções detalhadas dos colegas.
create or replace function public.school_ranking(p_since timestamptz)
returns table (student_id uuid, student_name text, exercise_id uuid, exercise_title text,
               max_bpm int, perfect_week int, total_week int)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name, e.id, e.title,
         coalesce(max(x.bpm) filter (where x.perfect), 0)::int,
         (count(*) filter (where x.perfect and x.performed_at >= p_since))::int,
         (count(*) filter (where x.performed_at >= p_since))::int
  from executions x
  join profiles p on p.id = x.student_id
  join exercises e on e.id = x.exercise_id
  where x.school_id = my_school()
  group by p.id, p.full_name, e.id, e.title
$$;

revoke all on function public.school_ranking(timestamptz) from public, anon;
grant execute on function public.school_ranking(timestamptz) to authenticated;
