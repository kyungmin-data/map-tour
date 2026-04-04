alter table lists add column is_public boolean not null default false;

-- Anyone (including unauthenticated visitors) can read public lists
create policy "anyone can read public lists"
  on lists for select
  using (is_public = true);

-- Anyone can read saved places that belong to a public list
create policy "anyone can read saved places in public lists"
  on saved_places for select
  using (
    list_id is not null
    and exists (
      select 1 from lists where id = list_id and is_public = true
    )
  );
