-- Clean up TCGplayer columns and add CardTrader mapping
-- Remove TCGplayer-specific columns from products table
ALTER TABLE public.products DROP COLUMN IF EXISTS tcgplayer_product_id;
ALTER TABLE public.products DROP COLUMN IF EXISTS tcg_is_verified;

-- Add CardTrader mapping columns
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cardtrader_mapping_id UUID REFERENCES public.product_mappings(id);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cardtrader_is_verified BOOLEAN NOT NULL DEFAULT false;

-- Update product_mappings table structure to better match CardTrader
ALTER TABLE public.product_mappings DROP CONSTRAINT IF EXISTS product_mappings_mtg_product_id_blueprint_id_key;
ALTER TABLE public.product_mappings ADD CONSTRAINT unique_mapping UNIQUE (mtg_product_id, blueprint_id);