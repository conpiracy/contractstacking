/*
  # Add Default Source Templates

  ## Overview
  This migration adds support for saving source templates that can be quickly
  reused without having to discover scrapers every time.

  ## New Table

  ### source_templates
  Pre-configured source templates that users can quickly add.
  - `id` (uuid, primary key) - Unique identifier
  - `name` (text) - Display name (e.g., "RemoteRocketShip")
  - `url` (text) - Source website URL
  - `scraper_type` (text) - Type: 'apify_actor', 'rss', 'api', 'custom'
  - `config_json` (jsonb) - Pre-configured actor settings
  - `is_default` (boolean) - Whether this is a system default template
  - `description` (text) - Optional description
  - `created_at` (timestamptz) - When template was created

  ## Changes to sources table
  - Add `template_id` field to link sources to their templates for easy re-use

  ## Security
  - Enable RLS on source_templates
  - Public read access (anyone can view templates)
  - Authenticated write access for creating custom templates

  ## Default Templates
  Pre-populate with common remote job boards for quick setup.
*/

-- Create source_templates table
CREATE TABLE IF NOT EXISTS source_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  url text NOT NULL,
  scraper_type text NOT NULL DEFAULT 'apify_actor',
  config_json jsonb DEFAULT '{}'::jsonb,
  is_default boolean DEFAULT false,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Add template_id to sources table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sources' AND column_name = 'template_id'
  ) THEN
    ALTER TABLE sources ADD COLUMN template_id uuid REFERENCES source_templates(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE source_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for source_templates
CREATE POLICY "Anyone can view source templates"
  ON source_templates FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert templates"
  ON source_templates FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update their templates"
  ON source_templates FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete their templates"
  ON source_templates FOR DELETE
  TO authenticated
  USING (true);

-- Insert default popular remote job board templates
INSERT INTO source_templates (name, url, scraper_type, config_json, is_default, description)
VALUES
  (
    'RemoteRocketShip',
    'https://remoterocketship.com',
    'apify_actor',
    '{
      "actorId": "apify/web-scraper",
      "input": {
        "startUrls": [{"url": "https://remoterocketship.com"}],
        "maxPagesPerCrawl": 50,
        "pseudoUrls": [{"purl": "https://remoterocketship.com/jobs/[.*]"}],
        "linkSelector": "a[href*=\"/jobs/\"]",
        "pageFunction": "async function pageFunction(context) { const { request, log, jQuery } = context; if (request.userData.label === \"DETAIL\") { const title = jQuery(\"h1\").first().text().trim(); const company = jQuery(\".company-name\").text().trim(); return { title, company, url: request.url }; } }"
      }
    }'::jsonb,
    true,
    'Popular remote job board with curated positions'
  ),
  (
    'We Work Remotely',
    'https://weworkremotely.com',
    'apify_actor',
    '{
      "actorId": "piotrv1001/we-work-remotely-scraper",
      "input": {
        "startUrls": [{"url": "https://weworkremotely.com/remote-jobs"}],
        "maxItems": 100
      }
    }'::jsonb,
    true,
    'Leading remote job board with thousands of listings'
  ),
  (
    'Remote.co',
    'https://remote.co',
    'apify_actor',
    '{
      "actorId": "apify/web-scraper",
      "input": {
        "startUrls": [{"url": "https://remote.co/remote-jobs/"}],
        "maxPagesPerCrawl": 50
      }
    }'::jsonb,
    true,
    'Remote-only job listings across various industries'
  ),
  (
    'FlexJobs',
    'https://www.flexjobs.com',
    'apify_actor',
    '{
      "actorId": "apify/web-scraper",
      "input": {
        "startUrls": [{"url": "https://www.flexjobs.com/remote-jobs"}],
        "maxPagesPerCrawl": 50
      }
    }'::jsonb,
    true,
    'Premium remote and flexible job listings'
  ),
  (
    'Remote OK',
    'https://remoteok.com',
    'apify_actor',
    '{
      "actorId": "apify/web-scraper",
      "input": {
        "startUrls": [{"url": "https://remoteok.com/"}],
        "maxPagesPerCrawl": 100
      }
    }'::jsonb,
    true,
    'Tech-focused remote job aggregator'
  )
ON CONFLICT DO NOTHING;

-- Create index for faster template lookups
CREATE INDEX IF NOT EXISTS idx_source_templates_is_default ON source_templates(is_default);
CREATE INDEX IF NOT EXISTS idx_sources_template_id ON sources(template_id);
