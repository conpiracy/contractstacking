// Dashboard App Logic

// State
let allJobs = [];
let filteredJobs = [];
let settings = {};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    setupEventListeners();
    updateStatusIndicators();

    // Load jobs if credentials are configured
    if (settings.supabase_url && settings.supabase_key) {
        loadJobs();
        // Auto-refresh every 5 seconds
        setInterval(loadJobs, 5000);
    } else {
        // Show sample data for demo
        loadSampleData();
    }
});


// Settings Management
function loadSettings() {
    settings = {
        apify_token: localStorage.getItem('apify_token') || '',
        telegram_token: localStorage.getItem('telegram_token') || '',
        telegram_chat_id: localStorage.getItem('telegram_chat_id') || '',
        supabase_url: localStorage.getItem('supabase_url') || '',
        supabase_key: localStorage.getItem('supabase_key') || '',
        min_hourly: parseInt(localStorage.getItem('min_hourly') || '15'),
        excluded_keywords: localStorage.getItem('excluded_keywords') || 'manager,director,senior,vp,vice president',
        target_keywords: localStorage.getItem('target_keywords') || 'sdr,bdr,sales dev,appointment setter,lead gen'
    };
}

function saveSettings() {
    settings.apify_token = document.getElementById('apify-token').value;
    settings.telegram_token = document.getElementById('telegram-token').value;
    settings.telegram_chat_id = document.getElementById('telegram-chat-id').value;
    settings.supabase_url = document.getElementById('supabase-url').value;
    settings.supabase_key = document.getElementById('supabase-key').value;
    settings.min_hourly = parseInt(document.getElementById('min-hourly').value || '15');
    settings.excluded_keywords = document.getElementById('excluded-keywords').value;
    settings.target_keywords = document.getElementById('target-keywords').value;

    // Save to localStorage
    Object.keys(settings).forEach(key => {
        localStorage.setItem(key, settings[key]);
    });

    updateStatusIndicators();

    // Show success message
    const status = document.getElementById('save-status');
    status.style.display = 'block';
    setTimeout(() => {
        status.style.display = 'none';
        closeSettings();
    }, 2000);
}

function openSettings() {
    // Populate form with current settings
    document.getElementById('apify-token').value = settings.apify_token;
    document.getElementById('telegram-token').value = settings.telegram_token;
    document.getElementById('telegram-chat-id').value = settings.telegram_chat_id;
    document.getElementById('supabase-url').value = settings.supabase_url;
    document.getElementById('supabase-key').value = settings.supabase_key;
    document.getElementById('min-hourly').value = settings.min_hourly;
    document.getElementById('excluded-keywords').value = settings.excluded_keywords;
    document.getElementById('target-keywords').value = settings.target_keywords;

    document.getElementById('settings-modal').classList.add('active');
}

function closeSettings() {
    document.getElementById('settings-modal').classList.remove('active');
}

function updateStatusIndicators() {
    // Apify status
    const apifyStatus = document.getElementById('apify-status');
    if (apifyStatus) {
        apifyStatus.className = 'status-indicator ' + (settings.apify_token ? 'green' : 'red');
    }

    // Telegram status
    const telegramStatus = document.getElementById('telegram-status');
    if (telegramStatus) {
        telegramStatus.className = 'status-indicator ' +
            (settings.telegram_token && settings.telegram_chat_id ? 'green' : 'red');
    }

    // Supabase status
    const supabaseStatus = document.getElementById('supabase-status');
    if (supabaseStatus) {
        supabaseStatus.className = 'status-indicator ' +
            (settings.supabase_url && settings.supabase_key ? 'green' : 'yellow');
    }
}

async function testTelegram() {
    if (!settings.telegram_token || !settings.telegram_chat_id) {
        alert('Please enter both Telegram Bot Token and Chat ID first');
        return;
    }

    const testMessage = '🎉 SDR Job Bot is connected! Your notifications are working.';
    const url = `https://api.telegram.org/bot${settings.telegram_token}/sendMessage`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: settings.telegram_chat_id,
                text: testMessage
            })
        });

        if (response.ok) {
            alert('✅ Test message sent successfully! Check your Telegram.');
        } else {
            const error = await response.json();
            alert('❌ Failed to send message: ' + (error.description || 'Unknown error'));
        }
    } catch (error) {
        alert('❌ Error: ' + error.message);
    }
}

