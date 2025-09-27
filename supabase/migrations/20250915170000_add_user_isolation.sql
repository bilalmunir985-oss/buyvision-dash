-- Add user isolation to all tables
-- This migration adds user_id columns and updates RLS policies to ensure data isolation

-- Add user_id column to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id column to product_contents table  
ALTER TABLE public.product_contents ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id column to daily_metrics table
ALTER TABLE public.daily_metrics ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id column to upc_candidates table
ALTER TABLE public.upc_candidates ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create indexes for user_id columns for performance
CREATE INDEX IF NOT EXISTS idx_products_user_id ON public.products(user_id);
CREATE INDEX IF NOT EXISTS idx_product_contents_user_id ON public.product_contents(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_metrics_user_id ON public.daily_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_upc_candidates_user_id ON public.upc_candidates(user_id);

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Authenticated users can view products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can manage products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can view product_contents" ON public.product_contents;
DROP POLICY IF EXISTS "Authenticated users can manage product_contents" ON public.product_contents;
DROP POLICY IF EXISTS "Authenticated users can view daily_metrics" ON public.daily_metrics;
DROP POLICY IF EXISTS "Authenticated users can manage daily_metrics" ON public.daily_metrics;
DROP POLICY IF EXISTS "Authenticated users can view upc_candidates" ON public.upc_candidates;
DROP POLICY IF EXISTS "Authenticated users can manage upc_candidates" ON public.upc_candidates;

-- Create new user-specific RLS policies for products
CREATE POLICY "Users can view their own products" 
ON public.products FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own products" 
ON public.products FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own products" 
ON public.products FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own products" 
ON public.products FOR DELETE 
USING (auth.uid() = user_id);

-- Create new user-specific RLS policies for product_contents
CREATE POLICY "Users can view their own product_contents" 
ON public.product_contents FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own product_contents" 
ON public.product_contents FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own product_contents" 
ON public.product_contents FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own product_contents" 
ON public.product_contents FOR DELETE 
USING (auth.uid() = user_id);

-- Create new user-specific RLS policies for daily_metrics
CREATE POLICY "Users can view their own daily_metrics" 
ON public.daily_metrics FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own daily_metrics" 
ON public.daily_metrics FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily_metrics" 
ON public.daily_metrics FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own daily_metrics" 
ON public.daily_metrics FOR DELETE 
USING (auth.uid() = user_id);

-- Create new user-specific RLS policies for upc_candidates
CREATE POLICY "Users can view their own upc_candidates" 
ON public.upc_candidates FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own upc_candidates" 
ON public.upc_candidates FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own upc_candidates" 
ON public.upc_candidates FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own upc_candidates" 
ON public.upc_candidates FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to automatically set user_id on insert
CREATE OR REPLACE FUNCTION public.set_user_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.user_id = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers to automatically set user_id
DROP TRIGGER IF EXISTS set_products_user_id ON public.products;
CREATE TRIGGER set_products_user_id
  BEFORE INSERT ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.set_user_id();

DROP TRIGGER IF EXISTS set_product_contents_user_id ON public.product_contents;
CREATE TRIGGER set_product_contents_user_id
  BEFORE INSERT ON public.product_contents
  FOR EACH ROW
  EXECUTE FUNCTION public.set_user_id();

DROP TRIGGER IF EXISTS set_daily_metrics_user_id ON public.daily_metrics;
CREATE TRIGGER set_daily_metrics_user_id
  BEFORE INSERT ON public.daily_metrics
  FOR EACH ROW
  EXECUTE FUNCTION public.set_user_id();

DROP TRIGGER IF EXISTS set_upc_candidates_user_id ON public.upc_candidates;
CREATE TRIGGER set_upc_candidates_user_id
  BEFORE INSERT ON public.upc_candidates
  FOR EACH ROW
  EXECUTE FUNCTION public.set_user_id();

-- Note: Existing data will have NULL user_id values
-- This is intentional - existing data will be visible to all users until manually assigned
-- New data created after this migration will be properly isolated by user
