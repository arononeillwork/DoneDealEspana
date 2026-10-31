-- Second listing: Xiaomi Mi Electric Scooter Pro 2, Mercedes-AMG Petronas F1 Team Edition.
-- Name and headline specs taken from MediaMarkt product 1506304. Photos, price and condition
-- are added by the owner from "Edit listing". Handed to the owner via public.listing_claims.

insert into public.listings (title, description, price, category, condition, brand, location, specifics, images, status)
values (
  'Patinete eléctrico Xiaomi Mi Electric Scooter Pro 2 Mercedes-AMG Petronas F1 Team Ed. 600W 25 km/h Negro',
  E'Xiaomi Mi Electric Scooter Pro 2, Mercedes-AMG Petronas F1 Team Edition, in black.\n\n• Includes tubeless tyres, so it is puncture-free\n• 600 W motor\n• Top speed 25 km/h\n• Folding design for easy carrying and storage',
  null,
  'motor',
  null,
  'Xiaomi',
  null,
  '[
    {"label": "Brand", "value": "Xiaomi"},
    {"label": "Model", "value": "Mi Electric Scooter Pro 2"},
    {"label": "Edition", "value": "Mercedes-AMG Petronas F1 Team"},
    {"label": "Motor power", "value": "600 W"},
    {"label": "Top speed", "value": "25 km/h"},
    {"label": "Tyres", "value": "Tubeless (puncture-free)"},
    {"label": "Colour", "value": "Black"}
  ]'::jsonb,
  '{}',
  'active'
);
