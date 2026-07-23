-- Baseline schema for Kami's Gamified English Resources.
-- Safe to keep in Git as the reproducible database definition.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'normal' check (role in ('normal', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  platform text not null,
  description text not null,
  category text,
  demonstration_type text check (
    demonstration_type is null or
    demonstration_type in ('my', 'external')
  ),
  resource_url text,
  image_url text,
  grade_level text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.resource_media (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources(id) on delete cascade,
  media_role text not null default 'main' check (media_role in ('main', 'additional')),
  media_type text,
  media_url text not null,
  file_name text,
  storage_path text,
  created_at timestamptz not null default now()
);

create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  resource_id uuid not null references public.resources(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, resource_id)
);

create index if not exists resources_platform_idx on public.resources(platform);
create index if not exists resources_category_idx on public.resources(category);
create index if not exists resource_media_resource_id_idx on public.resource_media(resource_id);
create index if not exists favorites_user_id_idx on public.favorites(user_id);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create or replace function public.handle_new_user_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_roles (user_id, role)
  values (new.id, 'normal')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_role_created on auth.users;
create trigger on_auth_user_role_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user_role();

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.resources enable row level security;
alter table public.resource_media enable row level security;
alter table public.favorites enable row level security;

drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
  on public.profiles for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Users can read own role" on public.user_roles;
create policy "Users can read own role"
  on public.user_roles for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Everyone can view resources" on public.resources;
create policy "Everyone can view resources"
  on public.resources for select to anon, authenticated
  using (true);

drop policy if exists "Admins can add resources" on public.resources;
create policy "Admins can add resources"
  on public.resources for insert to authenticated
  with check (public.is_admin());

drop policy if exists "Admins can update resources" on public.resources;
create policy "Admins can update resources"
  on public.resources for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins can delete resources" on public.resources;
create policy "Admins can delete resources"
  on public.resources for delete to authenticated
  using (public.is_admin());

drop policy if exists "Everyone can view resource media" on public.resource_media;
create policy "Everyone can view resource media"
  on public.resource_media for select to anon, authenticated
  using (true);

drop policy if exists "Admins can add resource media" on public.resource_media;
create policy "Admins can add resource media"
  on public.resource_media for insert to authenticated
  with check (public.is_admin());

drop policy if exists "Admins can update resource media" on public.resource_media;
create policy "Admins can update resource media"
  on public.resource_media for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins can delete resource media" on public.resource_media;
create policy "Admins can delete resource media"
  on public.resource_media for delete to authenticated
  using (public.is_admin());

drop policy if exists "Users can view their own favorites" on public.favorites;
create policy "Users can view their own favorites"
  on public.favorites for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can add their own favorites" on public.favorites;
create policy "Users can add their own favorites"
  on public.favorites for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can delete their own favorites" on public.favorites;
create policy "Users can delete their own favorites"
  on public.favorites for delete to authenticated
  using (user_id = auth.uid());

insert into storage.buckets (id, name, public)
values ('resource-media', 'resource-media', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Public can view resource media files" on storage.objects;
create policy "Public can view resource media files"
  on storage.objects for select to public
  using (bucket_id = 'resource-media');

drop policy if exists "Admins can upload resource media files" on storage.objects;
create policy "Admins can upload resource media files"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'resource-media' and public.is_admin());

drop policy if exists "Admins can update resource media files" on storage.objects;
create policy "Admins can update resource media files"
  on storage.objects for update to authenticated
  using (bucket_id = 'resource-media' and public.is_admin())
  with check (bucket_id = 'resource-media' and public.is_admin());

drop policy if exists "Admins can delete resource media files" on storage.objects;
create policy "Admins can delete resource media files"
  on storage.objects for delete to authenticated
  using (bucket_id = 'resource-media' and public.is_admin());
