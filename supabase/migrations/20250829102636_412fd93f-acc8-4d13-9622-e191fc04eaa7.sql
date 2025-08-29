-- Drop the view that depends on tcg_is_verified column
DROP VIEW IF EXISTS public.vw_unmapped_products;

-- Remove TCGplayer-specific columns from products table
ALTER TABLE public.products DROP COLUMN IF EXISTS tcgplayer_product_id;
ALTER TABLE public.products DROP COLUMN IF EXISTS tcg_is_verified;

-- Add CardTrader mapping columns
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cardtrader_mapping_id UUID REFERENCES public.product_mappings(id);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cardtrader_is_verified BOOLEAN NOT NULL DEFAULT false;

-- Recreate the view for unmapped products using CardTrader fields
CREATE VIEW public.vw_unmapped_products AS
SELECT p.id, p.name, p.set_code, p.type
FROM public.products p
WHERE p.cardtrader_is_verified = false 
  AND p.active = true;