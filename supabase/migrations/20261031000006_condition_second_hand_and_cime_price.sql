-- Add "Second hand" (used) as a listing condition, and set the CIME coffee machine to
-- second hand at €2,500.
alter table public.listings drop constraint listings_condition_check;
alter table public.listings add constraint listings_condition_check
  check (condition in ('new', 'used', 'like_new', 'good', 'fair', 'for_parts'));

update public.listings
   set condition = 'used', price = 2500, updated_at = now()
 where title like 'CIME CO-05%';
