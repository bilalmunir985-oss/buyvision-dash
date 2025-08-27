-- Fix the view security issue by recreating without SECURITY DEFINER
DROP VIEW IF EXISTS vw_unmapped_products;

CREATE VIEW vw_unmapped_products 
SECURITY INVOKER
AS
SELECT id, name, set_code, type
FROM products
WHERE COALESCE(tcg_is_verified, false) = false
ORDER BY set_code NULLS LAST, name;