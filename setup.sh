#!/bin/bash
# SDR Job Bot - Local Setup Script

set -e

echo "🚀 SDR Job Bot - Setup Script"
echo "==============================="
echo ""

# Check Python version
echo "📋 Checking Python version..."
PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
REQUIRED_VERSION="3.11"

if ! python3 -c "import sys; exit(0 if sys.version_info >= (3, 11) else 1)"; then
    echo "❌ Python 3.11+ required. Found: $PYTHON_VERSION"
    echo "   Install Python 3.11+ and try again"
    exit 1
fi

echo "✅ Python $PYTHON_VERSION detected"
echo ""

# Create virtual environment
echo "📦 Creating virtual environment..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "✅ Virtual environment created"
else
    echo "ℹ️  Virtual environment already exists"
fi
echo ""

# Activate virtual environment
echo "🔄 Activating virtual environment..."
source venv/bin/activate
echo ""

# Upgrade pip
echo "⬆️  Upgrading pip..."
pip install --upgrade pip setuptools wheel --quiet
echo "✅ pip upgraded"
echo ""

# Install dependencies
echo "📚 Installing dependencies..."
pip install -r requirements.txt --quiet
echo "✅ Dependencies installed"
echo ""

# Create secrets directory
echo "🔐 Setting up secrets directory..."
mkdir -p secrets
echo "✅ Secrets directory created"
echo ""

# Copy .env template if .env doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file from template..."
    cp .env.template .env
    echo "✅ .env file created"
    echo "⚠️  IMPORTANT: Edit .env and add your API keys!"
else
    echo "ℹ️  .env file already exists"
fi
echo ""

# Initialize database
echo "🗄️  Initializing database..."
python3 -c "
import sqlite3
conn = sqlite3.connect('jobbot.db')
conn.execute('''
    CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        site TEXT,
        data JSON,
        found_at TIMESTAMP,
        sent_at TIMESTAMP,
        filtered_reason TEXT,
        applied_filters JSON
    )
''')
conn.execute('''
    CREATE TABLE IF NOT EXISTS runs (
        id TEXT PRIMARY KEY,
        started_at TIMESTAMP,
        finished_at TIMESTAMP,
        found_count INTEGER,
        sent_count INTEGER,
        error TEXT
    )
''')
conn.commit()
conn.close()
print('✅ Database initialized')
"
echo ""

# Test import
echo "🧪 Testing jobbot module..."
python3 -c "import jobbot; print('✅ jobbot module loads successfully')"
echo ""

echo "==============================="
echo "✅ Setup Complete!"
echo "==============================="
echo ""
echo "Next steps:"
echo "1. Edit .env and add your API keys"
echo "2. Test with: source venv/bin/activate && python3 jobbot.py --dry-run"
echo "3. Run for real: python3 jobbot.py"
echo "4. Start dashboard: cd dashboard && python3 -m http.server 8080"
echo ""
echo "Dashboard will be available at: http://localhost:8080"
echo ""