function exportToEnv() {
    const envContent = `# SDR Job Bot Environment Variables
# Generated from Dashboard Settings on ${new Date().toLocaleString()}

# Apify API Token (for job scraping)
APIFY_TOKEN=${settings.apify_token || 'your_apify_token_here'}

# Telegram Bot Configuration
TELEGRAM_TOKEN=${settings.telegram_token || 'your_telegram_bot_token_here'}
TELEGRAM_CHAT_ID=${settings.telegram_chat_id || 'your_telegram_chat_id_here'}

# Supabase Configuration (optional - for cloud database)
SUPABASE_URL=${settings.supabase_url || 'https://your-project.supabase.co'}
SUPABASE_SERVICE_KEY=${settings.supabase_key || 'your_supabase_service_role_key_here'}

# Filter Settings
MIN_HOURLY=${settings.min_hourly || 15}
EXCLUDED_KEYWORDS=${settings.excluded_keywords || 'manager,director,senior,vp'}
TARGET_KEYWORDS=${settings.target_keywords || 'sdr,bdr,sales dev,appointment setter'}
`;

    document.getElementById('env-content').value = envContent;
    document.getElementById('env-export').style.display = 'block';
}

function copyEnvToClipboard() {
    const content = document.getElementById('env-content');
    content.select();
    document.execCommand('copy');

    // Show feedback
    const btn = event.target;
    const originalText = btn.textContent;
    btn.textContent = '✅ Copied!';
    setTimeout(() => {
        btn.textContent = originalText;
    }, 2000);
}

function setupEventListeners() {
    document.getElementById('filter-status').addEventListener('change', applyFilters);
    document.getElementById('filter-site').addEventListener('change', applyFilters);
    document.getElementById('search-input').addEventListener('input', applyFilters);

    // Settings form
    document.getElementById('settings-form').addEventListener('submit', (e) => {
        e.preventDefault();
        saveSettings();
    });

    // Close modal on background click
    document.getElementById('settings-modal').addEventListener('click', (e) => {
        if (e.target.id === 'settings-modal') {
            closeSettings();
        }
    });
}

async function loadJobs() {
    try {
        // Try to load from local SQLite database first
        const dbResponse = await fetch('../jobbot.db').catch(() => null);

        if (dbResponse && dbResponse.ok) {
            // Use local SQLite mode
            await loadFromLocalDB();
        } else if (SUPABASE_URL && SUPABASE_ANON_KEY) {
            // Use Supabase
            await loadFromSupabase();
        } else {
            // Show sample data for demo
            loadSampleData();
        }
    } catch (error) {
        console.error('Error loading jobs:', error);
        loadSampleData();
    }
}

async function loadFromSupabase() {
    if (!settings.supabase_url || !settings.supabase_key) {
        loadSampleData();
        return;
    }

    try {
        const response = await fetch(`${settings.supabase_url}/rest/v1/jobs?select=*&order=found_at.desc`, {
            headers: {
                'apikey': settings.supabase_key,
                'Authorization': `Bearer ${settings.supabase_key}`
            }
        });

        if (response.ok) {
            const jobs = await response.json();
            allJobs = jobs.map(job => ({
                ...job,
                data: typeof job.data === 'string' ? JSON.parse(job.data) : job.data
            }));
            applyFilters();
            updateStats();
        }
    } catch (error) {
        console.error('Supabase error:', error);
        loadSampleData();
    }
}

async function loadFromLocalDB() {
    // For local development, we'd need a backend endpoint
    // For now, use sample data
    loadSampleData();
}

function loadSampleData() {
    // Sample data for testing
    allJobs = [
        {
            id: 'sample-1',
            site: 'upwork',
            title: 'Sales Development Representative - Tech Startup',
            company: 'Upwork Client',
            pay_text: '$25-35/hr',
            description: 'Looking for an experienced SDR to help build our outbound sales pipeline. Must have 2+ years experience with SaaS sales.',
            url: 'https://upwork.com/sample',
            found_at: new Date().toISOString(),
            sent_at: new Date().toISOString(),
            filtered_reason: null
        },
        {
            id: 'sample-2',
            site: 'linkedin',
            title: 'Business Development Representative',
            company: 'Tech Company Inc',
            pay_text: '$60k-80k OTE',
            description: 'Join our growing sales team as a BDR. Focus on outbound prospecting and qualification.',
            url: 'https://linkedin.com/sample',
            found_at: new Date(Date.now() - 3600000).toISOString(),
            sent_at: null,
            filtered_reason: 'hourly_too_low:12'
        },
        {
            id: 'sample-3',
            site: 'upwork',
            title: 'Appointment Setter - Remote',
            company: 'Upwork Client',
            pay_text: '$20/hr',
            description: 'Set appointments for our B2B sales team. Flexible hours, work from anywhere.',
            url: 'https://upwork.com/sample2',
            found_at: new Date(Date.now() - 7200000).toISOString(),
            sent_at: new Date(Date.now() - 7000000).toISOString(),
            filtered_reason: null
        }
    ];

    applyFilters();
    updateStats();
}

