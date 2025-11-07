# SDR JOB BOT - Complete Implementation Guide

## Overview
Automated job scraping and notification system for SDR/BDR positions. Scrapes Upwork and LinkedIn via Apify, filters jobs based on criteria, sends Telegram notifications, and syncs to Supabase.

## Architecture

```
┌─────────────┐      ┌──────────┐      ┌───────────┐
│   Apify     │─────▶│  JobBot  │─────▶│ Telegram  │
│  Scrapers   │      │  (Core)  │      │   Bot     │
└─────────────┘      └──────────┘      └───────────┘
                          │
                          ▼
                    ┌──────────┐      ┌───────────┐
                    │  SQLite  │─────▶│ Supabase  │
                    │   DB     │      │  (Cloud)  │
                    └──────────┘      └───────────┘
                          │
                          ▼
                    ┌──────────┐
                    │Dashboard │
                    │  (HTML)  │
                    └──────────┘
```

## Quick Start

### 1. Local Setup (5 minutes)

```bash
# Clone or navigate to repository
cd contractstacking

# Run setup script
chmod +x setup.sh
./setup.sh

# Edit environment variables
nano .env

# Add your API keys:
# - APIFY_TOKEN (from https://console.apify.com)
# - TELEGRAM_TOKEN (from @BotFather)
# - TELEGRAM_CHAT_ID (from @userinfobot)
# - SUPABASE_URL (from Supabase dashboard)
# - SUPABASE_SERVICE_KEY (from Supabase dashboard)
```

### 2. Test Run

```bash
# Activate virtual environment
source venv/bin/activate

# Dry run (no notifications sent)
python3 jobbot.py --dry-run

# Real run
python3 jobbot.py
```

### 3. Start Dashboard

```bash
# In a new terminal
cd dashboard
python3 -m http.server 8080

# Open browser to http://localhost:8080
```

## Configuration

### config.yaml

Controls all bot behavior:

```yaml
scrapers:
  upwork:
    type: apify
    actor: "jupri/upwork"
    input:
      query: ["sdr", "bdr", "appointment setter"]
      hourly: true
      limit: 50

filters:
  min_hourly: 15
  excluded_keywords: ["manager", "director", "vp"]
  target_patterns: ["\\bsdr\\b", "\\bbdr\\b"]
```

**Key Settings:**
- `scrapers`: Define which job sources to use
- `filters`: Control which jobs get sent
- `telegram`: Notification settings
- `sync`: Supabase integration

## Features

### 1. Multi-Source Scraping
- **Upwork**: Via jupri/upwork Apify actor
- **LinkedIn**: Via misceres/linkedin-jobs-search actor
- Extensible to add more sources

### 2. Smart Filtering
- Exclude management positions
- Require target keywords (SDR, BDR, etc.)
- Minimum hourly rate threshold
- Duplicate detection

### 3. Telegram Notifications
- Rich formatted messages
- Rate limiting protection
- Automatic retry on failure
- Configurable delay between messages

### 4. Data Persistence
- **Local**: SQLite database
- **Cloud**: Supabase sync (optional)
- Track all jobs: sent, filtered, duplicates

### 5. Dashboard
- Real-time job monitoring
- Filter by status, site, search
- View statistics
- Copy job links

## Database Schema

### jobs table
```sql
CREATE TABLE jobs (
    id TEXT PRIMARY KEY,
    site TEXT,
    data JSON,
    found_at TIMESTAMP,
    sent_at TIMESTAMP,
    filtered_reason TEXT,
    applied_filters JSON
)
```

### runs table
```sql
CREATE TABLE runs (
    id TEXT PRIMARY KEY,
    started_at TIMESTAMP,
    finished_at TIMESTAMP,
    found_count INTEGER,
    sent_count INTEGER,
    error TEXT
)
```

## Cloud Deployment

### Google Cloud Run

```bash
# Set environment variables
export GCP_PROJECT_ID="your-project-id"
export GCP_REGION="us-central1"

# Deploy
chmod +x deploy.sh
./deploy.sh
```

### Heroku

```bash
# Install Heroku CLI
# Login
heroku login

# Create app
heroku create sdr-job-bot

# Set config vars
heroku config:set APIFY_TOKEN=xxx
heroku config:set TELEGRAM_TOKEN=xxx
heroku config:set TELEGRAM_CHAT_ID=xxx
heroku config:set SUPABASE_URL=xxx
heroku config:set SUPABASE_SERVICE_KEY=xxx

# Deploy
git push heroku main

# Schedule (using Heroku Scheduler addon)
heroku addons:create scheduler:standard
heroku addons:open scheduler
# Add job: python3 jobbot.py
```

### Docker

```bash
# Build
docker build -t sdr-job-bot .

# Run
docker run -d \
  --env-file .env \
  -v $(pwd)/data:/data \
  sdr-job-bot
```

## Supabase Setup

### 1. Create Project
1. Go to https://supabase.com
2. Create new project
3. Note your project URL and service key

### 2. Create Tables

Run this SQL in Supabase SQL Editor:

```sql
CREATE TABLE jobs (
    id TEXT PRIMARY KEY,
    site TEXT,
    title TEXT,
    company TEXT,
    url TEXT,
    pay_text TEXT,
    description TEXT,
    posted_at TIMESTAMPTZ,
    found_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    filtered_reason TEXT,
    data JSONB
);

CREATE INDEX idx_jobs_site ON jobs(site);
CREATE INDEX idx_jobs_found_at ON jobs(found_at DESC);
CREATE INDEX idx_jobs_sent_at ON jobs(sent_at DESC);

-- Enable Row Level Security (optional)
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Allow read access (for dashboard)
CREATE POLICY "Allow public read access"
ON jobs FOR SELECT
TO public
USING (true);
```

