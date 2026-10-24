
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null
    check (char_length(username) between 3 and 20),
  avatar text not null default '🦊',
  xp integer not null default 0 check (xp >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.game_rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  host_id uuid not null references auth.users(id) on delete cascade,
  game_type text not null default 'imposter',
  status text not null default 'waiting'
    check (status in ('waiting', 'playing', 'finished')),
  created_at timestamptz not null default now()
);

create table if not exists public.room_members (
  room_id uuid not null references public.game_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create table if not exists public.room_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.game_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);

create table if not exists public.friendships (
  user_id uuid not null references auth.users(id) on delete cascade,
  friend_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'blocked')),
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);

create table if not exists public.custom_games (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  rules text not null check (char_length(rules) between 1 and 3000),
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.score_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game_type text not null,
  points integer not null check (points between 0 and 100000),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.game_rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.room_messages enable row level security;
alter table public.friendships enable row level security;
alter table public.custom_games enable row level security;
alter table public.score_entries enable row level security;

create policy "Profiles visible to everyone"
on public.profiles for select
to authenticated
using (true);

create policy "Users create their own profile"
on public.profiles for insert
to authenticated
with check (id = (select auth.uid()));

create policy "Users update their own profile"
on public.profiles for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy "Room members can view their rooms"
on public.game_rooms for select
to authenticated
using (
  host_id = (select auth.uid())
  or exists (
    select 1 from public.room_members m
    where m.room_id = id and m.user_id = (select auth.uid())
  )
);

create policy "Authenticated users create rooms"
on public.game_rooms for insert
to authenticated
with check (host_id = (select auth.uid()));

create policy "Hosts update their rooms"
on public.game_rooms for update
to authenticated
using (host_id = (select auth.uid()))
with check (host_id = (select auth.uid()));

create policy "Members can see room membership"
on public.room_members for select
to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.game_rooms r
    where r.id = room_id and r.host_id = (select auth.uid())
  )
);

create policy "Users join rooms as themselves"
on public.room_members for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy "Users leave their own rooms"
on public.room_members for delete
to authenticated
using (user_id = (select auth.uid()));

create policy "Room members read messages"
on public.room_messages for select
to authenticated
using (
  exists (
    select 1 from public.room_members m
    where m.room_id = room_id and m.user_id = (select auth.uid())
  )
);

create policy "Room members send their own messages"
on public.room_messages for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.room_members m
    where m.room_id = room_id and m.user_id = (select auth.uid())
  )
);

create policy "Users see their friendship requests"
on public.friendships for select
to authenticated
using (
  user_id = (select auth.uid())
  or friend_id = (select auth.uid())
);

create policy "Users create their own friendship requests"
on public.friendships for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy "Request sender or recipient updates friendship"
on public.friendships for update
to authenticated
using (
  user_id = (select auth.uid())
  or friend_id = (select auth.uid())
)
with check (
  user_id = (select auth.uid())
  or friend_id = (select auth.uid())
);

create policy "Users delete their own friendship requests"
on public.friendships for delete
to authenticated
using (
  user_id = (select auth.uid())
  or friend_id = (select auth.uid())
);

create policy "Public games and own games are visible"
on public.custom_games for select
to authenticated
using (is_public = true or creator_id = (select auth.uid()));

create policy "Users create their own games"
on public.custom_games for insert
to authenticated
with check (creator_id = (select auth.uid()));

create policy "Creators update their own games"
on public.custom_games for update
to authenticated
using (creator_id = (select auth.uid()))
with check (creator_id = (select auth.uid()));

create policy "Creators delete their own games"
on public.custom_games for delete
to authenticated
using (creator_id = (select auth.uid()));

create policy "Authenticated users can read scores"
on public.score_entries for select
to authenticated
using (true);

create policy "Users add their own scores"
on public.score_entries for insert
to authenticated
with check (user_id = (select auth.uid()));