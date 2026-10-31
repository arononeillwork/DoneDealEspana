-- First listing: CIME CO-05 PID 3-group espresso machine.
-- Created without a seller; it is handed to the site owner's account through
-- public.listing_claims (inserted separately so no email address lives in the repo).
-- Condition and price are intentionally left empty so they can be filled in later from "Edit".

insert into public.listings (title, description, price, category, condition, brand, location, specifics, images, status)
values (
  'CIME CO-05 MULTI BOILER PID 3 GROUP ESPRESSO COFFEE MACHINE BRAND NEW BLACK',
  E'Brand new CIME CO-05 multi-boiler espresso machine with three E61 group heads and PID temperature control, finished in matte total black.\n\nFeatures\n• Matte total black body\n• 3 × E61 group heads\n• PID temperature control\n• Programmable volumetric controls\n• 12 L boiler\n• Shot timer and electronic display\n• Internal rotary pump\n• Hot water tap\n• Dual steam wands\n\nPower: 4000 W / 20 A single-phase\nDimensions: 74 cm W × 54 cm D × 50 cm H\nWater source: direct (plumbed-in) connection',
  null,
  'business',
  null,
  'CIME',
  null,
  '[
    {"label": "Brand", "value": "CIME"},
    {"label": "Water Source", "value": "Direct Connection"},
    {"label": "Color", "value": "Black"},
    {"label": "Output", "value": "Does not apply"},
    {"label": "Model", "value": "CO-05 PID"},
    {"label": "Style", "value": "Volumetric"},
    {"label": "Features", "value": [
      "Matte Total Black Body",
      "E61 Group Heads",
      "PID Temperature Control",
      "Programmable Volumetric Controls",
      "12L Boiler",
      "Shot Timer",
      "Electronic Display",
      "Internal Rotary Pump",
      "Hot Water Tap",
      "Dual Steam Wands",
      "Power: 4000 Watts / 20amp Single Phase Power",
      "Dimensions: 74cm W x 54cm D x 50cm H"
    ]},
    {"label": "MPN", "value": "Not Applicable"},
    {"label": "UPC", "value": "Does not apply"}
  ]'::jsonb,
  array['/assets/listings/cime-co-05-black.png'],
  'active'
);
