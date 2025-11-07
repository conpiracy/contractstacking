# 🎯 SDR Job Bot

**Automated job scraper and notification system for Sales Development Representatives**

Never miss another SDR, BDR, or appointment setter opportunity! This bot automatically:
- 🔍 Scrapes Upwork & LinkedIn for relevant jobs
- 🎚️ Filters by your criteria (hourly rate, keywords, etc.)
- 📱 Sends instant Telegram notifications
- 💾 Tracks all jobs in a database
- 📊 Provides a beautiful dashboard to review

---

## ⚡ Quick Start (5 Minutes)

### 1. Get Your API Keys

You'll need:

| Service | Purpose | Get It From | Free Tier |
|---------|---------|-------------|-----------|
| **Apify** | Job scraping | [console.apify.com](https://console.apify.com/account/integrations) | $5/month credit |
| **Telegram** | Notifications | [@BotFather](https://t.me/botfather) on Telegram | Free |
| **Supabase** | Cloud database | [supabase.com](https://supabase.com) | 500MB free |

### 2. Run Setup

```bash
# Make setup script executable and run it
chmod +x setup.sh
./setup.sh
```

### 3. Add Your Keys

```bash
# Edit .env file
nano .env

# Add your keys:
APIFY_TOKEN=apify_api_xxxxxxxxxxxxxxxx
TELEGRAM_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_CHAT_ID=987654321
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGci...
```

### 4. Run the Bot!

```bash
# Activate virtual environment
source venv/bin/activate

# Test run (no notifications sent)
python3 jobbot.py --dry-run

# Real run
python3 jobbot.py
```

---

## 📱 Telegram Setup (2 Minutes)

### Create Your Bot

1. Open Telegram and search for [@BotFather](https://t.me/botfather)
2. Send: `/newbot`
3. Choose a name: `My SDR Job Bot`
4. Choose a username: `my_sdr_job_bot` (must end in "bot")
5. Copy the token (looks like: `1234567890:ABCdefGHI...`)

### Get Your Chat ID

1. Search for [@userinfobot](https://t.me/userinfobot) on Telegram
2. Send: `/start`
3. Copy your ID (looks like: `987654321`)

### Test It

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_TOKEN>/sendMessage" \
  -d "chat_id=<YOUR_CHAT_ID>" \
  -d "text=🎯 SDR Job Bot is ready!"
```

---

## 🗄️ Supabase Setup (3 Minutes)

### 1. Create Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Choose a name and password
4. Wait ~2 minutes for setup

### 2. Get Credentials

1. Go to Settings → API
2. Copy **Project URL** (e.g., `https://xxxxx.supabase.co`)
3. Copy **service_role key** (NOT the anon key!)

### 3. Create Tables

1. Go to SQL Editor
2. Click "New Query"
3. Paste and run:

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

CREATE INDEX idx_jobs_found_at ON jobs(found_at DESC);
```

---

## 🎨 Dashboard

View all your jobs in a beautiful web interface!

```bash
# Start the dashboard
cd dashboard
python3 -m http.server 8080
```

Then open: **http://localhost:8080**

### Features

- 📊 Real-time statistics (total, sent, filtered)
- 🔍 Search and filter jobs
- 📋 View job details
- 🔗 Copy job links
- 🎨 Beautiful, responsive design

---

## ⚙️ Configuration

Edit `config.yaml` to customize behavior:

### Scraper Settings

```yaml
scrapers:
  upwork:
    input:
      query: ["sdr", "bdr", "appointment setter"]  # Search terms
      limit: 50                                     # Max results
      age: 2                                        # Days old
```

### Filter Settings

```yaml
filters:
  min_hourly: 15                                    # Minimum $/hour
  excluded_keywords:                                # Skip these
    - "manager"
    - "director"
    - "senior"
  target_patterns:                                  # Must match one
    - "\\bsdr\\b"
    - "\\bbdr\\b"
    - "sales\\s*dev"
```

### Telegram Settings

```yaml
telegram:
  delay_seconds: 1.0                                # Delay between messages
  max_retries: 3                                    # Retry failed sends
```

---

## 🚀 Automation

### Run Every Hour (Linux/Mac)

```bash
# Edit crontab
crontab -e

# Add this line:
0 * * * * cd /path/to/contractstacking && source venv/bin/activate && python3 jobbot.py
```

### Run Every Hour (Windows)

1. Open Task Scheduler
2. Create Basic Task
3. Trigger: Daily, repeat every 1 hour
4. Action: Start a program
   - Program: `C:\Python311\python.exe`
   - Arguments: `jobbot.py`
   - Start in: `C:\path\to\contractstacking`

### Cloud Deployment (Google Cloud Run)

```bash
# Set your project ID
export GCP_PROJECT_ID="your-project-id"

# Deploy
chmod +x deploy.sh
./deploy.sh
```

This will:
- Build Docker container
- Deploy to Cloud Run
- Set up hourly Cloud Scheduler

---

## 📊 What Jobs Get Sent?

Jobs must pass ALL these filters:

✅ **Title matches target pattern**
- Contains "SDR", "BDR", "Sales Dev", etc.

✅ **No excluded keywords**
- Doesn't contain "manager", "director", "VP", etc.

✅ **Meets minimum rate** (if specified)
- At least $15/hour (configurable)

✅ **Not a duplicate**
- Not already in database

---

## 🔧 Troubleshooting

### "Module not found" error

```bash
source venv/bin/activate
pip install -r requirements.txt
```

### "Apify actor not found"

Check the actor name in `config.yaml`. Valid actors:
- `jupri/upwork` ✅
- `misceres/linkedin-jobs-search` ✅

### "Telegram rate limit"

Increase delay in `config.yaml`:

```yaml
telegram:
  delay_seconds: 2.0  # Increase from 1.0
```

### No jobs found

- Check Apify token is valid
- Verify scraper queries in `config.yaml`
- Try `--dry-run` to see raw results

### Dashboard not loading

- Check Supabase credentials in localStorage
- Verify tables exist in Supabase
- Check browser console (F12) for errors

---

## 💡 Tips & Tricks

### Get More Jobs

```yaml
scrapers:
  upwork:
    input:
      limit: 100        # Increase from 50
      age: 7            # Look back 7 days
```

### Get Higher Quality Jobs

```yaml
filters:
  min_hourly: 25      # Increase minimum rate
  excluded_keywords:
    - "cold calling"  # Add more exclusions
```

### Test Filters Without Running

```bash
# Dry run to see what would be sent
python3 jobbot.py --dry-run
```

### View Database

```bash
sqlite3 jobbot.db "SELECT title, pay_text, sent_at FROM jobs LIMIT 10"
```

### Clean Up Old Jobs

```bash
sqlite3 jobbot.db "DELETE FROM jobs WHERE found_at < date('now', '-30 days')"
```

---

## 📈 Usage Stats

After running, check your stats:

```bash
source venv/bin/activate
python3 -c "
import sqlite3
conn = sqlite3.connect('jobbot.db')

# Total jobs
total = conn.execute('SELECT COUNT(*) FROM jobs').fetchone()[0]
sent = conn.execute('SELECT COUNT(*) FROM jobs WHERE sent_at IS NOT NULL').fetchone()[0]
filtered = conn.execute('SELECT COUNT(*) FROM jobs WHERE filtered_reason IS NOT NULL').fetchone()[0]

print(f'📊 Stats:')
print(f'  Total jobs: {total}')
print(f'  Sent: {sent}')
print(f'  Filtered: {filtered}')
print(f'  Success rate: {sent/total*100:.1f}%' if total > 0 else '  No jobs yet')
"
```

---

## 🎯 Example Notification

When a job matches your criteria, you'll get a Telegram message like:

```
🎯 Sales Development Representative - SaaS Startup

🏢 Upwork Client
💰 $25-35/hour
🔗 https://upwork.com/jobs/~abc123

📝 We're looking for an experienced SDR to help build our
outbound pipeline. 2+ years of B2B SaaS sales experience
required. Focus on enterprise accounts...
```

---

## 🔐 Security

- ✅ `.env` is git-ignored (never committed)
- ✅ Database is local (not shared)
- ✅ Secrets stored securely
- ✅ No external access (unless you deploy to cloud)

**Best practices:**
- Rotate API keys every 90 days
- Use service keys (not anon keys) for backend
- Enable Supabase Row Level Security
- Monitor API usage quotas

---

## 📚 Additional Resources

- **Full Documentation**: See `INSTRUCTIONS.md`
- **Apify Docs**: [docs.apify.com](https://docs.apify.com)
- **Telegram Bot API**: [core.telegram.org/bots](https://core.telegram.org/bots)
- **Supabase Docs**: [supabase.com/docs](https://supabase.com/docs)

---

## 🆘 Need Help?

1. Check `INSTRUCTIONS.md` for detailed guide
2. View logs: `tail -f jobbot.log`
3. Test with `--dry-run` flag
4. Check database: `sqlite3 jobbot.db`

---

## 📄 License

MIT License - free to use and modify!

---

## 🎉 Success Criteria

You'll know it's working when:

✅ `python3 jobbot.py --dry-run` completes without errors
✅ Database file `jobbot.db` is created
✅ Dashboard shows at http://localhost:8080
✅ Telegram messages arrive for matching jobs
✅ Supabase dashboard shows new rows in `jobs` table

**Happy job hunting! 🚀**
