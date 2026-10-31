-- Photos for the Xiaomi Mi Electric Scooter Pro 2 (Mercedes-AMG Petronas F1 Team Ed.) listing,
-- shipped with the site under /assets/listings/. First photo is the cover.
update public.listings
   set images = array[
     '/assets/listings/xiaomi-pro2-amg-1-side.jpg',
     '/assets/listings/xiaomi-pro2-amg-2-folded.jpg',
     '/assets/listings/xiaomi-pro2-amg-3-rear-wheel.jpg',
     '/assets/listings/xiaomi-pro2-amg-4-display.jpg'
   ]
 where title like 'Patinete eléctrico Xiaomi Mi Electric Scooter Pro 2 Mercedes-AMG%'
   and cardinality(images) = 0;
