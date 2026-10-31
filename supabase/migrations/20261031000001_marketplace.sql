-- DoneDealEspana marketplace schema
-- Profiles, listings, favourites, conversations, messages and the €5 sale fee ledger.

create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 60),
  location    text check (char_length(location) <= 80),
  bio         text check (char_length(bio) <= 500),
  items_sold  integer not null default 0,
  created_at  timestamptz not null default now()
);

create table public.listings (
  id              uuid primary key default gen_random_uuid(),
  seller_id       uuid references public.profiles (id) on delete cascade,
  title           text not null check (char_length(title) between 3 and 120),
  description     text not null default '' check (char_length(description) <= 5000),
  price           numeric(10, 2) check (price >= 0 and price <= 10000000),
  category        text not null check (category in (
                    'motor', 'electronics', 'home', 'fashion', 'sports', 'kids',
                    'business', 'diy', 'collectibles', 'books', 'other')),
  condition       text check (condition in ('new', 'like_new', 'good', 'fair', 'for_parts')),
  brand           text check (char_length(brand) <= 60),
  location        text check (char_length(location) <= 80),
  specifics       jsonb not null default '[]'::jsonb check (jsonb_typeof(specifics) = 'array'),
  images          text[] not null default '{}' check (cardinality(images) <= 10),
  status          text not null default 'active' check (status in ('active', 'reserved', 'paused', 'sold')),
  buyer_id        uuid references public.profiles (id) on delete set null,
  view_count      integer not null default 0,
  favorites_count integer not null default 0,
  sold_at         timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index listings_status_created_idx on public.listings (status, created_at desc);
create index listings_seller_idx on public.listings (seller_id);
create index listings_buyer_idx on public.listings (buyer_id);
create index listings_category_idx on public.listings (category);
create index listings_title_trgm_idx on public.listings using gin (title extensions.gin_trgm_ops);

create table public.favorites (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);
create index favorites_listing_idx on public.favorites (listing_id);

create table public.conversations (
  id              uuid primary key default gen_random_uuid(),
  listing_id      uuid not null references public.listings (id) on delete cascade,
  buyer_id        uuid not null references public.profiles (id) on delete cascade,
  seller_id       uuid not null references public.profiles (id) on delete cascade,
  last_message    text,
  last_message_at timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  unique (listing_id, buyer_id),
  check (buyer_id <> seller_id)
);
create index conversations_buyer_idx on public.conversations (buyer_id, last_message_at desc);
create index conversations_seller_idx on public.conversations (seller_id, last_message_at desc);

create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id       uuid not null references public.profiles (id) on delete cascade,
  body            text not null check (char_length(body) between 1 and 2000),
  created_at      timestamptz not null default now(),
  read_at         timestamptz
);
create index messages_conversation_idx on public.messages (conversation_id, created_at);
create index messages_sender_idx on public.messages (sender_id);
create index messages_unread_idx on public.messages (conversation_id) where read_at is null;

-- Ledger of the fixed sale fee a seller pays (via Stripe Checkout) to mark an item as sold.
create table public.sale_fees (
  id                    uuid primary key default gen_random_uuid(),
  listing_id            uuid references public.listings (id) on delete set null,
  listing_title         text,
  seller_id             uuid references public.profiles (id) on delete set null,
  buyer_id              uuid references public.profiles (id) on delete set null,
  amount_cents          integer not null default 500,
  currency              text not null default 'eur',
  status                text not null default 'pending' check (status in ('pending', 'paid', 'expired')),
  stripe_session_id     text unique,
  stripe_payment_intent text,
  created_at            timestamptz not null default now(),
  paid_at               timestamptz
);
create index sale_fees_seller_idx on public.sale_fees (seller_id, created_at desc);
create index sale_fees_listing_idx on public.sale_fees (listing_id);
create index sale_fees_buyer_idx on public.sale_fees (buyer_id);

-- Private: listings pre-loaded for someone who has not signed up yet.
-- Assigned to the account automatically once that email address is confirmed.
create table public.listing_claims (
  listing_id uuid primary key references public.listings (id) on delete cascade,
  email      text not null
);

