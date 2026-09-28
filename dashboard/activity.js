// FocusForge - Activity Controller
(function() {
    'use strict';

    let allLoadedAttempts = [];

    function formatTime(isoStr) {
        if (!isoStr) return 'Unknown';
        const d = new Date(isoStr);
        if (isNaN(d.getTime())) return isoStr;

        const now = new Date();
        const isToday = d.toDateString() === now.toDateString();
        
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        const isYesterday = d.toDateString() === yesterday.toDateString();

        const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        if (isToday) return `Today, ${timeStr}`;
        if (isYesterday) return `Yesterday, ${timeStr}`;

        const monthName = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
        return `${monthName}, ${timeStr}`;
    }

    function renderEnergyDots(level) {
        const lvl = Math.max(1, Math.min(5, Number(level) || 1));
        let dots = '';
        for (let i = 1; i <= 5; i++) {
            dots += `<span class="energy-dot ${i <= lvl ? 'filled' : ''}"></span>`;
        }
        return `<div class="energy-dots" title="Energy Level: ${lvl}/5">${dots} <span style="font-size:0.75rem; color:var(--text-muted); margin-left:4px;">${lvl}/5</span></div>`;
    }

    function renderVerdictBadge(verdict) {
        const v = (verdict || 'deny').toLowerCase();
        if (v === 'deny') {
            return `<span class="badge badge-deny">⛔ Denied</span>`;
        } else if (v === 'task') {
            return `<span class="badge badge-task">🧘 Wellness Task</span>`;
        } else if (v === 'allow') {
            return `<span class="badge badge-allow">✅ Allowed</span>`;
        }
        return `<span class="badge">${v}</span>`;
    }

    function renderNeedBadge(need) {
        const n = (need || 'other').toLowerCase();
        const colors = {
            tired: '#F59E0B',
            bored: '#3B82F6',
            stressed: '#EC4899',
            lonely: '#8B5CF6',
            avoiding: '#EF4444',
            genuine: '#10B981',
            other: '#6B7280'
        };
        const color = colors[n] || '#6B7280';
        const label = n.charAt(0).toUpperCase() + n.slice(1);
        return `<span class="badge" style="background:${color}20; color:${color}; border:1px solid ${color}40;">${label}</span>`;
    }

    async function loadActivity() {
        const source = FocusForgeState.source;
        const verdict = document.getElementById('filter-verdict')?.value || 'all';
        const site = document.getElementById('filter-site')?.value || 'all';
        const need = document.getElementById('filter-need')?.value || 'all';
        const energy = document.getElementById('filter-energy')?.value || 'all';
        const search = document.getElementById('filter-search')?.value || '';

        const params = new URLSearchParams();
        if (source !== 'all') params.append('source', source);
        if (verdict !== 'all') params.append('verdict', verdict);
        if (site !== 'all') params.append('site', site);
        if (need !== 'all') params.append('need', need);
        if (energy !== 'all') params.append('energy', energy);
        if (search.trim()) params.append('search', search.trim());

        try {
            const res = await fetch(`/stats/activity?${params.toString()}`);
            const data = await res.json();
            const attempts = data.attempts || [];
            allLoadedAttempts = attempts;
            renderTable(attempts);
            renderMobileCards(attempts);
            updateRecordCounter(attempts.length);
        } catch (e) {
            console.error('Error loading activity:', e);
        }
    }

    function updateRecordCounter(count) {
        const counter = document.getElementById('activity-counter');
        const noResults = document.getElementById('no-results-banner');
        const tableContainer = document.querySelector('.table-container');
        const mobileContainer = document.getElementById('activity-cards-body');

        if (counter) {
            const isLive = FocusForgeState.source === 'live';
            counter.textContent = `Showing ${count} ${isLive ? 'live' : ''} attempt(s)`;
        }

        if (count === 0) {
            if (noResults) noResults.style.display = 'block';
            if (tableContainer) tableContainer.style.display = 'none';
            if (mobileContainer) mobileContainer.style.display = 'none';
        } else {
            if (noResults) noResults.style.display = 'none';
            if (tableContainer) tableContainer.style.display = 'block';
            if (mobileContainer) mobileContainer.style.display = '';
        }
    }

    function renderTable(attempts) {
        const tbody = document.getElementById('activity-table-body');
        if (!tbody) return;

        if (attempts.length === 0) {
            tbody.innerHTML = '';
            return;
        }

        tbody.innerHTML = attempts.map((a, idx) => {
            const v = (a.verdict || 'deny').toLowerCase();
            let minutesText = '0 min';
            if (v === 'allow') {
                minutesText = `<span style="color:var(--accent-emerald); font-weight:600;">+${a.minutes_granted || 15}m granted</span>`;
            } else if (v === 'task') {
                minutesText = `<span style="color:var(--accent-amber);">5m reset (+12m saved)</span>`;
            } else {
                minutesText = `<span style="color:var(--accent-cyan);">+18m reclaimed</span>`;
            }

            const sourceBadge = a.source === 'live' 
                ? `<span class="badge badge-live">Live</span>` 
                : `<span class="badge badge-simulated">Simulated</span>`;

            return `
                <tr>
                    <td class="time-cell">${formatTime(a.timestamp)}</td>
                    <td>
                        <span class="site-badge-pill">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                            ${a.site}
                        </span>
                    </td>
                    <td>${renderEnergyDots(a.energy)}</td>
                    <td>${renderNeedBadge(a.need_category || a.need)}</td>
                    <td>${renderVerdictBadge(a.verdict)}</td>
                    <td style="font-family:var(--font-mono); font-size:0.8rem;">${minutesText}</td>
                    <td>${sourceBadge}</td>
                    <td>
                        <button class="btn-inspect-excuse" onclick="toggleExcuse('excuse-${idx}')">Inspect</button>
                        <div class="excuse-popup" id="excuse-${idx}">
                            "${escapeHtml(a.excuse || 'No reason provided')}"
                            ${a.micro_task ? `<div style="margin-top:4px; font-weight:600; color:var(--accent-amber);">Task assigned: ${a.micro_task.title || 'Micro-reset'}</div>` : ''}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    function renderMobileCards(attempts) {
        const container = document.getElementById('activity-cards-body');
        if (!container) return;

        if (attempts.length === 0) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = attempts.map((a, idx) => `
            <div class="mobile-attempt-card">
                <div class="mobile-card-row">
                    <strong style="color:#FFF; font-size:1rem;">${a.site}</strong>
                    <span class="time-cell">${formatTime(a.timestamp)}</span>
                </div>
                <div class="mobile-card-row">
                    <div>${renderVerdictBadge(a.verdict)}</div>
                    <div>${renderNeedBadge(a.need_category || a.need)}</div>
                </div>
                <div class="mobile-card-row" style="border-top:1px solid var(--border-subtle); padding-top:8px;">
                    <div>${renderEnergyDots(a.energy)}</div>
                    <span class="badge ${a.source === 'live' ? 'badge-live' : 'badge-simulated'}">${a.source}</span>
                </div>
                <div style="font-size:0.82rem; color:var(--text-secondary); background:rgba(0,0,0,0.2); padding:8px 10px; border-radius:6px; font-style:italic;">
                    "${escapeHtml(a.excuse || 'No reason provided')}"
                </div>
            </div>
        `).join('');
    }

    window.toggleExcuse = function(id) {
        const el = document.getElementById(id);
        if (el) {
            el.classList.toggle('open');
        }
    };

    function escapeHtml(text) {
        return text.replace(/[&<>"']/g, function(m) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[m];
        });
    }

    function bindFilterEvents() {
        ['filter-verdict', 'filter-site', 'filter-need', 'filter-energy'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', loadActivity);
        });

        let searchDebounce = null;
        document.getElementById('filter-search')?.addEventListener('input', () => {
            clearTimeout(searchDebounce);
            searchDebounce = setTimeout(loadActivity, 250);
        });

        document.getElementById('btn-reset-filters')?.addEventListener('click', () => {
            document.getElementById('filter-verdict').value = 'all';
            document.getElementById('filter-site').value = 'all';
            document.getElementById('filter-need').value = 'all';
            document.getElementById('filter-energy').value = 'all';
            document.getElementById('filter-search').value = '';
            loadActivity();
        });
    }

    // Connect to shared lifecycle
    window.onFocusForgeDataChanged = function() {
        loadActivity();
    };

    document.addEventListener('DOMContentLoaded', () => {
        bindFilterEvents();
        loadActivity();
    });

})();
