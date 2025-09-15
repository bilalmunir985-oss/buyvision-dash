-- Add UPC columns to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS upc text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS upc_is_verified boolean NOT NULL DEFAULT false;