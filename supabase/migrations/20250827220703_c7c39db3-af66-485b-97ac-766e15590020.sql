-- Add indexes and helpful view for TCGplayer mapping
CREATE INDEX IF NOT EXISTS idx_products_tcg_verified ON products (tcg_is_verified);
CREATE INDEX IF NOT EXISTS idx_products_set_code ON products (set_code);

-- Optional: a skinny view for unmapped products the UI will read
CREATE OR REPLACE VIEW vw_unmapped_products AS
SELECT id, name, set_code, type
FROM products
WHERE COALESCE(tcg_is_verified, false) = false
ORDER BY set_code NULLS LAST, name;