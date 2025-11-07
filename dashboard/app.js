// Dashboard App Logic

// Configuration - update these with your Supabase credentials
const SUPABASE_URL = localStorage.getItem('supabase_url') || '';
const SUPABASE_ANON_KEY = localStorage.getItem('supabase_key') || '';

// State
let allJobs = [];
let filteredJobs = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();

    // Check if Supabase is configured
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        showSetupPrompt();
    } else {
        loadJobs();
        // Auto-refresh every 5 seconds
        setInterval(loadJobs, 5000);
    }
});

function showSetupPrompt() {
    const container = document.getElementById('jobs-container');
    container.innerHTML = `
        <div class="empty-state">
            <h2>⚙️ Setup Required</h2>
            <p style="margin-bottom: 20px;">Enter your Supabase credentials to connect the dashboard:</p>
            <div style="max-width: 500px; margin: 0 auto; background: white; padding: 30px; border-radius: 15px;">
                <input type="text" id="setup-url" placeholder="Supabase URL" style="width: 100%; margin-bottom: 10px;">
                <input type="text" id="setup-key" placeholder="Supabase Anon Key" style="width: 100%; margin-bottom: 20px;">
                <button class="btn btn-primary" onclick="saveSupabaseConfig()" style="width: 100%;">Save & Connect</button>
            </div>
            <p style="margin-top: 20px; color: rgba(255,255,255,0.7);">
                Or use local SQLite mode by running: <code>python3 -m http.server 8080</code> in the project directory
            </p>
        </div>
    `;
}

function saveSupabaseConfig() {
    const url = document.getElementById('setup-url').value;
    const key = document.getElementById('setup-key').value;

    if (url && key) {
        localStorage.setItem('supabase_url', url);
        localStorage.setItem('supabase_key', key);
        location.reload();
    } else {
        alert('Please enter both URL and Key');
    }
}

function setupEventListeners() {
    document.getElementById('filter-status').addEventListener('change', applyFilters);
    document.getElementById('filter-site').addEventListener('change', applyFilters);
    document.getElementById('search-input').addEventListener('input', applyFilters);
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
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/jobs?select=*&order=found_at.desc`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
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
