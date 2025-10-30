/*
  # Update Schema for Hourly and OTE Contracts

  ## Overview
  This migration updates the jobs table to support both hourly contracts (Upwork-style)
  and OTE contracts with proper filtering capabilities.

  ## Changes to jobs table
  
  Add new fields:
  - `contract_type` (text) - 'hourly' or 'ote'
  - `hourly_rate` (numeric) - Hourly rate for hourly contracts
  - `payment_terms` (text) - 'fixed_hourly', 'hourly_plus_appointment', 'hourly_plus_commission'
  - `is_payment_verified` (boolean) - Payment verification status (Upwork)
  - `rating` (numeric) - Company/client rating (0-5)
  - `project_type` (text) - 'part_time', 'full_time', 'contract_to_hire'
  - `allowed_locations` (text[]) - Array of allowed locations
  
  ## Indexes
  - Add indexes for hourly_rate, contract_type, rating filtering
*/

-- Add new columns to jobs table
DO $$
BEGIN
  -- Add contract_type column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'contract_type'
  ) THEN
    ALTER TABLE jobs ADD COLUMN contract_type text DEFAULT 'ote';
  END IF;

  -- Add hourly_rate column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'hourly_rate'
  ) THEN
    ALTER TABLE jobs ADD COLUMN hourly_rate numeric;
  END IF;

  -- Add payment_terms column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'payment_terms'
  ) THEN
    ALTER TABLE jobs ADD COLUMN payment_terms text;
  END IF;

  -- Add is_payment_verified column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'is_payment_verified'
  ) THEN
    ALTER TABLE jobs ADD COLUMN is_payment_verified boolean DEFAULT false;
  END IF;

  -- Add rating column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'rating'
  ) THEN
    ALTER TABLE jobs ADD COLUMN rating numeric;
  END IF;

  -- Add project_type column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'project_type'
  ) THEN
    ALTER TABLE jobs ADD COLUMN project_type text;
  END IF;

  -- Add allowed_locations column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'allowed_locations'
  ) THEN
    ALTER TABLE jobs ADD COLUMN allowed_locations text[] DEFAULT ARRAY[]::text[];
  END IF;
END $$;

-- Create indexes for new fields
CREATE INDEX IF NOT EXISTS idx_jobs_contract_type ON jobs(contract_type);
CREATE INDEX IF NOT EXISTS idx_jobs_hourly_rate ON jobs(hourly_rate);
CREATE INDEX IF NOT EXISTS idx_jobs_rating ON jobs(rating);
CREATE INDEX IF NOT EXISTS idx_jobs_is_payment_verified ON jobs(is_payment_verified);
CREATE INDEX IF NOT EXISTS idx_jobs_project_type ON jobs(project_type);

-- Delete old templates and insert new ones (using DELETE instead of TRUNCATE to avoid FK issues)
DELETE FROM source_templates;

-- Insert hourly contract sources
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
        "maxPagesPerCrawl": 50
      }
    }'::jsonb,
    true,
    'Hourly contracts - Sales & Marketing category'
  ),
  (
    'Freelancer.com Sales',
    'https://www.freelancer.com/jobs/sales/',
    'apify_actor',
    '{
      "actorId": "apify/web-scraper",
      "input": {
        "startUrls": [{"url": "https://www.freelancer.com/jobs/sales/"}],
        "maxPagesPerCrawl": 50
      }
    }'::jsonb,
    true,
    'Hourly and fixed-price sales contracts'
  ),
  (
    'Wellfound (AngelList)',
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
    'Startup sales jobs with OTE $50k-110k'
  ),
  (
    'RemoteRocketShip',
    'https://remoterocketship.com',
    'apify_actor',
    '{
      "actorId": "apify/web-scraper",
      "input": {
        "startUrls": [{"url": "https://remoterocketship.com"}],
        "maxPagesPerCrawl": 50
      }
    }'::jsonb,
    true,
    'Remote sales jobs at growing companies'
  ),
  (
    'Y Combinator Jobs',
    'https://www.ycombinator.com/jobs/role/sales',
    'apify_actor',
    '{
      "actorId": "apify/web-scraper",
      "input": {
        "startUrls": [{"url": "https://www.ycombinator.com/jobs/role/sales"}],
        "maxPagesPerCrawl": 50
      }
    }'::jsonb,
    true,
    'YC startup sales positions'
  ),
  (
    'Jooble Remote Sales',
    'https://jooble.org/jobs-remote-sales',
    'apify_actor',
    '{
      "actorId": "apify/web-scraper",
      "input": {
        "startUrls": [{"url": "https://jooble.org/jobs-remote-sales"}],
        "maxPagesPerCrawl": 50
      }
    }'::jsonb,
    true,
    'Aggregated remote sales opportunities'
  )
ON CONFLICT DO NOTHING;
