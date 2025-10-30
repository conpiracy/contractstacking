/*
  # Contract Curator Database Schema

  ## Overview
  This migration creates the complete database schema for Contract Curator,
  a remote sales job aggregator that pulls from multiple sources and filters
  by company size and OTE (On-Target Earnings).

  ## Tables Created

  ### 1. sources
  Stores configuration for each job board source that we scrape.
  - `id` (uuid, primary key) - Unique identifier
  - `name` (text) - Display name (e.g., "RemoteRocketShip")
  - `url` (text) - Source website URL
  - `scraper_type` (text) - Type: 'apify_actor', 'rss', 'api', 'custom'
  - `config_json` (jsonb) - Flexible config storage (actor ID, input params, etc.)
  - `enabled` (boolean) - Whether this source is active
  - `last_run_at` (timestamptz) - Last successful scrape timestamp
  - `last_status` (text) - 'idle', 'running', 'success', 'error'
  - `last_error` (text) - Error message from last failed run
  - `created_at` (timestamptz) - When source was added

  ### 2. jobs
  Unified schema for all job listings from all sources.
  - `id` (uuid, primary key) - Unique identifier
  - `title` (text) - Job title
  - `company` (text) - Company name
  - `company_size` (integer) - Number of employees (for filtering)
  - `ote_min` (integer) - Minimum OTE in thousands (e.g., 50 = $50k)
  - `ote_max` (integer) - Maximum OTE in thousands (e.g., 110 = $110k)
  - `location` (text) - Job location or "Remote"
  - `tags` (text[]) - Skills, categories, etc.
  - `apply_url` (text) - Direct application link
  - `source_id` (uuid, foreign key) - References sources table
  - `source_name` (text) - Denormalized for easy display
  - `scraped_at` (timestamptz) - When this job was scraped
  - `created_at` (timestamptz) - When inserted into our DB

  ### 3. scrape_logs
  Tracks every scrape run for monitoring and debugging.
  - `id` (uuid, primary key) - Unique identifier
  - `source_id` (uuid, foreign key) - Which source was scraped
  - `status` (text) - 'running', 'success', 'error'
  - `started_at` (timestamptz) - Scrape start time
  - `completed_at` (timestamptz) - Scrape end time
  - `jobs_found` (integer) - Total jobs discovered
  - `jobs_inserted` (integer) - Jobs passing filters and inserted
  - `error_message` (text) - Error details if failed
  - `log_entries` (text[]) - Array of log messages for display

  ## Security
  - Enable RLS on all tables
  - Public read access on jobs table (anyone can view jobs)
  - Authenticated-only write access on sources and scrape_logs
  - Admin/service role required for running scrapers

  ## Indexes
  - Performance indexes on jobs table for common filter queries
  - Indexes on foreign keys for fast joins
*/

-- Create sources table
CREATE TABLE IF NOT EXISTS sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  url text NOT NULL,
  scraper_type text NOT NULL DEFAULT 'apify_actor',
  config_json jsonb DEFAULT '{}'::jsonb,
  enabled boolean DEFAULT true,
  last_run_at timestamptz,
  last_status text DEFAULT 'idle',
  last_error text,
  created_at timestamptz DEFAULT now()
);

-- Create jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  company text NOT NULL,
  company_size integer,
  ote_min integer,
  ote_max integer,
  location text DEFAULT 'Remote',
  tags text[] DEFAULT ARRAY[]::text[],
  apply_url text NOT NULL,
  source_id uuid REFERENCES sources(id) ON DELETE CASCADE,
  source_name text NOT NULL,
  scraped_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create scrape_logs table
CREATE TABLE IF NOT EXISTS scrape_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid REFERENCES sources(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'running',
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  jobs_found integer DEFAULT 0,
  jobs_inserted integer DEFAULT 0,
  error_message text,
  log_entries text[] DEFAULT ARRAY[]::text[],
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_jobs_company_size ON jobs(company_size);
CREATE INDEX IF NOT EXISTS idx_jobs_ote_min ON jobs(ote_min);
CREATE INDEX IF NOT EXISTS idx_jobs_ote_max ON jobs(ote_max);
CREATE INDEX IF NOT EXISTS idx_jobs_location ON jobs(location);
CREATE INDEX IF NOT EXISTS idx_jobs_source_id ON jobs(source_id);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scrape_logs_source_id ON scrape_logs(source_id);
CREATE INDEX IF NOT EXISTS idx_scrape_logs_status ON scrape_logs(status);

-- Enable Row Level Security
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrape_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for jobs table (public read access)
CREATE POLICY "Anyone can view jobs"
  ON jobs FOR SELECT
  TO anon, authenticated
  USING (true);

-- RLS Policies for sources table (public read, auth write)
CREATE POLICY "Anyone can view sources"
  ON sources FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert sources"
  ON sources FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update sources"
  ON sources FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete sources"
  ON sources FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for scrape_logs (public read for transparency)
CREATE POLICY "Anyone can view scrape logs"
  ON scrape_logs FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert scrape logs"
  ON scrape_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update scrape logs"
  ON scrape_logs FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
