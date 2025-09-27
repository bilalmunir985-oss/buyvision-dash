-- Full User Isolation Script
-- Run this in Supabase SQL Editor to ensure complete user isolation

-- Step 1: Create a system user for orphaned data (data that existed before user isolation)
DO $$
DECLARE
    system_user_id UUID;
BEGIN
    -- Check if system user exists, if not create one
    SELECT id INTO system_user_id FROM auth.users WHERE email = 'system@orphaned-data.local';
    
    IF system_user_id IS NULL THEN
        -- Create a system user for orphaned data
        INSERT INTO auth.users (
            id,
            email,
            encrypted_password,
            email_confirmed_at,
            created_at,
            updated_at,
            raw_app_meta_data,
            raw_user_meta_data,
            is_super_admin,
            role
        ) VALUES (
            gen_random_uuid(),
            'system@orphaned-data.local',
            crypt('system-password', gen_salt('bf')),
            now(),
            now(),
            now(),
            '{"provider": "email", "providers": ["email"]}',
            '{"name": "System User"}',
            false,
            'authenticated'
        ) RETURNING id INTO system_user_id;
    END IF;
    
    -- Assign orphaned products to system user
    UPDATE public.products 
    SET user_id = system_user_id 
    WHERE user_id IS NULL;
    
    -- Assign orphaned product_contents to system user
    UPDATE public.product_contents 
    SET user_id = system_user_id 
    WHERE user_id IS NULL;
    
    -- Assign orphaned daily_metrics to system user
    UPDATE public.daily_metrics 
    SET user_id = system_user_id 
    WHERE user_id IS NULL;
    
    -- Assign orphaned upc_candidates to system user
    UPDATE public.upc_candidates 
    SET user_id = system_user_id 
    WHERE user_id IS NULL;
    
    RAISE NOTICE 'Assigned orphaned data to system user: %', system_user_id;
END $$;

-- Step 2: Update RLS policies to be more restrictive
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own products" ON public.products;
DROP POLICY IF EXISTS "Users can insert their own products" ON public.products;
DROP POLICY IF EXISTS "Users can update their own products" ON public.products;
DROP POLICY IF EXISTS "Users can delete their own products" ON public.products;

-- Create stricter RLS policies that require user_id to match
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

-- Update product_contents policies
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

-- Update daily_metrics policies
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

-- Update upc_candidates policies
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

-- Step 3: Add NOT NULL constraint to user_id columns to prevent future orphaned data
ALTER TABLE public.products ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.product_contents ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.daily_metrics ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.upc_candidates ALTER COLUMN user_id SET NOT NULL;

-- Step 4: Verify the changes
SELECT 
    'products' as table_name,
    COUNT(*) as total_records,
    COUNT(DISTINCT user_id) as unique_users
FROM public.products
UNION ALL
SELECT 
    'product_contents' as table_name,
    COUNT(*) as total_records,
    COUNT(DISTINCT user_id) as unique_users
FROM public.product_contents
UNION ALL
SELECT 
    'daily_metrics' as table_name,
    COUNT(*) as total_records,
    COUNT(DISTINCT user_id) as unique_users
FROM public.daily_metrics
UNION ALL
SELECT 
    'upc_candidates' as table_name,
    COUNT(*) as total_records,
    COUNT(DISTINCT user_id) as unique_users
FROM public.upc_candidates;

-- Step 5: Create RPC functions to bypass RLS for service role operations
CREATE OR REPLACE FUNCTION public.check_product_exists(
  p_mtgjson_uuid TEXT,
  p_user_id UUID
)
RETURNS TABLE(id UUID, user_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.user_id
  FROM public.products p
  WHERE p.mtgjson_uuid = p_mtgjson_uuid
    AND p.user_id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.insert_product(
  p_mtgjson_uuid TEXT,
  p_name TEXT,
  p_set_code TEXT,
  p_type TEXT,
  p_release_date DATE,
  p_language TEXT,
  p_raw_json JSONB,
  p_active BOOLEAN,
  p_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  product_id UUID;
BEGIN
  INSERT INTO public.products (
    mtgjson_uuid,
    name,
    set_code,
    type,
    release_date,
    language,
    raw_json,
    active,
    user_id
  ) VALUES (
    p_mtgjson_uuid,
    p_name,
    p_set_code,
    p_type,
    p_release_date,
    p_language,
    p_raw_json,
    p_active,
    p_user_id
  ) RETURNING id INTO product_id;
  
  RETURN product_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_product(
  p_id UUID,
  p_mtgjson_uuid TEXT,
  p_name TEXT,
  p_set_code TEXT,
  p_type TEXT,
  p_release_date DATE,
  p_language TEXT,
  p_raw_json JSONB,
  p_active BOOLEAN,
  p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.products SET
    mtgjson_uuid = p_mtgjson_uuid,
    name = p_name,
    set_code = p_set_code,
    type = p_type,
    release_date = p_release_date,
    language = p_language,
    raw_json = p_raw_json,
    active = p_active,
    user_id = p_user_id,
    updated_at = now()
  WHERE id = p_id;
END;
$$;

-- Grant execute permissions to service role
GRANT EXECUTE ON FUNCTION public.check_product_exists TO service_role;
GRANT EXECUTE ON FUNCTION public.insert_product TO service_role;
GRANT EXECUTE ON FUNCTION public.update_product TO service_role;

-- Success message
SELECT 'User isolation setup completed successfully!' as status;
