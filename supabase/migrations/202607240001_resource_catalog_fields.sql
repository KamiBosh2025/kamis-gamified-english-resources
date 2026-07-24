alter table public.resources
  add column if not exists display_order integer,
  add column if not exists meta_text text,
  add column if not exists details_page text,
  add column if not exists filter_group text;

create index if not exists resources_display_order_idx
  on public.resources(display_order);

create index if not exists resources_filter_group_idx
  on public.resources(filter_group);