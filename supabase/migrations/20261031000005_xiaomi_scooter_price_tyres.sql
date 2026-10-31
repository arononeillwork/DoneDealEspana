-- Xiaomi scooter: price €350, and the €80 puncture-free tubeless wheel upgrade in the description.
update public.listings
   set price = 350,
       description = E'Xiaomi Mi Electric Scooter Pro 2, Mercedes-AMG Petronas F1 Team Edition, in black.\n\n• Puncture-free tubeless wheels fitted: an €80 upgrade, included in the price\n• 600 W motor\n• Top speed 25 km/h\n• Folding design for easy carrying and storage',
       specifics = '[
         {"label": "Brand", "value": "Xiaomi"},
         {"label": "Model", "value": "Mi Electric Scooter Pro 2"},
         {"label": "Edition", "value": "Mercedes-AMG Petronas F1 Team"},
         {"label": "Motor power", "value": "600 W"},
         {"label": "Top speed", "value": "25 km/h"},
         {"label": "Tyres", "value": "Tubeless, puncture-free (€80 upgrade, included)"},
         {"label": "Colour", "value": "Black"}
       ]'::jsonb,
       updated_at = now()
 where title like 'Patinete eléctrico Xiaomi Mi Electric Scooter Pro 2 Mercedes-AMG%';
