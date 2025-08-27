-- Create the MTGJSON import function
CREATE OR REPLACE FUNCTION import_mtgjson_products()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  -- This would normally fetch from MTGJSON API, but for now we'll create some sample data
  INSERT INTO products (mtgjson_uuid, name, set_code, type, release_date, language, raw_json, tcg_is_verified, active)
  VALUES 
    ('AFR-CB-BOX-001', 'Adventures in the Forgotten Realms Collector Booster Box', 'AFR', 'box', '2021-07-23', 'English', '{"category":"Booster Box","productId":"AFR-CB-BOX-001"}', false, true),
    ('AFR-DB-BOX-001', 'Adventures in the Forgotten Realms Draft Booster Box', 'AFR', 'box', '2021-07-23', 'English', '{"category":"Booster Box","productId":"AFR-DB-BOX-001"}', false, true),
    ('AFR-SB-BOX-001', 'Adventures in the Forgotten Realms Set Booster Box', 'AFR', 'box', '2021-07-23', 'English', '{"category":"Booster Box","productId":"AFR-SB-BOX-001"}', false, true),
    ('MID-CB-BOX-001', 'Innistrad: Midnight Hunt Collector Booster Box', 'MID', 'box', '2021-09-24', 'English', '{"category":"Booster Box","productId":"MID-CB-BOX-001"}', false, true),
    ('MID-DB-BOX-001', 'Innistrad: Midnight Hunt Draft Booster Box', 'MID', 'box', '2021-09-24', 'English', '{"category":"Booster Box","productId":"MID-DB-BOX-001"}', false, true),
    ('VOW-CB-BOX-001', 'Innistrad: Crimson Vow Collector Booster Box', 'VOW', 'box', '2021-11-19', 'English', '{"category":"Booster Box","productId":"VOW-CB-BOX-001"}', false, true)
  ON CONFLICT (mtgjson_uuid) DO NOTHING;

  result := json_build_object(
    'status', 'success',
    'message', 'Sample MTG products imported successfully'
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;