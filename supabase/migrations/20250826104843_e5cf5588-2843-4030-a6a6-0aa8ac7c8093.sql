-- Create products table for MTG sealed products
CREATE TABLE public.products (
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

-- Create product_contents table for product contents breakdown
CREATE TABLE public.product_contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  contained_name TEXT NOT NULL,
  quantity NUMERIC,
  rarity TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create daily_metrics table for pricing data
CREATE TABLE public.daily_metrics (
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

-- Create upc_candidates table for UPC mapping workflow
CREATE TABLE public.upc_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  scraped_name TEXT,
  scraped_upc TEXT,
  wpn_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upc_candidates ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated admin users
CREATE POLICY "Authenticated users can view products" 
ON public.products FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage products" 
ON public.products FOR ALL 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view product_contents" 
ON public.product_contents FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage product_contents" 
ON public.product_contents FOR ALL 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view daily_metrics" 
ON public.daily_metrics FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage daily_metrics" 
ON public.daily_metrics FOR ALL 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view upc_candidates" 
ON public.upc_candidates FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage upc_candidates" 
ON public.upc_candidates FOR ALL 
USING (auth.role() = 'authenticated');

-- Create indexes for performance
CREATE INDEX idx_products_mtgjson_uuid ON public.products(mtgjson_uuid);
CREATE INDEX idx_products_set_code ON public.products(set_code);
CREATE INDEX idx_products_type ON public.products(type);
CREATE INDEX idx_products_tcg_verified ON public.products(tcg_is_verified);
CREATE INDEX idx_product_contents_product_id ON public.product_contents(product_id);
CREATE INDEX idx_daily_metrics_product_date ON public.daily_metrics(product_id, as_of_date);
CREATE INDEX idx_daily_metrics_date ON public.daily_metrics(as_of_date);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for products table
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();