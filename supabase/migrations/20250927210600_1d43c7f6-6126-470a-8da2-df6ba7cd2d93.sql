-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule MTGJSON import to run daily at 4:00 AM UTC
SELECT cron.schedule(
  'mtgjson-import-daily',
  '0 4 * * *', -- 4:00 AM UTC daily
  $$
  SELECT
    net.http_post(
        url:='https://hbvbaanjrhekqrpiuezm.supabase.co/functions/v1/mtgjson-import',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhidmJhYW5qcmhla3FycGl1ZXptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4NzAzNzgsImV4cCI6MjA3MTQ0NjM3OH0.QixoFrlSq_nBOqQAM8xM5i3ELLV9DARWmScIpFrSJW0"}'::jsonb,
        body:=concat('{"scheduled": true, "time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);

-- Schedule price fetch to run daily at 4:01 AM UTC (1 minute after MTGJSON import)
SELECT cron.schedule(
  'fetch-prices-daily',
  '1 4 * * *', -- 4:01 AM UTC daily
  $$
  SELECT
    net.http_post(
        url:='https://hbvbaanjrhekqrpiuezm.supabase.co/functions/v1/fetch-prices',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhidmJhYW5qcmhla3FycGl1ZXptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4NzAzNzgsImV4cCI6MjA3MTQ0NjM3OH0.QixoFrlSq_nBOqQAM8xM5i3ELLV9DARWmScIpFrSJW0"}'::jsonb,
        body:=concat('{"scheduled": true, "time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);