-- Persistent friend categories/buckets per user

create table if not exists public.friend_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text not null default '#3B82F6',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.friend_category_members (
  friend_category_id uuid not null references public.friend_categories(id) on delete cascade,
  friend_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (friend_category_id, friend_user_id)
);

create index if not exists idx_friend_categories_user_id
  on public.friend_categories(user_id);

create index if not exists idx_friend_category_members_friend_user_id
  on public.friend_category_members(friend_user_id);

create unique index if not exists uq_friend_categories_user_name_ci
  on public.friend_categories(user_id, lower(name));

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'friend_categories'
  ) then
    alter publication supabase_realtime add table public.friend_categories;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'friend_category_members'
  ) then
    alter publication supabase_realtime add table public.friend_category_members;
  end if;
end
$$;
