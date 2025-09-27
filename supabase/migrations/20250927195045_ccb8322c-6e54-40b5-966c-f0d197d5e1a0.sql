-- Ensure user isolation is properly implemented across all tables
-- This migration ensures user_id is NOT NULL and has proper RLS policies

-- First, ensure all tables have user_id NOT NULL constraint
ALTER TABLE public.products ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.product_contents ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.daily_metrics ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.upc_candidates ALTER COLUMN user_id SET NOT NULL;

-- Ensure RLS is enabled on all tables
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upc_candidates ENABLE ROW LEVEL SECURITY;

-- Drop and recreate RLS policies to ensure they're correct
DROP POLICY IF EXISTS "Users can view their own products" ON public.products;
DROP POLICY IF EXISTS "Users can insert their own products" ON public.products;
DROP POLICY IF EXISTS "Users can update their own products" ON public.products;
DROP POLICY IF EXISTS "Users can delete their own products" ON public.products;

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

-- Similar policies for product_contents
DROP POLICY IF EXISTS "Users can view their own product_contents" ON public.product_contents;
DROP POLICY IF EXISTS "Users can insert their own product_contents" ON public.product_contents;
DROP POLICY IF EXISTS "Users can update their own product_contents" ON public.product_contents;
DROP POLICY IF EXISTS "Users can delete their own product_contents" ON public.product_contents;

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

-- Similar policies for daily_metrics
DROP POLICY IF EXISTS "Users can view their own daily_metrics" ON public.daily_metrics;
DROP POLICY IF EXISTS "Users can insert their own daily_metrics" ON public.daily_metrics;
DROP POLICY IF EXISTS "Users can update their own daily_metrics" ON public.daily_metrics;
DROP POLICY IF EXISTS "Users can delete their own daily_metrics" ON public.daily_metrics;

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

-- Similar policies for upc_candidates
DROP POLICY IF EXISTS "Users can view their own upc_candidates" ON public.upc_candidates;
DROP POLICY IF EXISTS "Users can insert their own upc_candidates" ON public.upc_candidates;
DROP POLICY IF EXISTS "Users can update their own upc_candidates" ON public.upc_candidates;
DROP POLICY IF EXISTS "Users can delete their own upc_candidates" ON public.upc_candidates;

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

-- Add index to improve performance of user-filtered queries
CREATE INDEX IF NOT EXISTS idx_products_user_id ON public.products(user_id);
CREATE INDEX IF NOT EXISTS idx_product_contents_user_id ON public.product_contents(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_metrics_user_id ON public.daily_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_upc_candidates_user_id ON public.upc_candidates(user_id);