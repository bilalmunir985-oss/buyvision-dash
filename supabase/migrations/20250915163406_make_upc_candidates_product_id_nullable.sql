-- Make product_id nullable in upc_candidates table to allow unmatched candidates
ALTER TABLE public.upc_candidates ALTER COLUMN product_id DROP NOT NULL;





