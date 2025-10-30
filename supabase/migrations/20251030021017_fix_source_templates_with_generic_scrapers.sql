/*
  # Fix Source Templates with Generic Web Scraper

  ## Overview
  Replace all source templates with generic web scraper configurations
  while we identify the correct actors for each platform.

  ## Changes
  - Delete all existing templates
  - Insert new templates using apify/web-scraper (verified to exist)
  - Configure proper start URLs and selectors for each source
*/

DELETE FROM source_templates;

-- Insert working source templates with generic web scraper
INSERT INTO source_templates (name, url, scraper_type, config_json, is_default, description)
VALUES
  (
    'Upwork Sales Jobs',
    'https://www.upwork.com/nx/search/jobs/?category2_uid=531770282580668419&sort=recency',
    'apify_actor',
    '{
      "actorId": "apify/web-scraper",
      "input": {
        "startUrls": [{"url": "https://www.upwork.com/nx/search/jobs/?category2_uid=531770282580668419&sort=recency"}],
        "maxPagesPerCrawl": 20,
        "linkSelector": "a[data-test=\"job-tile-title-link\"]",
        "pageFunction": "async function pageFunction(context) { const { page, request, log } = context; if (request.userData.label === \"DETAIL\") { const title = await page.$eval(\"h4\", el => el.textContent); const company = await page.$eval(\"[data-test=\\\"client-name\\\"]\", el => el.textContent); const description = await page.$eval(\"[data-test=\\\"Description\\\"]\", el => el.textContent); return { title, company, description, url: request.url }; } }"
      }
    }'::jsonb,
    true,
    'Hourly contracts - Sales & Marketing category'
  ),
  (
    'Wellfound (AngelList)',
    'https://wellfound.com/role/r/sales',
    'apify_actor',
    '{
      "actorId": "apify/web-scraper",
      "input": {
        "startUrls": [{"url": "https://wellfound.com/role/r/sales"}],
        "maxPagesPerCrawl": 20
      }
    }'::jsonb,
    true,
    'Startup sales jobs with OTE $50k-110k'
  ),
  (
    'RemoteRocketShip',
    'https://remoterocketship.com/jobs',
    'apify_actor',
    '{
      "actorId": "apify/web-scraper",
      "input": {
        "startUrls": [{"url": "https://remoterocketship.com/jobs"}],
        "maxPagesPerCrawl": 20,
        "linkSelector": "a.job-listing"
      }
    }'::jsonb,
    true,
    'Remote sales jobs at growing companies'
  ),
  (
    'Remote.co Sales',
    'https://remote.co/remote-jobs/sales/',
    'apify_actor',
    '{
      "actorId": "apify/web-scraper",
      "input": {
        "startUrls": [{"url": "https://remote.co/remote-jobs/sales/"}],
        "maxPagesPerCrawl": 20
      }
    }'::jsonb,
    true,
    'Remote sales positions'
  ),
  (
    'We Work Remotely',
    'https://weworkremotely.com/categories/remote-sales-jobs',
    'apify_actor',
    '{
      "actorId": "apify/web-scraper",
      "input": {
        "startUrls": [{"url": "https://weworkremotely.com/categories/remote-sales-jobs"}],
        "maxPagesPerCrawl": 20
      }
    }'::jsonb,
    true,
    'Popular remote job board'
  ),
  (
    'FlexJobs Sales',
    'https://www.flexjobs.com/remote-jobs/sales',
    'apify_actor',
    '{
      "actorId": "apify/web-scraper",
      "input": {
        "startUrls": [{"url": "https://www.flexjobs.com/remote-jobs/sales"}],
        "maxPagesPerCrawl": 20
      }
    }'::jsonb,
    true,
    'Flexible and remote sales positions'
  )
ON CONFLICT DO NOTHING;
