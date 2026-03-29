-- Lists: named groupings of saved places, owned by a user
create table lists (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users not null,
  name        text not null,
  created_at  timestamptz default now() not null
);

alter table lists enable row level security;

create policy "users manage own lists" on lists
  for all using (auth.uid() = user_id);

-- Link each saved place to a list (optional — null = uncategorised)
-- ON DELETE SET NULL: deleting a list leaves its places intact, just unlisted
alter table saved_places
  add column list_id uuid references lists(id) on delete set null;
