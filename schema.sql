-- 대륙의 한 사람으로 태어나 · Supabase 초기 스키마
-- 이 SQL을 Supabase SQL Editor에서 실행하기 전에 README의 보안 설명을 읽으세요.
-- 공개 랭킹은 공개 필드만 노출하고, 캐릭터 전체 데이터는 소유자만 읽을 수 있도록 분리합니다.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '여행자' check (char_length(display_name) between 1 and 20),
  created_at timestamptz not null default now()
);

create table if not exists public.lives (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  character_name text not null check (char_length(character_name) between 1 and 16),
  origin text not null check (origin in ('commoner','merchant','noble','orphan')),
  background text not null check (background in ('village','capital','frontier')),
  age integer not null default 12 check (age between 12 and 150),
  kingdom_year integer not null default 100,
  job text not null default '견습생',
  level integer not null default 1 check (level >= 1),
  health integer not null default 100 check (health between 0 and 100),
  gold integer not null default 0 check (gold >= 0),
  fame integer not null default 0,
  stats jsonb not null default '{"strength":3,"agility":3,"intelligence":3,"wisdom":3,"charm":3,"luck":3}'::jsonb,
  xp integer not null default 0 check (xp >= 0),
  alive boolean not null default true,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.life_logs (
  id bigint generated always as identity primary key,
  life_id uuid not null references public.lives(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  age integer not null,
  kingdom_year integer not null,
  title text not null check (char_length(title) <= 100),
  detail text not null check (char_length(detail) <= 1000),
  created_at timestamptz not null default now()
);

-- 공개 랭킹에 필요한 최소 필드만 별도 뷰로 노출합니다.
create or replace view public.public_leaderboard
with (security_invoker = true) as
select id, character_name, origin, job, age, level, fame, created_at
from public.lives
where is_public = true and alive = true;

alter table public.profiles enable row level security;
alter table public.lives enable row level security;
alter table public.life_logs enable row level security;

drop policy if exists "profiles read own" on public.profiles;
create policy "profiles read own" on public.profiles for select to authenticated using (auth.uid() = id);
drop policy if exists "profiles insert own" on public.profiles;
create policy "profiles insert own" on public.profiles for insert to authenticated with check (auth.uid() = id);
drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "lives read own or public" on public.lives;
create policy "lives read own or public" on public.lives for select to authenticated using (auth.uid() = user_id or is_public = true);
drop policy if exists "lives insert own" on public.lives;
create policy "lives insert own" on public.lives for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "lives update own" on public.lives;
create policy "lives update own" on public.lives for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "lives delete own" on public.lives;
create policy "lives delete own" on public.lives for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "logs read own or public life" on public.life_logs;
create policy "logs read own or public life" on public.life_logs for select to authenticated using (
  auth.uid() = user_id or exists (
    select 1 from public.lives l where l.id = life_id and l.is_public = true
  )
);
drop policy if exists "logs insert own" on public.life_logs;
create policy "logs insert own" on public.life_logs for insert to authenticated with check (auth.uid() = user_id);

-- 참고:
-- 1) 브라우저에서 임의로 stats/gold/level을 수정하는 것을 막으려면 서버 함수(RPC)를 통해 행동을 처리하세요.
-- 2) service_role 키는 절대 프런트엔드 코드에 넣지 마세요.
-- 3) 공개 뷰와 RLS를 배포 전에 테스트하세요. 랭킹 점수 정렬 정책은 별도 확정할 수 있습니다.
