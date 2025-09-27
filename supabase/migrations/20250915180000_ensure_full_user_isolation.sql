-- Ensure full user isolation for all existing data
-- This migration assigns existing data to a system user or handles it properly

-- First, let's create a system user for orphaned data (optional)
-- This is for data that existed before user isolation
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
    
END $$;

-- Update RLS policies to be more restrictive
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

-- Add NOT NULL constraint to user_id columns to prevent future orphaned data
ALTER TABLE public.products ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.product_contents ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.daily_metrics ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.upc_candidates ALTER COLUMN user_id SET NOT NULL;