-- ---------------------------------------------------------------------------
-- Privileges (column-level, so protected columns can only change server-side)
-- ---------------------------------------------------------------------------

revoke all on public.profiles, public.listings, public.favorites, public.conversations,
  public.messages, public.sale_fees, public.listing_claims from anon, authenticated;

grant select on public.profiles, public.listings to anon, authenticated;
grant update (display_name, location, bio) on public.profiles to authenticated;

grant insert (id, seller_id, title, description, price, category, condition, brand, location, specifics, images, status)
  on public.listings to authenticated;
grant update (title, description, price, category, condition, brand, location, specifics, images, status)
  on public.listings to authenticated;
grant delete on public.listings to authenticated;

grant select, insert, delete on public.favorites to authenticated;
grant select on public.conversations to authenticated;
grant select on public.messages to authenticated;
grant insert (conversation_id, sender_id, body) on public.messages to authenticated;
grant select on public.sale_fees to authenticated;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.favorites enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.sale_fees enable row level security;
alter table public.listing_claims enable row level security; -- no policies: server-side only

create policy "profiles are public" on public.profiles
  for select to anon, authenticated using (true);
create policy "users edit own profile" on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "listings are public unless paused" on public.listings
  for select to anon, authenticated
  using (status <> 'paused' or seller_id = (select auth.uid()));
create policy "sellers create own listings" on public.listings
  for insert to authenticated
  with check (seller_id = (select auth.uid()) and status in ('active', 'paused'));
create policy "sellers edit own listings" on public.listings
  for update to authenticated
  using (seller_id = (select auth.uid())) with check (seller_id = (select auth.uid()));
create policy "sellers delete own unsold listings" on public.listings
  for delete to authenticated
  using (seller_id = (select auth.uid()) and status <> 'sold');

create policy "users see own favourites" on public.favorites
  for select to authenticated using (user_id = (select auth.uid()));
create policy "users add own favourites" on public.favorites
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "users remove own favourites" on public.favorites
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "participants see conversations" on public.conversations
  for select to authenticated
  using ((select auth.uid()) in (buyer_id, seller_id));

create policy "participants read messages" on public.messages
  for select to authenticated
  using (exists (
    select 1 from public.conversations c
    where c.id = conversation_id and (select auth.uid()) in (c.buyer_id, c.seller_id)));
create policy "participants send messages" on public.messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (select auth.uid()) in (c.buyer_id, c.seller_id)));

