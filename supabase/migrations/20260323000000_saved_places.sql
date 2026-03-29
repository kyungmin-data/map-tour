create table saved_places (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  title        text not null,
  category     text not null default '',
  address      text not null default '',
  road_address text not null default '',
  telephone    text not null default '',
  mapx         text not null,
  mapy         text not null,
  created_at   timestamptz not null default now(),
  unique (user_id, mapx, mapy)
);

alter table saved_places enable row level security;

create policy "users can read own saved places"
  on saved_places for select
  using (auth.uid() = user_id);

create policy "users can insert own saved places"
  on saved_places for insert
  with check (auth.uid() = user_id);
