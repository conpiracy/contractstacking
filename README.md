# Contract Curator

A modern web application that aggregates remote sales job listings from multiple sources, filtering for positions with 50k-110k OTE at companies with fewer than 100 employees.

## Features

- **Intelligent Source Discovery**: Automatically finds the best Apify scrapers for any job board URL
- **Unified Job Schema**: All jobs are normalized into a consistent format regardless of source
- **Real-time Updates**: Live updates when new jobs are scraped using Supabase Realtime
- **Advanced Filtering**: Filter by OTE range, location, company size, and search by keywords
- **Source Management**: Add, run, and monitor multiple job board scrapers from a single dashboard
- **CSV Export**: Export filtered job listings for offline analysis
- **Extensible Architecture**: Add new sources in 3 clicks without touching any code

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Supabase Edge Functions (serverless)
- **Database**: Supabase PostgreSQL with Row Level Security
- **Scraping**: Apify actors for reliable job board scraping
- **Real-time**: Supabase Realtime subscriptions
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A Supabase account (database is already provisioned)
- An Apify account with API token

### Installation

1. Install dependencies:
```bash
npm install
```

2. The environment variables are already configured in `.env`

3. Start the development server:
```bash
npm run dev
```

4. Open [http://localhost:5173](http://localhost:5173) in your browser

## Usage

### Adding Your First Source

1. Click the "Add Source" button in the header
2. Enter a job board URL (e.g., `https://remoterocketship.com`)
3. The app will search Apify's actor store and recommend the best scrapers
4. Select a scraper based on cost and reliability
5. Your source is created and ready to run

### Running a Scraper

1. Expand the "Sources" tray at the bottom of the page
2. Click the play button on any source card
3. Watch the real-time status updates as jobs are scraped
4. New jobs appear automatically in the table when scraping completes

### Filtering Jobs

- Use the OTE range inputs to filter by salary (50k-110k default)
- Search by title, company name, or tags using the search bar
- Only jobs from companies with fewer than 100 employees are shown

### Exporting Data

- Click "Export CSV" in the header to download all filtered jobs
- The CSV includes all job details: title, company, OTE, location, tags, and apply URL

## Architecture

### Database Schema

**sources**: Stores configuration for each job board
- Tracks scraper type (Apify actor, RSS, custom)
- Stores actor configuration as JSON
- Records last run status and error messages

**jobs**: Unified schema for all job listings
- Auto-filtered by company size and OTE range during ingestion
- Indexed for fast filtering queries
- Linked to source via foreign key

**scrape_logs**: Tracks every scraper run
- Stores status, timing, and error details
- Maintains log entries for debugging
- Used for real-time status updates

### Edge Functions

**discover-scraper**: Searches Apify store for suitable actors
- Ranks by cost, popularity, and relevance
- Returns top 3 recommendations
- Provides generic fallback if no matches found

**run-scraper**: Executes Apify actors and ingests results
- Polls actor status until completion
- Normalizes data into unified schema
- Applies OTE and company size filters
- Updates real-time logs during execution

**sources**: CRUD operations for job sources
- Create, read, update, delete sources
- Returns all sources with status info

**jobs**: Returns filtered job listings
- Supports filtering by OTE, location, tags, source
- Indexed for fast query performance

### Security

All tables use Row Level Security (RLS):
- Public read access on jobs and sources (anyone can view)
- Authenticated write access on sources (for adding/removing)
- Service role required for running scrapers (Edge Functions only)

## Adding New Sources

The entire process takes less than 30 seconds:

1. Click "Add Source"
2. Paste job board URL
3. Select recommended scraper
4. Done! Start scraping immediately

No code changes, no configuration files, no deployments needed.

## Development

### Build

```bash
npm run build
```

### Type Check

```bash
npm run typecheck
```

### Lint

```bash
npm run lint
```

## Deployment

This app is designed to run on any static hosting platform with Supabase as the backend:

1. Build the app: `npm run build`
2. Deploy the `dist` folder to Vercel, Netlify, or any static host
3. Supabase Edge Functions are already deployed and configured
4. No additional server infrastructure needed

## Environment Variables

The app requires these environment variables (already configured):

- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key

For Edge Functions (automatically configured in Supabase):
- `APIFY_API_TOKEN`: Your Apify API token for scraping

## Cost Considerations

- **Database**: Supabase free tier supports up to 500MB (thousands of jobs)
- **Edge Functions**: 2M invocations/month on free tier
- **Apify**: Most job scrapers cost $0.10-0.50 per run
- **Estimated**: ~$5-10/month for active use across 5-10 sources

## Future Enhancements

- Email alerts when scrapes fail
- Scheduled automatic scraping (daily/weekly)
- Job application tracking
- Company research integration
- Salary trend analytics
- Browser extension for quick saves

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or submit a PR.
