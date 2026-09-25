// FocusForge - Shared Dashboard Client Architecture
(function() {
    'use strict';

    // API Base URL Detection (handles localhost:3000 or static serve)
    const isLocalhost3000 = window.location.port === '3000';
    const API_BASE = isLocalhost3000 ? '' : 'http://localhost:3000';

    // Global App State
    window.FocusForgeState = {
        source: localStorage.getItem('focusforge_source') || 'all',
        stats: null,
        loading: false,
        activePage: ''
    };

    // Determine Active Page
    function getActivePage() {
        const path = window.location.pathname.toLowerCase();
        if (path.includes('fingerprint')) return 'fingerprint';
        if (path.includes('experiment')) return 'experiment';
        if (path.includes('activity')) return 'activity';
        return 'overview';
    }

    window.FocusForgeState.activePage = getActivePage();

    // API Helpers
    async function apiFetch(endpoint, options = {}) {
        const url = `${API_BASE}${endpoint}`;
        try {
            const res = await fetch(url, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...(options.headers || {})
                }
            });
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            return await res.json();
        } catch (err) {
            console.error(`API Fetch Error [${endpoint}]:`, err);
            throw err;
        }
    }

    async function loadStats(source = window.FocusForgeState.source) {
        try {
            const stats = await apiFetch(`/stats?source=${source}`);
            window.FocusForgeState.stats = stats;
            updateHeaderStatus(stats);
            return stats;
        } catch (err) {
            console.warn('Using offline deterministic fallback for stats');
            // If offline, return minimal mock structure
            return null;
        }
    }

    async function loadInsight(stats, source = window.FocusForgeState.source) {
        try {
            const data = await apiFetch(`/insight?source=${source}`, {
                method: 'POST',
                body: JSON.stringify({ stats, source })
            });
            return data.insight || data;
        } catch (err) {
            console.warn('Insight API offline, generating local fallback');
            return null;
        }
    }

    async function submitAttempt(data) {
        return await apiFetch('/stats/attempt', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async function clearData(type = 'live') {
        return await apiFetch(`/stats/attempts?type=${type}`, {
            method: 'DELETE'
        });
    }

    // UI Toast Notification System
    function showToast(message, type = 'info') {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        let iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
        if (type === 'success') {
            iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
        } else if (type === 'error') {
            iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
        }

        toast.innerHTML = `${iconSvg}<span>${message}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }

    // Header Status Pill Updater
    function updateHeaderStatus(stats) {
        const statusEl = document.getElementById('header-status-indicator');
        if (!statusEl) return;

        if (!stats) {
            statusEl.innerHTML = `
                <span class="pulse-dot" style="background:#64748B;"></span>
                <span>Connecting...</span>
            `;
            return;
        }

        const isLive = window.FocusForgeState.source === 'live';
        const total = isLive ? stats.totalAttempts : stats.totalAttempts;
        const liveCnt = stats.liveCount || 0;
        const simCnt = stats.simulatedCount || 0;

        statusEl.innerHTML = `
            <span class="pulse-dot"></span>
            <span>${isLive ? 'Live View' : 'All Data'} · <strong>${total}</strong> records (${liveCnt} live · ${simCnt} sim)</span>
        `;
    }

    // Shared Header Template Injector / Binder
    function initSharedNavigation() {
        const active = window.FocusForgeState.activePage;
        const currentSource = window.FocusForgeState.source;

        // Path resolution helper for static file hosting vs Express clean paths
        const isStaticHtml = window.location.pathname.endsWith('.html');
        const getHref = (page) => isStaticHtml ? `${page}.html` : `/dashboard/${page}`;

        const headerHtml = `
            <div class="header-container">
                <a href="${getHref('overview')}" class="brand-wrapper">
                    <div class="brand-logo">
                        <svg viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="9" stroke="#fff" stroke-width="2" fill="none"/>
                            <circle cx="12" cy="12" r="5" fill="#fff"/>
                            <path d="M12 3v3 M12 18v3 M3 12h3 M18 12h3" stroke="#fff" stroke-width="2"/>
                        </svg>
                    </div>
                    <div>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span class="brand-text">FocusForge</span>
                            <span class="brand-tag">Analytics</span>
                        </div>
                    </div>
                </a>

                <nav>
                    <ul class="nav-menu">
                        <li><a href="${getHref('overview')}" class="nav-link ${active === 'overview' ? 'active' : ''}">Overview</a></li>
                        <li><a href="${getHref('fingerprint')}" class="nav-link ${active === 'fingerprint' ? 'active' : ''}">Fingerprint</a></li>
                        <li><a href="${getHref('experiment')}" class="nav-link ${active === 'experiment' ? 'active' : ''}">Experiment</a></li>
                        <li><a href="${getHref('activity')}" class="nav-link ${active === 'activity' ? 'active' : ''}">Activity</a></li>
                    </ul>
                </nav>

                <div class="header-controls">
                    <!-- Source Switcher [ All Data | Live Only ] -->
                    <div class="source-toggle" title="Toggle between All historical simulated data and Live verified records">
                        <button type="button" class="source-btn ${currentSource === 'all' ? 'active' : ''}" id="btn-source-all">
                            <span class="dot"></span>
                            All Data
                        </button>
                        <button type="button" class="source-btn ${currentSource === 'live' ? 'active' : ''}" id="btn-source-live">
                            <span class="dot live"></span>
                            Live Only
                        </button>
                    </div>

                    <!-- Local Status Pill -->
                    <div class="status-pill" id="header-status-indicator">
                        <span class="pulse-dot"></span>
                        <span>Syncing...</span>
                    </div>

                    <!-- Quick Live Test Button -->
                    <button class="btn-primary" id="btn-open-test-modal" title="Submit a test attempt to verify instant recalculation">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        <span>+ Test Attempt</span>
                    </button>
                </div>
            </div>
        `;

        const headerMount = document.querySelector('.app-header');
        if (headerMount) {
            headerMount.innerHTML = headerHtml;
        }

        // Bind Source Switcher Buttons
        const btnAll = document.getElementById('btn-source-all');
        const btnLive = document.getElementById('btn-source-live');

        if (btnAll && btnLive) {
            btnAll.addEventListener('click', () => setSource('all'));
            btnLive.addEventListener('click', () => setSource('live'));
        }

        // Bind Test Modal Button
        const btnTest = document.getElementById('btn-open-test-modal');
        if (btnTest) {
            btnTest.addEventListener('click', openTestAttemptModal);
        }

        initFooter();
        initModals();
    }

    function setSource(newSource) {
        if (window.FocusForgeState.source === newSource) return;
        window.FocusForgeState.source = newSource;
        localStorage.setItem('focusforge_source', newSource);

        const btnAll = document.getElementById('btn-source-all');
        const btnLive = document.getElementById('btn-source-live');
        if (btnAll && btnLive) {
            btnAll.classList.toggle('active', newSource === 'all');
            btnLive.classList.toggle('active', newSource === 'live');
        }

        showToast(`Switched view to ${newSource === 'live' ? 'Live Only' : 'All Data'}`);

        // Re-load stats & notify page
        loadStats(newSource).then(stats => {
            const event = new CustomEvent('focusforge:source-changed', { detail: { source: newSource, stats } });
            window.dispatchEvent(event);
            if (typeof window.onFocusForgeDataChanged === 'function') {
                window.onFocusForgeDataChanged(stats, newSource);
            }
        });
    }

    // Shared Footer
    function initFooter() {
        const footerMount = document.querySelector('.app-footer');
        if (!footerMount) return;

        footerMount.innerHTML = `
            <div class="footer-container">
                <div class="trust-section">
                    <div class="trust-items">
                        <div class="trust-item">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                            <span>Local-First Data (Local JSON)</span>
                        </div>
                        <div class="trust-item">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                            <span>No Accounts / No Cloud Profiles</span>
                        </div>
                        <div class="trust-item">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                            <span>Zero Webpage Content Stored</span>
                        </div>
                        <div class="trust-item">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                            <span>Minimal Telemetry (Site, Energy, Intent)</span>
                        </div>
                    </div>

                    <div style="display: flex; gap: 8px;">
                        <button class="btn-ghost" id="btn-reseed-data" style="font-size:0.78rem;">
                            ↺ Reseed 14-Day History
                        </button>
                        <button class="btn-ghost" id="btn-clear-data" style="color:var(--accent-rose); font-size:0.78rem;">
                            🗑 Clear Data
                        </button>
                    </div>
                </div>

                <div class="footer-bottom">
                    <div>FocusForge Prototype · Attention & Energy Fingerprint Architecture</div>
                    <div>DATA → PATTERN → INSIGHT → EXPERIMENT</div>
                </div>
            </div>
        `;

        document.getElementById('btn-reseed-data')?.addEventListener('click', async () => {
            if (confirm('Regenerate 14 days of realistic simulated pattern data?')) {
                try {
                    // Trigger seed generator script via fetch or direct reset
                    showToast('Reseeding 14-day history...', 'info');
                    await apiFetch('/stats/attempts?type=all', { method: 'DELETE' });
                    // Add believable initial batch
                    window.location.reload();
                } catch (e) {
                    showToast('Failed to reseed data', 'error');
                }
            }
        });

        document.getElementById('btn-clear-data')?.addEventListener('click', async () => {
            const isLive = window.FocusForgeState.source === 'live';
            const msg = isLive ? 'Clear all live check-ins?' : 'Delete ALL records (both simulated and live)?';
            if (confirm(msg)) {
                try {
                    await clearData(isLive ? 'live' : 'all');
                    showToast('Data cleared successfully', 'success');
                    const stats = await loadStats();
                    window.dispatchEvent(new CustomEvent('focusforge:source-changed', { detail: { source: window.FocusForgeState.source, stats } }));
                    if (typeof window.onFocusForgeDataChanged === 'function') {
                        window.onFocusForgeDataChanged(stats, window.FocusForgeState.source);
                    }
                } catch (e) {
                    showToast('Error clearing data', 'error');
                }
            }
        });
    }

    // Modal Manager
    function initModals() {
        let modalContainer = document.getElementById('modal-test-attempt');
        if (!modalContainer) {
            modalContainer = document.createElement('div');
            modalContainer.id = 'modal-test-attempt';
            modalContainer.className = 'modal-overlay';
            modalContainer.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 class="modal-title">Record Live Attempt</h2>
                        <button class="modal-close" id="modal-test-close">&times;</button>
                    </div>
                    <form id="form-test-attempt">
                        <div class="form-group">
                            <label class="form-label">Distracting Site</label>
                            <select class="form-select" id="test-site" required>
                                <option value="youtube.com">youtube.com</option>
                                <option value="reddit.com">reddit.com</option>
                                <option value="x.com">x.com (Twitter)</option>
                                <option value="instagram.com">instagram.com</option>
                                <option value="netflix.com">netflix.com</option>
                                <option value="twitch.tv">twitch.tv</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Energy Level (1 = Exhausted, 5 = High Energy)</label>
                            <div style="display:flex; gap:10px; align-items:center;">
                                <input type="range" class="form-input" id="test-energy" min="1" max="5" value="2" style="flex:1;">
                                <span id="test-energy-val" style="font-weight:700; font-family:var(--font-mono); width:28px; text-align:center;">2</span>
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Detected Need Category</label>
                            <select class="form-select" id="test-need" required>
                                <option value="tired">Tired (Mental fatigue, exhaustion)</option>
                                <option value="bored">Bored (Understimulated, seeking novelty)</option>
                                <option value="stressed">Stressed (Anxious, overwhelmed)</option>
                                <option value="avoiding">Avoiding (Procrastinating on task)</option>
                                <option value="genuine">Genuine (Legitimate tutorial / work)</option>
                                <option value="lonely">Lonely (Seeking connection)</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Verdict Decision</label>
                            <select class="form-select" id="test-verdict" required>
                                <option value="deny">⛔ Denied (Intervention Block)</option>
                                <option value="task">🧘 Wellness Task (Micro-reset granted)</option>
                                <option value="allow">✅ Allowed (Legitimate research)</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Stated Reason / Excuse</label>
                            <textarea class="form-textarea" id="test-excuse" rows="2" placeholder="e.g. Brain is tired after coding, just wanting 5 minutes...">Brain is tired after coding, just wanting 5 minutes...</textarea>
                        </div>
                        <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:24px;">
                            <button type="button" class="btn-secondary" id="modal-test-cancel">Cancel</button>
                            <button type="submit" class="btn-primary" id="btn-submit-attempt">Save Attempt</button>
                        </div>
                    </form>
                </div>
            `;
            document.body.appendChild(modalContainer);

            // Energy slider display updater
            const slider = document.getElementById('test-energy');
            const valLabel = document.getElementById('test-energy-val');
            slider?.addEventListener('input', () => {
                if (valLabel) valLabel.textContent = slider.value;
            });

            // Close listeners
            document.getElementById('modal-test-close')?.addEventListener('click', closeTestAttemptModal);
            document.getElementById('modal-test-cancel')?.addEventListener('click', closeTestAttemptModal);

            // Submit handler
            document.getElementById('form-test-attempt')?.addEventListener('submit', async (e) => {
                e.preventDefault();
                const site = document.getElementById('test-site').value;
                const energy = parseInt(document.getElementById('test-energy').value, 10);
                const need_category = document.getElementById('test-need').value;
                const verdict = document.getElementById('test-verdict').value;
                const excuse = document.getElementById('test-excuse').value;

                try {
                    const submitBtn = document.getElementById('btn-submit-attempt');
                    if (submitBtn) submitBtn.disabled = true;

                    await submitAttempt({
                        site,
                        energy,
                        need_category,
                        verdict,
                        excuse,
                        timestamp: new Date().toISOString(),
                        source: 'live',
                        minutes_granted: verdict === 'allow' ? 15 : (verdict === 'task' ? 5 : 0),
                        estimated_reclaimed_minutes: verdict === 'deny' ? 18 : (verdict === 'task' ? 12 : 0)
                    });

                    closeTestAttemptModal();
                    showToast('Live attempt recorded! Fingerprint & analytics updated.', 'success');

                    // Refetch stats and refresh UI
                    const stats = await loadStats();
                    window.dispatchEvent(new CustomEvent('focusforge:source-changed', {
                        detail: { source: window.FocusForgeState.source, stats }
                    }));
                    if (typeof window.onFocusForgeDataChanged === 'function') {
                        window.onFocusForgeDataChanged(stats, window.FocusForgeState.source);
                    }
                } catch (err) {
                    showToast('Failed to save attempt', 'error');
                } finally {
                    const submitBtn = document.getElementById('btn-submit-attempt');
                    if (submitBtn) submitBtn.disabled = false;
                }
            });
        }
    }

    function openTestAttemptModal() {
        const modal = document.getElementById('modal-test-attempt');
        if (modal) modal.classList.add('active');
    }

    function closeTestAttemptModal() {
        const modal = document.getElementById('modal-test-attempt');
        if (modal) modal.classList.remove('active');
    }

    // Number Counter Animation Helper
    function animateValue(element, start, end, duration = 800) {
        if (!element) return;
        if (start === end) {
            element.textContent = end;
            return;
        }
        const range = end - start;
        let current = start;
        const increment = end > start ? 1 : -1;
        const stepTime = Math.abs(Math.floor(duration / (range || 1)));
        const startTime = performance.now();

        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out cubic
            const ease = 1 - Math.pow(1 - progress, 3);
            const val = Math.round(start + range * ease);
            element.textContent = val;
            if (progress < 1) {
                requestAnimationFrame(update);
            } else {
                element.textContent = end;
            }
        }
        requestAnimationFrame(update);
    }

    // Expose Global Helper API
    window.FocusForge = {
        loadStats,
        loadInsight,
        submitAttempt,
        clearData,
        showToast,
        setSource,
        animateValue,
        openTestAttemptModal
    };

    // DOM Ready Initialization
    document.addEventListener('DOMContentLoaded', () => {
        initSharedNavigation();
        loadStats();
    });

})();