### 3. Configure Dashboard

Open `dashboard/index.html` in browser, enter:
- Supabase URL
- Supabase Anon Key (not service key for frontend)

## Telegram Setup

### 1. Create Bot
1. Open Telegram, search for @BotFather
2. Send `/newbot`
3. Follow prompts
4. Save the token

### 2. Get Chat ID
1. Search for @userinfobot on Telegram
2. Send `/start`
3. Save your chat ID

### 3. Test
```bash
curl -X POST "https://api.telegram.org/bot<YOUR_TOKEN>/sendMessage" \
  -d "chat_id=<YOUR_CHAT_ID>" \
  -d "text=Test message"
```

## Apify Setup

### 1. Create Account
1. Go to https://apify.com
2. Sign up for free account
3. Navigate to Settings → Integrations
4. Copy your API token

### 2. Test Actors
```bash
# Test Upwork actor
curl "https://api.apify.com/v2/acts/jupri~upwork/runs" \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"runInput": {"query": ["sdr"], "limit": 5}}'
```

## Customization

### Add New Job Source

1. Edit `config.yaml`:
```yaml
scrapers:
  indeed:
    type: apify
    actor: "your-actor/indeed-scraper"
    input:
      keywords: ["sdr", "bdr"]
```

2. Add normalization in `jobbot.py`:
```python
def normalize_job(self, raw_job: Dict, site: str) -> Dict:
    if site == "indeed":
        return {
            "id": f"indeed:{raw_job['id']}",
            "title": raw_job["title"],
            # ... map fields
        }
```

### Modify Filters

Edit `config.yaml`:
```yaml
filters:
  min_hourly: 20  # Increase minimum rate
  excluded_keywords: ["manager", "senior", "lead"]
  target_patterns: ["\\bsdr\\b", "sales\\s*development"]
```

### Change Notification Format

Edit `jobbot.py` → `send_telegram()`:
```python
message = f"""
🎯 {job['title']}
💰 {job['pay_text']}
🔗 {job['url']}
"""
```

## Troubleshooting

### "Module not found" error
```bash
source venv/bin/activate
pip install -r requirements.txt
```

### "Apify run failed"
- Check token is valid
- Verify actor name is correct
- Check Apify dashboard for run logs

### "Telegram rate limit"
- Increase `telegram.delay_seconds` in config.yaml
- Reduce number of jobs scraped

### "Database locked"
- Only run one instance at a time
- Check for zombie processes: `ps aux | grep jobbot`

### Dashboard not loading jobs
- Check Supabase credentials
- Verify tables exist in Supabase
- Check browser console for errors

## Maintenance

### View Logs
```bash
# Local
tail -f jobbot.log

# Cloud Run
gcloud run logs tail sdr-job-bot

# Heroku
heroku logs --tail
```

### Database Cleanup
```bash
# Remove old jobs (older than 30 days)
python3 -c "
import sqlite3
from datetime import datetime, timedelta
conn = sqlite3.connect('jobbot.db')
cutoff = (datetime.now() - timedelta(days=30)).isoformat()
conn.execute('DELETE FROM jobs WHERE found_at < ?', (cutoff,))
conn.commit()
print(f'Cleaned up jobs older than {cutoff}')
"
```

### Update Dependencies
```bash
source venv/bin/activate
pip install --upgrade -r requirements.txt
```

## Performance

### Optimization Tips
1. **Reduce scraping frequency**: Run every 2-4 hours instead of hourly
2. **Limit results**: Set `limit: 20` in scraper configs
3. **Disable Supabase sync**: Set `sync.enabled: false` for local-only mode
4. **Batch notifications**: Increase `telegram.delay_seconds` to avoid rate limits

### Resource Usage
- **Memory**: ~100-200MB
- **CPU**: Minimal (I/O bound)
- **Storage**: ~10MB per 1000 jobs
- **Network**: ~5-10MB per run

## Security

### Best Practices
1. **Never commit .env**: Already in .gitignore
2. **Use service keys**: Not anon keys for backend
3. **Enable RLS**: On Supabase tables
4. **Rotate tokens**: Every 90 days
5. **Monitor usage**: Check Apify/Telegram quotas

### Secrets Management

**Local Development:**
```bash
# Use .env file (git-ignored)
cp .env.template .env
nano .env
```

**Production:**
```bash
# Use environment variables
export APIFY_TOKEN="xxx"
export TELEGRAM_TOKEN="xxx"
# etc.

# Or use secrets manager
gcloud secrets create apify-token --data-file=-
```

## FAQ

**Q: How much does this cost?**
A: Free tier covers most use cases:
- Apify: $5 free credit/month
- Supabase: 500MB database free
- Telegram: Free
- Cloud Run: 2M requests/month free

**Q: Can I use without Supabase?**
A: Yes! Set `sync.enabled: false` in config.yaml. Uses only SQLite.

**Q: How do I stop duplicate notifications?**
A: Bot automatically tracks job IDs in database and skips duplicates.

**Q: Can I run multiple scrapers in parallel?**
A: Yes, each scraper in config.yaml runs sequentially. For parallel, deploy multiple instances with different configs.

**Q: How to add Slack instead of Telegram?**
A: Modify `send_telegram()` to `send_slack()` and use Slack webhook API instead.

## Support

- **Issues**: https://github.com/yourusername/sdr-job-bot/issues
- **Apify Docs**: https://docs.apify.com
- **Supabase Docs**: https://supabase.com/docs
- **Telegram Bot API**: https://core.telegram.org/bots/api

## License

MIT License - feel free to modify and distribute.

## Changelog

### v1.0.0 (2025-01-07)
- Initial release
- Upwork + LinkedIn scrapers
- Telegram notifications
- Supabase sync
- Dashboard UI
- Docker support
- Cloud Run deployment