function applyFilters() {
    const statusFilter = document.getElementById('filter-status').value;
    const siteFilter = document.getElementById('filter-site').value;
    const searchQuery = document.getElementById('search-input').value.toLowerCase();

    filteredJobs = allJobs.filter(job => {
        // Status filter
        if (statusFilter === 'sent' && !job.sent_at) return false;
        if (statusFilter === 'filtered' && !job.filtered_reason) return false;

        // Site filter
        if (siteFilter !== 'all' && job.site !== siteFilter) return false;

        // Search filter
        if (searchQuery) {
            const searchableText = `${job.title} ${job.company} ${job.description}`.toLowerCase();
            if (!searchableText.includes(searchQuery)) return false;
        }

        return true;
    });

    renderJobs();
}

function renderJobs() {
    const container = document.getElementById('jobs-container');

    if (filteredJobs.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h2>📭 No jobs found</h2>
                <p>Try adjusting your filters or run the bot to find new jobs</p>
            </div>
        `;
        return;
    }

    const jobsHTML = filteredJobs.map(job => {
        const isSent = !!job.sent_at;
        const isFiltered = !!job.filtered_reason;
        const statusClass = isSent ? 'sent' : (isFiltered ? 'filtered' : '');
        const badgeClass = isSent ? 'badge-sent' : (isFiltered ? 'badge-filtered' : 'badge-pending');
        const badgeText = isSent ? '✓ Sent' : (isFiltered ? '✗ Filtered' : '⏳ Pending');

        const foundDate = new Date(job.found_at);
        const timeAgo = getTimeAgo(foundDate);

        return `
            <div class="job-card ${statusClass}">
                <div class="job-header">
                    <div>
                        <div class="job-title">${escapeHtml(job.title)}</div>
                        <div class="job-company">🏢 ${escapeHtml(job.company)}</div>
                    </div>
                    <span class="job-badge ${badgeClass}">${badgeText}</span>
                </div>

                ${job.pay_text ? `<div class="job-pay">💰 ${escapeHtml(job.pay_text)}</div>` : ''}

                <div class="job-description">
                    ${escapeHtml(job.description || 'No description available').substring(0, 200)}...
                </div>

                <div class="job-meta">
                    <span>📍 ${job.site}</span>
                    <span>🕐 ${timeAgo}</span>
                </div>

                ${isFiltered ? `
                    <div style="background: #fff3bf; padding: 10px; border-radius: 8px; margin-bottom: 10px; font-size: 0.85rem;">
                        <strong>Filtered:</strong> ${job.filtered_reason}
                    </div>
                ` : ''}

                <div class="job-actions">
                    <a href="${job.url}" target="_blank" class="btn btn-primary">View Job</a>
                    <button class="btn btn-secondary" onclick="copyJobUrl('${job.url}')">Copy Link</button>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = `<div class="jobs-grid">${jobsHTML}</div>`;
}

function updateStats() {
    const total = allJobs.length;
    const sent = allJobs.filter(j => j.sent_at).length;
    const filtered = allJobs.filter(j => j.filtered_reason).length;

    document.getElementById('total-jobs').textContent = total;
    document.getElementById('sent-jobs').textContent = sent;
    document.getElementById('filtered-jobs').textContent = filtered;

    // Get last run time
    if (allJobs.length > 0) {
        const lastRun = new Date(allJobs[0].found_at);
        document.getElementById('last-run').textContent = getTimeAgo(lastRun);
    }
}

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}

function copyJobUrl(url) {
    navigator.clipboard.writeText(url).then(() => {
        alert('Link copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy:', err);
    });
}
