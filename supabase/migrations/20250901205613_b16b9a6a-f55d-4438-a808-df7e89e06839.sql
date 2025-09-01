-- Add the missing columns from the original spec
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS tcgplayer_product_id BIGINT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS tcg_is_verified BOOLEAN NOT NULL DEFAULT false;

-- Remove the incorrect column
ALTER TABLE public.products DROP COLUMN IF EXISTS is_tcgverified;