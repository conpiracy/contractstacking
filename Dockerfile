# SDR Job Bot - Docker Container

FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY config.yaml .
COPY jobbot.py .
COPY .env .env

# Create data directory for SQLite
RUN mkdir -p /data

# Set environment variable for database location
ENV DATABASE_PATH=/data/jobbot.db

# Make jobbot.py executable
RUN chmod +x jobbot.py

# Health check
HEALTHCHECK --interval=5m --timeout=10s --start-period=30s --retries=3 \
    CMD python3 -c "import sqlite3; conn = sqlite3.connect('${DATABASE_PATH:-jobbot.db}'); conn.execute('SELECT 1'); conn.close()" || exit 1

# Run the bot
CMD ["python3", "jobbot.py"]
