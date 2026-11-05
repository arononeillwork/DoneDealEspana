-- Reduce the CIME CO-05 coffee machine to €1,500.
update public.listings
   set price = 1500, updated_at = now()
 where id = '207afb06-86e1-406a-9db3-9b60ac5ccd36';
