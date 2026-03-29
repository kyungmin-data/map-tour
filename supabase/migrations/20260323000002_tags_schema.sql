create table tags (
  id         uuid    primary key default gen_random_uuid(),
  slug       text    not null unique,
  label      text    not null,
  category   text    not null,
  sort_order integer not null default 0,
  is_active  boolean not null default true
);

create table save_tags (
  saved_place_id uuid not null references saved_places(id) on delete cascade,
  tag_id         uuid not null references tags(id)         on delete cascade,
  primary key (saved_place_id, tag_id)
);

-- tags are read-only for all authenticated users (predefined, not user-specific)
alter table tags enable row level security;

create policy "authenticated users can read tags"
  on tags for select
  using (auth.role() = 'authenticated');

-- save_tags are user-scoped via the saved_places FK
alter table save_tags enable row level security;

create policy "users can read own save_tags"
  on save_tags for select
  using (
    exists (
      select 1 from saved_places
      where id = saved_place_id
      and user_id = auth.uid()
    )
  );

create policy "users can insert own save_tags"
  on save_tags for insert
  with check (
    exists (
      select 1 from saved_places
      where id = saved_place_id
      and user_id = auth.uid()
    )
  );
