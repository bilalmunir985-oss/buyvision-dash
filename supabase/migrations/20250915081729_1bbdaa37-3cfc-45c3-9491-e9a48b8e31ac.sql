-- Extensions for fuzzy matching (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;

-- RPC for best fuzzy match within a set_code
CREATE OR REPLACE FUNCTION public.find_best_product_match(p_set_code text, p_scraped_name text)
RETURNS TABLE (id uuid, name text, set_code text, sim double precision)
LANGUAGE sql STABLE AS $$
  SELECT p.id, p.name, p.set_code,
         GREATEST(similarity(p.name, p_scraped_name), similarity(lower(p.name), lower(p_scraped_name))) as sim
  FROM products p
  WHERE p.set_code = p_set_code
  ORDER BY sim DESC
  LIMIT 1;
$$;

-- Add unique constraint to prevent duplicate candidates
CREATE UNIQUE INDEX IF NOT EXISTS upc_candidates_unique_product_upc
  ON upc_candidates (product_id, COALESCE(scraped_upc, ''));