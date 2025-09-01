-- Create the products table as specified
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mtgjson_uuid TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  set_code TEXT,
  type TEXT NOT NULL,
  release_date DATE,
  language TEXT DEFAULT 'English',
  raw_json JSONB,
  tcgplayer_product_id BIGINT,
  tcg_is_verified BOOLEAN NOT NULL DEFAULT false,
  upc TEXT,
  upc_is_verified BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create the product_contents table
CREATE TABLE IF NOT EXISTS public.product_contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  contained_name TEXT NOT NULL,
  quantity NUMERIC,
  rarity TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create the daily_metrics table
CREATE TABLE IF NOT EXISTS public.daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  as_of_date DATE NOT NULL,
  product_url TEXT,
  lowest_total_price NUMERIC,
  lowest_item_price NUMERIC,
  num_listings INTEGER,
  total_quantity_listed INTEGER,
  target_product_cost NUMERIC,
  max_product_cost NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, as_of_date)
);

-- Create the upc_candidates table
CREATE TABLE IF NOT EXISTS public.upc_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  scraped_name TEXT,
  scraped_upc TEXT,
  wpn_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upc_candidates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for authenticated users
CREATE POLICY "Authenticated users can manage products" 
ON public.products 
FOR ALL 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage product_contents" 
ON public.product_contents 
FOR ALL 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage daily_metrics" 
ON public.daily_metrics 
FOR ALL 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage upc_candidates" 
ON public.upc_candidates 
FOR ALL 
USING (auth.role() = 'authenticated');

-- Create trigger for updating updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add trigger to products table
DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();