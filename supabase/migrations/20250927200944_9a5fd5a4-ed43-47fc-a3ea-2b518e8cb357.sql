-- Clear all data for fresh start while keeping table structures

-- Step 1: Clear all product-related data
TRUNCATE TABLE public.product_contents RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.daily_metrics RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.upc_candidates RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.products RESTART IDENTITY CASCADE;

-- Step 2: Clear all user accounts from auth schema
-- This will cascade and remove all user-related auth data
DELETE FROM auth.users;

-- Step 3: Reset any sequences to start from 1
-- (TRUNCATE with RESTART IDENTITY should handle this, but being explicit)
SELECT setval(pg_get_serial_sequence('public.products', 'id'), 1, false) WHERE pg_get_serial_sequence('public.products', 'id') IS NOT NULL;
SELECT setval(pg_get_serial_sequence('public.product_contents', 'id'), 1, false) WHERE pg_get_serial_sequence('public.product_contents', 'id') IS NOT NULL;
SELECT setval(pg_get_serial_sequence('public.daily_metrics', 'id'), 1, false) WHERE pg_get_serial_sequence('public.daily_metrics', 'id') IS NOT NULL;
SELECT setval(pg_get_serial_sequence('public.upc_candidates', 'id'), 1, false) WHERE pg_get_serial_sequence('public.upc_candidates', 'id') IS NOT NULL;

-- Step 4: Verify all tables are empty
SELECT 
    'products' as table_name,
    COUNT(*) as record_count
FROM public.products
UNION ALL
SELECT 
    'product_contents' as table_name,
    COUNT(*) as record_count
FROM public.product_contents
UNION ALL
SELECT 
    'daily_metrics' as table_name,
    COUNT(*) as record_count
FROM public.daily_metrics
UNION ALL
SELECT 
    'upc_candidates' as table_name,
    COUNT(*) as record_count
FROM public.upc_candidates
UNION ALL
SELECT 
    'auth_users' as table_name,
    COUNT(*) as record_count
FROM auth.users;

-- Success message
SELECT 'Database cleared successfully! All data removed while keeping table structures intact.' as status;