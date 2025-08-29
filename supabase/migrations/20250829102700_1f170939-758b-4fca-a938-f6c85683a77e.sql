-- Fix security definer view by recreating it with SECURITY INVOKER
DROP VIEW IF EXISTS public.vw_unmapped_products;

CREATE VIEW public.vw_unmapped_products 
WITH (security_invoker = true) AS
SELECT p.id, p.name, p.set_code, p.type
FROM public.products p
WHERE p.cardtrader_is_verified = false 
  AND p.active = true;