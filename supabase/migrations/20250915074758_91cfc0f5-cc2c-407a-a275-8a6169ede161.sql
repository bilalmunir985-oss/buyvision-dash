-- Add UPC columns to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS upc text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS upc_is_verified boolean NOT NULL DEFAULT false;

-- Create UPC candidates table for staging
CREATE TABLE IF NOT EXISTS upc_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  scraped_name text,
  scraped_upc text,
  wpn_url text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on upc_candidates table
ALTER TABLE upc_candidates ENABLE ROW LEVEL SECURITY;

-- Create policies for upc_candidates
CREATE POLICY "Authenticated users can manage upc_candidates" 
ON upc_candidates FOR ALL 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view upc_candidates" 
ON upc_candidates FOR SELECT 
USING (auth.role() = 'authenticated');