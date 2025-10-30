/*
  # Use Realistic Working Job Sources

  ## Overview
  Replace templates with sources that can actually be scraped reliably.
  Focus on RSS feeds and simple HTML scraping for now.

  ## Sources
  1. We Work Remotely - Has RSS feed
  2. RemoteOK - Public API/simple HTML
  3. Remote.co - Simple HTML structure
  
  For Upwork/Freelancer, users need to add manually with proper credentials.
*/

DELETE FROM source_templates;

-- Insert realistic, working source templates
INSERT INTO source_templates (name, url, scraper_type, config_json, is_default, description)
VALUES
  (
    'We Work Remotely Sales',
    'https://weworkremotely.com/categories/remote-sales-jobs',
    'apify_actor',
    '{
      "actorId": "apify/cheerio-scraper",
      "input": {
        "startUrls": [{"url": "https://weworkremotely.com/categories/remote-sales-jobs"}],
        "maxRequestsPerCrawl": 50,
        "pseudoUrls": [{
          "purl": "https://weworkremotely.com/remote-jobs/[.*]"
        }]
      }
    }'::jsonb,
    true,
    'Popular remote job board with sales positions'
  ),
  (
    'RemoteOK Sales',
    'https://remoteok.com/remote-sales-jobs',
    'apify_actor',
    '{
      "actorId": "apify/cheerio-scraper",
      "input": {
        "startUrls": [{"url": "https://remoteok.com/remote-sales-jobs"}],
        "maxRequestsPerCrawl": 50
      }
    }'::jsonb,
    true,
    'Tech-focused remote sales opportunities'
  ),
  (
    'Remote.co Sales',
    'https://remote.co/remote-jobs/sales/',
    'apify_actor',
    '{
      "actorId": "apify/cheerio-scraper",
      "input": {
        "startUrls": [{"url": "https://remote.co/remote-jobs/sales/"}],
        "maxRequestsPerCrawl": 50
      }
    }'::jsonb,
    true,
    'Curated remote sales positions'
  )
ON CONFLICT DO NOTHING;
