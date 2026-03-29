-- Filter system redesign: add structured category columns and preference tags JSONB
-- category_group    = internal top-level category  (e.g. "카페/디저트")
-- category_subgroup = internal detailed category   (e.g. "카페")
-- preference_tags   = save-level personal tags     (e.g. ["조용한", "작업하기 좋은"])
--
-- The old tags / save_tags tables are left intact for backward compatibility.
-- New code reads/writes only the three columns below.

alter table saved_places
  add column if not exists category_group    text    not null default '',
  add column if not exists category_subgroup text    not null default '',
  add column if not exists preference_tags   jsonb   not null default '[]'::jsonb;
