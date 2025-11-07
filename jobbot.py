#!/usr/bin/env python3
"""
SDR Job Bot - Automated job scraper and notification system
"""
import os
import sys
import yaml
import json
import re
import time
import sqlite3
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
import requests
from supabase import create_client
from dotenv import load_dotenv


class JobBot:
    def __init__(self, config_path="config.yaml", dry_run=False):
        self.dry_run = dry_run
        self.config = yaml.safe_load(open(config_path))
        self.db = sqlite3.connect("jobbot.db")
        self.init_db()

        # Load environment variables
        load_dotenv()

        # Load secrets
        self.secrets = self._load_secrets()
        self.supabase = create_client(
            self.secrets["SUPABASE_URL"],
            self.secrets["SUPABASE_SERVICE_KEY"]
        ) if self.config["sync"]["enabled"] and self.secrets.get("SUPABASE_URL") else None

    def _load_secrets(self) -> Dict[str, str]:
        """Load secrets from environment variables or files"""
        secrets = {}
        for key, path in self.config["secrets"].items():
            env_key = key.upper().replace("_PATH", "")
            # Try env var first, then file
            env_value = os.getenv(env_key)
            if env_value:
                secrets[env_key] = env_value
            elif os.path.exists(path):
                secrets[env_key] = open(path).read().strip()
            else:
                print(f"⚠️  Warning: {env_key} not found in environment or {path}")
                secrets[env_key] = None
        return secrets

    def init_db(self):
        """Initialize SQLite database"""
        self.db.execute("""
            CREATE TABLE IF NOT EXISTS jobs (
                id TEXT PRIMARY KEY,
                site TEXT,
                data JSON,
                found_at TIMESTAMP,
                sent_at TIMESTAMP,
                filtered_reason TEXT,
                applied_filters JSON
            )
        """)
        self.db.execute("""
            CREATE TABLE IF NOT EXISTS runs (
                id TEXT PRIMARY KEY,
                started_at TIMESTAMP,
                finished_at TIMESTAMP,
                found_count INTEGER,
                sent_count INTEGER,
                error TEXT
            )
        """)
        self.db.commit()

    def scrape_apify(self, actor: str, input_data: Dict) -> List[Dict]:
        """Scrape using Apify actor"""
        if not self.secrets.get("APIFY_TOKEN"):
            print(f"⚠️  Skipping Apify scraper {actor} - no token configured")
            return []

        print(f"🔄 Scraping {actor}...")

        try:
            # Start actor run
            resp = requests.post(
                f"https://api.apify.com/v2/acts/{actor}/runs",
                json={"runInput": input_data},
                headers={"Authorization": f"Bearer {self.secrets['APIFY_TOKEN']}"},
                timeout=60
            )
            resp.raise_for_status()
            resp_json = resp.json()

            run_id = resp_json["data"]["id"]

            # Wait for completion
            max_wait = 300  # 5 minutes
            waited = 0
            while waited < max_wait:
                status_resp = requests.get(
                    f"https://api.apify.com/v2/actor-runs/{run_id}",
                    headers={"Authorization": f"Bearer {self.secrets['APIFY_TOKEN']}"}
                )
                status_resp.raise_for_status()
                status_json = status_resp.json()

                status = status_json["data"]["status"]
                if status == "SUCCEEDED":
                    break
                elif status in ["FAILED", "ABORTED"]:
                    raise Exception(f"Apify run {run_id} failed: {status}")

                time.sleep(3)
                waited += 3

            if waited >= max_wait:
                raise Exception(f"Apify run {run_id} timed out after {max_wait}s")

            # Fetch results
            dataset_id = status_json["data"]["defaultDatasetId"]
            items = []
            offset = 0

            while True:
                batch = requests.get(
                    f"https://api.apify.com/v2/datasets/{dataset_id}/items",
                    params={"offset": offset, "limit": 1000, "clean": True},
                    headers={"Authorization": f"Bearer {self.secrets['APIFY_TOKEN']}"}
                ).json()

                if not batch:
                    break

                items.extend(batch)
                offset += len(batch)

            print(f"✅ Got {len(items)} items from {actor}")
            return items

        except Exception as e:
            print(f"❌ Error scraping {actor}: {e}")
            return []

    def normalize_job(self, raw_job: Dict, site: str) -> Dict:
        """Convert raw scraper output to standard format"""
        # Handle different schemas from different actors
        if site == "upwork":
            return {
                "id": f"upwork:{raw_job.get('id', hash(str(raw_job)))}",
                "site": "upwork",
                "title": raw_job.get("title") or raw_job.get("job_title", ""),
                "company": "Upwork Client",
                "url": raw_job.get("url") or raw_job.get("job_url", ""),
                "pay_text": str(raw_job.get("hourly", {}).get("range", "")) if isinstance(raw_job.get("hourly"), dict) else str(raw_job.get("pay", "")),
                "description": raw_job.get("description", ""),
                "posted_at": raw_job.get("ts_publish") or raw_job.get("date_posted"),
                "raw": raw_job
            }
        elif site == "linkedin":
            return {
                "id": f"linkedin:{raw_job.get('id', hash(str(raw_job)))}",
                "site": "linkedin",
                "title": raw_job.get("title", ""),
                "company": raw_job.get("company", ""),
                "url": raw_job.get("url") or raw_job.get("job_url", ""),
                "pay_text": raw_job.get("salary", ""),
                "description": raw_job.get("description", ""),
                "posted_at": raw_job.get("date_posted"),
                "raw": raw_job
            }
        else:
            # Generic fallback
            return {
                "id": f"{site}:{hash(str(raw_job))}",
                "site": site,
                "title": raw_job.get("title", ""),
                "company": raw_job.get("company", "Unknown"),
                "url": raw_job.get("url", ""),
                "pay_text": raw_job.get("pay", ""),
                "description": raw_job.get("description", ""),
                "posted_at": raw_job.get("posted_at"),
                "raw": raw_job
            }

    def should_send(self, job: Dict, filters: Dict) -> Tuple[bool, str]:
        """Apply filters to job. Returns (should_send, reason)"""
        title = job.get("title", "").lower()
        description = job.get("description", "").lower()

        # 1. Excluded keywords
        for kw in filters["excluded_keywords"]:
            if kw.lower() in title:
                return False, f"excluded_keyword:{kw}"

        # 2. Target patterns
        has_target = False
        for pattern in filters["target_patterns"]:
            if re.search(pattern, title, re.I):
                has_target = True
                break

        if not has_target:
            return False, "no_target_pattern"

        # 3. Pay threshold (optional check)
        pay_text = job.get("pay_text", "").lower()

        # Extract numbers from pay text
        numbers = re.findall(r'\$?(\d{2,3})', pay_text)
        if numbers:
            # Try to find hourly rate
            for num_str in numbers:
                num = int(num_str)
                # Assume it's hourly if it's in reasonable range
                if 10 <= num <= 200:
                    if num < filters.get("min_hourly", 0):
                        return False, f"hourly_too_low:{num}"

        return True, "passed_filters"

    def send_telegram(self, job: Dict) -> bool:
        """Send job notification via Telegram"""
        if not self.secrets.get("TELEGRAM_TOKEN") or not self.secrets.get("TELEGRAM_CHAT_ID"):
            print(f"⚠️  Skipping Telegram notification - not configured")
            return False

        if self.dry_run:
            print(f"🔔 [DRY RUN] Would send to Telegram: {job['title']}")
            return True

        try:
            message = f"""
🎯 <b>{job['title']}</b>

🏢 {job['company']}
💰 {job['pay_text']}
🔗 {job['url']}

📝 {job['description'][:300]}...
            """.strip()

            url = f"https://api.telegram.org/bot{self.secrets['TELEGRAM_TOKEN']}/sendMessage"

            max_retries = self.config["telegram"]["max_retries"]
            for attempt in range(max_retries):
                resp = requests.post(url, json={
                    "chat_id": self.secrets["TELEGRAM_CHAT_ID"],
                    "text": message,
                    "parse_mode": "HTML",
                    "disable_web_page_preview": False
                }, timeout=10)

                if resp.status_code == 200:
                    time.sleep(self.config["telegram"]["delay_seconds"])
                    return True
                elif resp.status_code == 429:
                    # Rate limited
                    retry_after = resp.json().get("parameters", {}).get("retry_after", 5)
                    time.sleep(retry_after)
                else:
                    print(f"⚠️  Telegram API error: {resp.status_code} - {resp.text}")
                    if attempt < max_retries - 1:
                        time.sleep(2 ** attempt)

            return False

        except Exception as e:
            print(f"❌ Error sending Telegram: {e}")
            return False

    def sync_to_supabase(self, jobs: List[Dict]):
        """Sync jobs to Supabase"""
        if not self.supabase:
            return

        if self.dry_run:
            print(f"🔄 [DRY RUN] Would sync {len(jobs)} jobs to Supabase")
            return

        try:
            batch_size = self.config["sync"]["batch_size"]
            for i in range(0, len(jobs), batch_size):
                batch = jobs[i:i + batch_size]

                # Prepare data for Supabase
                supabase_data = []
                for job in batch:
                    supabase_data.append({
                        "id": job["id"],
                        "site": job["site"],
                        "title": job.get("title"),
                        "company": job.get("company"),
                        "url": job.get("url"),
                        "pay_text": job.get("pay_text"),
                        "description": job.get("description"),
                        "posted_at": job.get("posted_at"),
                        "found_at": job.get("found_at"),
                        "sent_at": job.get("sent_at"),
                        "filtered_reason": job.get("filtered_reason"),
                        "data": job.get("raw", {})
                    })

                # Upsert to Supabase
                self.supabase.table("jobs").upsert(supabase_data).execute()

            print(f"✅ Synced {len(jobs)} jobs to Supabase")

        except Exception as e:
            print(f"⚠️  Error syncing to Supabase: {e}")

    def run(self):
        """Main execution loop"""
        run_id = datetime.now().isoformat()
        started_at = datetime.now()

        print(f"🚀 Starting job bot run: {run_id}")

        # Insert run record
        self.db.execute(
            "INSERT INTO runs (id, started_at, found_count, sent_count) VALUES (?, ?, 0, 0)",
            (run_id, started_at.isoformat())
        )
        self.db.commit()

        all_jobs = []
        sent_count = 0
        found_count = 0

        try:
            # Scrape each configured source
            for scraper_name, scraper_config in self.config["scrapers"].items():
                if scraper_config["type"] == "apify":
                    raw_jobs = self.scrape_apify(
                        scraper_config["actor"],
                        scraper_config["input"]
                    )

                    # Normalize and process jobs
                    for raw_job in raw_jobs:
                        job = self.normalize_job(raw_job, scraper_name)
                        found_count += 1

                        # Check if already exists
                        existing = self.db.execute(
                            "SELECT id FROM jobs WHERE id = ?",
                            (job["id"],)
                        ).fetchone()

                        if existing:
                            print(f"⏭️  Skipping duplicate: {job['id']}")
                            continue

                        # Apply filters
                        should_send, reason = self.should_send(job, self.config["filters"])

                        job["found_at"] = datetime.now().isoformat()
                        job["filtered_reason"] = None if should_send else reason
                        job["sent_at"] = None

                        # Send if passed filters
                        if should_send:
                            if self.send_telegram(job):
                                job["sent_at"] = datetime.now().isoformat()
                                sent_count += 1
                                print(f"✅ Sent: {job['title']}")
                            else:
                                print(f"⚠️  Failed to send: {job['title']}")
                        else:
                            print(f"🚫 Filtered: {job['title']} - {reason}")

                        # Store in database
                        self.db.execute(
                            """INSERT INTO jobs (id, site, data, found_at, sent_at, filtered_reason)
                               VALUES (?, ?, ?, ?, ?, ?)""",
                            (job["id"], job["site"], json.dumps(job),
                             job["found_at"], job["sent_at"], job["filtered_reason"])
                        )
                        self.db.commit()

                        all_jobs.append(job)

            # Sync to Supabase
            if all_jobs:
                self.sync_to_supabase(all_jobs)

            # Update run record
            finished_at = datetime.now()
            self.db.execute(
                """UPDATE runs SET finished_at = ?, found_count = ?, sent_count = ?
                   WHERE id = ?""",
                (finished_at.isoformat(), found_count, sent_count, run_id)
            )
            self.db.commit()

            print(f"""
=== RUN COMPLETE ===
⏱️  Duration: {(finished_at - started_at).total_seconds():.1f}s
🔍 Found: {found_count}
📤 Sent: {sent_count}
🚫 Filtered: {found_count - sent_count}
            """)

        except Exception as e:
            print(f"❌ Error during run: {e}")
            self.db.execute(
                "UPDATE runs SET error = ? WHERE id = ?",
                (str(e), run_id)
            )
            self.db.commit()
            raise


def main():
    import argparse

    parser = argparse.ArgumentParser(description="SDR Job Bot")
    parser.add_argument("--dry-run", action="store_true", help="Run without sending notifications")
    parser.add_argument("--config", default="config.yaml", help="Path to config file")

    args = parser.parse_args()

    bot = JobBot(config_path=args.config, dry_run=args.dry_run)
    bot.run()


if __name__ == "__main__":
    main()
