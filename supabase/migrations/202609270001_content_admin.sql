create extension if not exists pgcrypto;

create type public.content_status as enum ('draft', 'scheduled', 'published', 'archived');

create or replace function public.is_owner()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(lower((select auth.jwt() ->> 'email')) = lower(current_setting('app.settings.owner_email', true)), false)
$$;

create or replace function public.set_updated_at()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin new.updated_at = now(); return new; end
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique, display_name text not null default 'SoloCalculator',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.media (
  id uuid primary key default gen_random_uuid(), storage_path text not null unique, public_url text not null,
  original_filename text not null, mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp','image/gif')),
  width integer not null check (width > 0), height integer not null check (height > 0),
  byte_size bigint not null check (byte_size > 0), alt_text text not null default '', caption text not null default '',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.posts (
  id uuid primary key default gen_random_uuid(), title text not null default '',
  slug text not null check (slug = lower(slug) and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  excerpt text not null default '', editor_document jsonb not null default '{"type":"doc","content":[]}'::jsonb,
  sanitized_html text not null default '', source_html text, status public.content_status not null default 'draft',
  featured_image_id uuid references public.media(id) on delete restrict, social_image_id uuid references public.media(id) on delete restrict,
  author_display_name text not null default 'SoloCalculator', seo jsonb not null default '{}'::jsonb,
  related_page_keys text[] not null default '{}', related_post_ids uuid[] not null default '{}',
  version integer not null default 1 check (version > 0), scheduled_at timestamptz, published_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint posts_publication_dates check ((status = 'scheduled' and scheduled_at is not null) or (status = 'published' and published_at is not null) or status in ('draft','archived'))
);
create unique index posts_slug_unique on public.posts (lower(slug));
create index posts_publication_index on public.posts (status, published_at desc);

create table public.post_revisions (
  id uuid primary key default gen_random_uuid(), post_id uuid not null references public.posts(id) on delete cascade,
  revision integer not null check (revision > 0), title text not null, slug text not null,
  excerpt text not null default '', sanitized_html text not null, author_display_name text not null,
  featured_image_id uuid references public.media(id) on delete restrict, social_image_id uuid references public.media(id) on delete restrict,
  seo jsonb not null default '{}'::jsonb, related_page_keys text[] not null default '{}', related_post_ids uuid[] not null default '{}',
  published_at timestamptz not null default now(), is_current boolean not null default true,
  unique (post_id, revision)
);
create unique index post_revisions_current_unique on public.post_revisions (post_id) where is_current;
create unique index post_revisions_current_slug_unique on public.post_revisions (lower(slug)) where is_current;

create table public.page_seo (
  id uuid primary key default gen_random_uuid(), page_key text not null unique,
  pathname text not null unique check (pathname like '/%'), browser_title text not null default '',
  meta_description text not null default '', introduction_html text not null default '',
  supporting_sections jsonb not null default '[]'::jsonb, canonical_url text not null default '',
  breadcrumb_label text not null default '', no_index boolean not null default false, no_follow boolean not null default false,
  include_in_sitemap boolean not null default true, sitemap_priority numeric(2,1) not null default 0.8 check (sitemap_priority between 0 and 1),
  change_frequency text not null default 'monthly' check (change_frequency in ('always','hourly','daily','weekly','monthly','yearly','never')),
  open_graph jsonb not null default '{}'::jsonb, x_card jsonb not null default '{}'::jsonb,
  keywords text[] not null default '{}', schema_config jsonb not null default '{}'::jsonb,
  faq_items jsonb not null default '[]'::jsonb, related_page_keys text[] not null default '{}', related_post_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique check (slug = lower(slug) and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text not null default '', seo jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.tags (
  id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique check (slug = lower(slug) and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text not null default '', seo jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.post_categories (
  post_id uuid not null references public.posts(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade, primary key (post_id, category_id)
);
create table public.post_tags (
  post_id uuid not null references public.posts(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade, primary key (post_id, tag_id)
);

create table public.redirects (
  id uuid primary key default gen_random_uuid(), source_path text not null unique check (source_path like '/%'),
  destination text not null, status_code integer not null check (status_code in (301,302,307,308)), enabled boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), constraint redirect_not_self check (source_path <> destination)
);
create table public.redirect_history (
  id uuid primary key default gen_random_uuid(), redirect_id uuid not null references public.redirects(id) on delete cascade,
  previous_value jsonb not null, changed_at timestamptz not null default now()
);
create table public.site_settings (
  id boolean primary key default true check (id), site_name text not null default 'SoloCalculator',
  title_template text not null default '%s | SoloCalculator',
  default_description text not null default 'Free, easy-to-use calculators for everyday maths, dates, loans, conversions and more.',
  default_social_image_id uuid references public.media(id) on delete set null, organization jsonb not null default '{}'::jsonb,
  social_profiles text[] not null default '{}', verification_tokens jsonb not null default '{}'::jsonb,
  robots_rules jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now()
);
create table public.seo_audit_results (
  id uuid primary key default gen_random_uuid(), resource_type text not null check (resource_type in ('post','page','category','tag','site')),
  resource_id text not null, issues jsonb not null default '[]'::jsonb, checked_at timestamptz not null default now(), unique (resource_type, resource_id)
);

create trigger set_profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger set_media_updated_at before update on public.media for each row execute function public.set_updated_at();
create trigger set_posts_updated_at before update on public.posts for each row execute function public.set_updated_at();
create trigger set_page_seo_updated_at before update on public.page_seo for each row execute function public.set_updated_at();
create trigger set_categories_updated_at before update on public.categories for each row execute function public.set_updated_at();
create trigger set_tags_updated_at before update on public.tags for each row execute function public.set_updated_at();
create trigger set_redirects_updated_at before update on public.redirects for each row execute function public.set_updated_at();
create trigger set_site_settings_updated_at before update on public.site_settings for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.media enable row level security;
alter table public.posts enable row level security;
alter table public.post_revisions enable row level security;
alter table public.page_seo enable row level security;
alter table public.categories enable row level security;
alter table public.tags enable row level security;
alter table public.post_categories enable row level security;
alter table public.post_tags enable row level security;
alter table public.redirects enable row level security;
alter table public.redirect_history enable row level security;
alter table public.site_settings enable row level security;
alter table public.seo_audit_results enable row level security;

create policy "owner reads profiles" on public.profiles for select to authenticated using ((select public.is_owner()));
create policy "owner inserts profiles" on public.profiles for insert to authenticated with check ((select public.is_owner()));
create policy "owner updates profiles" on public.profiles for update to authenticated using ((select public.is_owner())) with check ((select public.is_owner()));
create policy "owner deletes profiles" on public.profiles for delete to authenticated using ((select public.is_owner()));
create policy "public reads media metadata" on public.media for select to anon, authenticated using (true);
create policy "owner reads every post" on public.posts for select to authenticated using ((select public.is_owner()));
create policy "public reads published posts" on public.post_revisions for select to anon, authenticated using (is_current and published_at <= now());
create policy "public reads page seo" on public.page_seo for select to anon, authenticated using (true);
create policy "public reads categories" on public.categories for select to anon, authenticated using (true);
create policy "public reads tags" on public.tags for select to anon, authenticated using (true);
create policy "public reads post categories" on public.post_categories for select to anon, authenticated using (exists (select 1 from public.posts where posts.id = post_id and status = 'published' and published_at <= now()));
create policy "public reads post tags" on public.post_tags for select to anon, authenticated using (exists (select 1 from public.posts where posts.id = post_id and status = 'published' and published_at <= now()));
create policy "public reads enabled redirects" on public.redirects for select to anon, authenticated using (enabled);
create policy "public reads site settings" on public.site_settings for select to anon, authenticated using (true);

do $$
declare table_name text;
begin
  foreach table_name in array array['media','posts','post_revisions','page_seo','categories','tags','post_categories','post_tags','redirects','redirect_history','site_settings','seo_audit_results'] loop
    execute format('create policy "owner inserts %1$s" on public.%1$I for insert to authenticated with check ((select public.is_owner()))', table_name);
    execute format('create policy "owner updates %1$s" on public.%1$I for update to authenticated using ((select public.is_owner())) with check ((select public.is_owner()))', table_name);
    execute format('create policy "owner deletes %1$s" on public.%1$I for delete to authenticated using ((select public.is_owner()))', table_name);
  end loop;
end $$;

grant usage on schema public to anon, authenticated;
grant select on public.media to anon, authenticated;
grant select on public.posts to anon, authenticated;
grant insert, update, delete on public.posts to authenticated;
grant select on public.post_revisions to anon, authenticated;
grant insert, update, delete on public.post_revisions to authenticated;
grant select on public.page_seo, public.categories, public.tags, public.post_categories, public.post_tags, public.redirects, public.site_settings to anon, authenticated;
grant select, insert, update, delete on public.profiles, public.media, public.page_seo, public.categories, public.tags, public.post_categories, public.post_tags, public.redirects, public.redirect_history, public.site_settings, public.seo_audit_results to authenticated;
grant usage, select on all sequences in schema public to authenticated;

create or replace function public.publish_post(p_post_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
declare next_revision integer;
begin
  if not (select public.is_owner()) then raise exception 'owner access required'; end if;
  select coalesce(max(revision), 0) + 1 into next_revision from public.post_revisions where post_id = p_post_id;
  update public.post_revisions set is_current = false where post_id = p_post_id and is_current;
  insert into public.post_revisions (post_id, revision, title, slug, excerpt, sanitized_html, author_display_name, featured_image_id, social_image_id, seo, related_page_keys, related_post_ids, published_at, is_current)
  select id, next_revision, title, slug, excerpt, sanitized_html, author_display_name, featured_image_id, social_image_id, seo, related_page_keys, related_post_ids, coalesce(published_at, now()), true
  from public.posts where id = p_post_id and status = 'published';
  if not found then raise exception 'publishable post not found'; end if;
end $$;
revoke execute on function public.publish_post(uuid) from public, anon;
grant execute on function public.publish_post(uuid) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 10485760, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
create policy "owner inserts media objects" on storage.objects for insert to authenticated with check (bucket_id = 'media' and (select public.is_owner()));
create policy "owner selects media objects" on storage.objects for select to authenticated using (bucket_id = 'media' and (select public.is_owner()));
create policy "owner updates media objects" on storage.objects for update to authenticated using (bucket_id = 'media' and (select public.is_owner())) with check (bucket_id = 'media' and (select public.is_owner()));
create policy "owner deletes media objects" on storage.objects for delete to authenticated using (bucket_id = 'media' and (select public.is_owner()));
