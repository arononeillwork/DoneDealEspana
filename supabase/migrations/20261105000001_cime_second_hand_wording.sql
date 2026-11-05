-- CIME coffee machine is second hand: drop "BRAND NEW" from the title and description,
-- and describe what it needs (one group head control board; the other two work fine).
-- Price is left as the owner set it on the site.
update public.listings
   set title = 'CIME CO-05 MULTI BOILER PID 3 GROUP ESPRESSO COFFEE MACHINE BLACK',
       description = E'Second-hand CIME CO-05 multi-boiler espresso machine with three E61 group heads and PID temperature control, finished in matte total black.\n\nCondition\n• 2 of the 3 group heads are working fine\n• 1 group head needs a replacement control board. The part can be bought online from CIME coffee machine parts suppliers.\n\nFeatures\n• Matte total black body\n• 3 × E61 group heads\n• PID temperature control\n• Programmable volumetric controls\n• 12 L boiler\n• Shot timer and electronic display\n• Internal rotary pump\n• Hot water tap\n• Dual steam wands\n\nPower: 4000 W / 20 A single-phase\nDimensions: 74 cm W × 54 cm D × 50 cm H\nWater source: direct (plumbed-in) connection',
       specifics = jsonb_build_array(
         jsonb_build_object('label', 'Working group heads', 'value', '2 of 3 (1 needs a replacement control board)')
       ) || specifics,
       updated_at = now()
 where id = '207afb06-86e1-406a-9db3-9b60ac5ccd36'
   and title like '%BRAND NEW%';
