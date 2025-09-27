-- Adjust uniqueness to be per-user so multiple users can import the same MTGJSON products
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_mtgjson_uuid_key;

-- Create composite unique constraint on (user_id, mtgjson_uuid)
ALTER TABLE public.products
ADD CONSTRAINT products_user_mtgjson_unique UNIQUE (user_id, mtgjson_uuid);
