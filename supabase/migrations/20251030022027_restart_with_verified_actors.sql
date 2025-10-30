/*
  # Restart with Verified Working Actors

  ## Overview
  Complete restart using only verified Apify actors that are documented to work.

  ## Groups
  
  ### Group A - Low Friction (RSS feeds, simple scraping)
  1. Working Nomads Jobs Scraper (mscraper/working-nomads-jobs-scraper)
  2. Remote.com Job Scraper (getdataforme/remote-com-job-scraper)

  ### Group B - Browser Rendering Required
  1. Wellfound Jobs Scraper (mscraper/wellfound-jobs-scraper)
  2. Advanced Wellfound Scraper (saswave/advanced-wellfound-companies-jobs-scraper)

  ## Fallback
  - BrowserUse API for any failures (requires BROWSERUSE_API_SECRET)
*/

-- Clean slate
DELETE FROM source_templates;

-- Insert Group A sources (Low Friction)
INSERT INTO source_templates (name, url, scraper_type, config_json, is_default, description)
VALUES
  (
    'Working Nomads Jobs',
    'https://www.workingnomads.com/jobs',
    'apify_actor',
    '{
      "actorId": "mscraper/working-nomads-jobs-scraper",
      "input": {
        "maxItems": 100
      }
    }'::jsonb,
    true,
    'Group A - RSS feed based, low friction scraper'
  ),
  (
    'Remote.com Jobs',
    'https://remote.com/jobs',
    'apify_actor',
    '{
      "actorId": "getdataforme/remote-com-job-scraper",
      "input": {
        "maxItems": 100
      }
    }'::jsonb,
    true,
    'Group A - Simple scraping, no browser needed'
  );

-- Insert Group B sources (Browser Rendering)
INSERT INTO source_templates (name, url, scraper_type, config_json, is_default, description)
VALUES
  (
    'Wellfound (AngelList) Jobs',
    'https://wellfound.com/role/r/sales',
    'apify_actor',
    '{
      "actorId": "mscraper/wellfound-jobs-scraper",
      "input": {
        "startUrls": [{"url": "https://wellfound.com/role/r/sales"}],
        "maxItems": 100
      }
    }'::jsonb,
    true,
    'Group B - Browser rendering required, proxies needed'
  ),
  (
    'Wellfound Advanced',
    'https://wellfound.com/role/r/sales',
    'apify_actor',
    '{
      "actorId": "saswave/advanced-wellfound-companies-jobs-scraper",
      "input": {
        "startUrls": [{"url": "https://wellfound.com/role/r/sales"}],
        "maxItems": 100
      }
    }'::jsonb,
    true,
    'Group B - Advanced Wellfound scraper with companies data'
  )
ON CONFLICT DO NOTHING;