create policy "sellers see own sale fees" on public.sale_fees
  for select to authenticated using (seller_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- Assign pre-loaded listings to the account that confirms the matching email.
create or replace function public.claim_listings_for(p_user uuid, p_email text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_email is null then return; end if;
  update public.listings l set seller_id = p_user
    from public.listing_claims c
   where c.listing_id = l.id and l.seller_id is null and lower(c.email) = lower(p_email);
  delete from public.listing_claims c
   using public.listings l
   where c.listing_id = l.id and l.seller_id = p_user;
end $$;
revoke execute on function public.claim_listings_for(uuid, text) from public, anon, authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_name text := nullif(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), '');
  v_loc  text := nullif(trim(coalesce(new.raw_user_meta_data ->> 'location', '')), '');
begin
  insert into public.profiles (id, display_name, location)
  values (new.id, left(coalesce(v_name, 'Member'), 60), left(v_loc, 80))
  on conflict (id) do nothing;
  if new.email_confirmed_at is not null then
    perform public.claim_listings_for(new.id, new.email);
  end if;
  return new;
end $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create or replace function public.handle_user_confirmed()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.email_confirmed_at is not null and old.email_confirmed_at is null then
    perform public.claim_listings_for(new.id, new.email);
  end if;
  return new;
end $$;
revoke execute on function public.handle_user_confirmed() from public, anon, authenticated;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
create trigger on_auth_user_confirmed after update of email_confirmed_at on auth.users
  for each row execute function public.handle_user_confirmed();

-- Runs as the caller: only blocks direct edits made by signed-in users from the website.
-- "sold" can only be set by the server once the sale fee has been paid.
create or replace function public.listings_guard()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('authenticated', 'anon') then
    if new.status = 'sold' and old.status is distinct from 'sold' then
      raise exception 'An item is marked as sold once the sale fee has been paid.';
    end if;
    if old.status = 'sold' and new.status <> 'sold' then
      raise exception 'Sold items cannot be put back on sale. Create a new listing instead.';
    end if;
    new.updated_at := now();
  end if;
  if new.status = 'sold' and old.status is distinct from 'sold' then
    new.sold_at := coalesce(new.sold_at, now());
  end if;
  return new;
end $$;

create trigger listings_guard before update on public.listings
  for each row execute function public.listings_guard();

-- Keep each seller's "items sold" counter in step with their listings.
create or replace function public.listings_count_sale()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'sold' and old.status is distinct from 'sold' and new.seller_id is not null then
    update public.profiles set items_sold = items_sold + 1 where id = new.seller_id;
  end if;
  return null;
end $$;
revoke execute on function public.listings_count_sale() from public, anon, authenticated;

create trigger listings_count_sale after update of status on public.listings
  for each row execute function public.listings_count_sale();

create or replace function public.favorites_count()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    update public.listings set favorites_count = favorites_count + 1 where id = new.listing_id;
  else
    update public.listings set favorites_count = greatest(favorites_count - 1, 0) where id = old.listing_id;
  end if;
  return null;
end $$;
revoke execute on function public.favorites_count() from public, anon, authenticated;

create trigger favorites_count after insert or delete on public.favorites
  for each row execute function public.favorites_count();

create or replace function public.messages_touch_conversation()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.conversations
     set last_message = left(new.body, 140), last_message_at = new.created_at
   where id = new.conversation_id;
  return null;
end $$;
revoke execute on function public.messages_touch_conversation() from public, anon, authenticated;

create trigger messages_touch_conversation after insert on public.messages
  for each row execute function public.messages_touch_conversation();

-- ---------------------------------------------------------------------------
-- RPCs used by the website
-- ---------------------------------------------------------------------------

create or replace function public.register_view(p_listing uuid)
returns void language sql security definer set search_path = '' as $$
  update public.listings set view_count = view_count + 1
   where id = p_listing and status <> 'paused' and seller_id is distinct from auth.uid();
$$;
revoke execute on function public.register_view(uuid) from public;
grant execute on function public.register_view(uuid) to anon, authenticated;

create or replace function public.start_conversation(p_listing uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_seller uuid;
  v_status text;
  v_id uuid;
begin
  if v_uid is null then raise exception 'Please log in to message sellers.'; end if;
  select seller_id, status into v_seller, v_status from public.listings where id = p_listing;
  if not found then raise exception 'Listing not found.'; end if;
  if v_seller is null then raise exception 'This seller is not taking messages yet.'; end if;
  if v_seller = v_uid then raise exception 'This is your own listing.'; end if;
  select id into v_id from public.conversations where listing_id = p_listing and buyer_id = v_uid;
  if v_id is not null then return v_id; end if;
  if v_status not in ('active', 'reserved') then raise exception 'This item is no longer available.'; end if;
  insert into public.conversations (listing_id, buyer_id, seller_id)
  values (p_listing, v_uid, v_seller)
  on conflict (listing_id, buyer_id) do update set listing_id = excluded.listing_id
  returning id into v_id;
  return v_id;
end $$;
revoke execute on function public.start_conversation(uuid) from public, anon;
grant execute on function public.start_conversation(uuid) to authenticated;

create or replace function public.mark_conversation_read(p_conversation uuid)
returns void language sql security definer set search_path = '' as $$
  update public.messages m set read_at = now()
   where m.conversation_id = p_conversation
     and m.read_at is null
     and m.sender_id <> auth.uid()
     and exists (select 1 from public.conversations c
                  where c.id = p_conversation and auth.uid() in (c.buyer_id, c.seller_id));
$$;
revoke execute on function public.mark_conversation_read(uuid) from public, anon;
grant execute on function public.mark_conversation_read(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: public listing photos, writable only inside the owner's folder
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-images', 'listing-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "owners upload listing images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'listing-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "owners see own listing images" on storage.objects
  for select to authenticated
  using (bucket_id = 'listing-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "owners delete listing images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'listing-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ---------------------------------------------------------------------------
-- Realtime chat
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table public.messages;
