// FocusForge - Overview Controller
(function() {
    'use strict';

    let hourlyChartInstance = null;
    let needChartInstance = null;
    let energyChartInstance = null;
    let waveAnimId = null;

    // Attention Wave Hero Canvas Animation
    function initHeroWave(peakHour = 22) {
        const canvas = document.getElementById('heroAttentionCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let step = 0;
        if (waveAnimId) cancelAnimationFrame(waveAnimId);

        function drawWave() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const w = canvas.width;
            const h = canvas.height;
            const mid = h / 2;

            // Draw baseline grid line
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.lineWidth = 1;
            ctx.moveTo(0, mid);
            ctx.lineTo(w, mid);
            ctx.stroke();

            // Wave 1: Attention fluctuation (Cyan)
            ctx.beginPath();
            ctx.strokeStyle = '#06B6D4';
            ctx.lineWidth = 2.5;
            ctx.shadowColor = 'rgba(6, 182, 212, 0.5)';
            ctx.shadowBlur = 10;

            for (let x = 0; x < w; x++) {
                const freq = 0.025;
                const amp = 24 * Math.sin((x / w) * Math.PI); // Crest in the middle
                const y = mid + amp * Math.sin(x * freq + step);
                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();

            // Wave 2: Energy resonance (Indigo/Violet)
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(129, 140, 248, 0.7)';
            ctx.lineWidth = 1.5;
            ctx.shadowBlur = 6;
            ctx.shadowColor = 'rgba(99, 102, 241, 0.4)';

            for (let x = 0; x < w; x++) {
                const freq2 = 0.035;
                const amp2 = 18 * Math.sin((x / w) * Math.PI);
                const y2 = mid + amp2 * Math.cos(x * freq2 - step * 0.8);
                if (x === 0) ctx.moveTo(x, y2);
                else ctx.lineTo(x, y2);
            }
            ctx.stroke();

            // Ambient glowing dot at peak
            const peakX = w * 0.7;
            const peakY = mid + 20 * Math.sin(peakX * 0.025 + step);
            ctx.beginPath();
            ctx.fillStyle = '#22D3EE';
            ctx.arc(peakX, peakY, 4, 0, Math.PI * 2);
            ctx.fill();

            step += 0.035;
            waveAnimId = requestAnimationFrame(drawWave);
        }

        drawWave();
    }

    function renderOverview(stats) {
        const emptyState = document.getElementById('empty-state-view');
        const analyticsView = document.getElementById('analytics-content-view');

        if (!stats || stats.totalAttempts === 0) {
            if (emptyState) emptyState.style.display = 'block';
            if (analyticsView) analyticsView.style.display = 'none';
            document.getElementById('hero-peak-window').textContent = 'No data';
            document.getElementById('hero-core-trigger').textContent = 'None';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';
        if (analyticsView) analyticsView.style.display = 'block';

        // 1. Hero Callouts
        document.getElementById('hero-peak-window').textContent = stats.peakWindow;
        document.getElementById('hero-core-trigger').textContent = stats.mostCommonNeed;
        const peakBadge = document.getElementById('peak-badge-callout');
        if (peakBadge) peakBadge.textContent = `Peak Window: ${stats.peakWindow}`;

        // 2. Animate Key Metrics
        FocusForge.animateValue(document.getElementById('val-total-attempts'), 0, stats.totalAttempts);
        FocusForge.animateValue(document.getElementById('val-denied'), 0, stats.denied);
        FocusForge.animateValue(document.getElementById('val-task'), 0, stats.task);
        FocusForge.animateValue(document.getElementById('val-allowed'), 0, stats.allowed);
        FocusForge.animateValue(document.getElementById('val-reclaimed'), 0, stats.estimatedMinutesReclaimed);

        document.getElementById('unit-denied').textContent = `(${stats.denialRate}%)`;
        document.getElementById('unit-task').textContent = `(${stats.taskRate}%)`;
        document.getElementById('unit-allowed').textContent = `(${stats.allowRate}%)`;
        document.getElementById('val-reclaimed-hrs').textContent = (stats.estimatedMinutesReclaimed / 60).toFixed(1);
        document.getElementById('val-avg-energy').textContent = stats.averageEnergy;

        // 3. Render Hourly Chart (Highlighting peak period)
        renderHourlyChart(stats.attemptsByHour, stats.peakWindow);

        // 4. Render Need Breakdown Chart
        renderNeedChart(stats.attemptsByNeed);

        // 5. Render Energy vs Attempts Chart
        renderEnergyChart(stats.attemptsByEnergy);

        // 6. Render Top Sites List
        renderTopSites(stats.attemptsBySite);
    }

    function renderHourlyChart(hourlyData, peakWindow) {
        const ctx = document.getElementById('hourlyChart');
        if (!ctx) return;

        const labels = hourlyData.map(d => d.label);
        const counts = hourlyData.map(d => d.count);

        // Find peak hours (top 2 highest consecutive counts or peak window)
        let maxCount = Math.max(...counts, 1);
        const backgroundColors = counts.map(c => {
            if (c >= maxCount * 0.75 && c > 0) {
                return '#06B6D4'; // Glowing Cyan for peak window
            }
            return 'rgba(99, 102, 241, 0.45)'; // Indigo for normal hours
        });

        const borderColors = counts.map(c => {
            if (c >= maxCount * 0.75 && c > 0) {
                return '#22D3EE';
            }
            return 'rgba(99, 102, 241, 0.8)';
        });

        if (hourlyChartInstance) {
            hourlyChartInstance.destroy();
        }

        hourlyChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Attempts',
                    data: counts,
                    backgroundColor: backgroundColors,
                    borderColor: borderColors,
                    borderWidth: 1.5,
                    borderRadius: 6,
                    hoverBackgroundColor: '#38BDF8'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#1E293B',
                        titleColor: '#F8FAFC',
                        bodyColor: '#94A3B8',
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderWidth: 1,
                        padding: 10,
                        callbacks: {
                            label: (context) => {
                                const d = hourlyData[context.dataIndex];
                                return [
                                    `Total: ${d.count} attempt(s)`,
                                    `⛔ Denied: ${d.denied}`,
                                    `🧘 Task: ${d.task}`,
                                    `✅ Allowed: ${d.allowed}`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: {
                            color: '#64748B',
                            font: { family: 'Plus Jakarta Sans', size: 10 },
                            maxRotation: 0,
                            callback: function(val, index) {
                                // Show every 3rd hour to prevent clutter
                                return index % 3 === 0 ? this.getLabelForValue(val) : '';
                            }
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: {
                            color: '#64748B',
                            font: { family: 'JetBrains Mono', size: 11 },
                            stepSize: 2
                        }
                    }
                }
            }
        });
    }

    function renderNeedChart(needs) {
        const ctx = document.getElementById('needChart');
        if (!ctx) return;

        const filtered = needs.filter(n => n.count > 0);
        const labels = (filtered.length > 0 ? filtered : needs).map(n => n.label);
        const data = (filtered.length > 0 ? filtered : needs).map(n => n.count);
        const colors = (filtered.length > 0 ? filtered : needs).map(n => n.color);

        if (needChartInstance) {
            needChartInstance.destroy();
        }

        needChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: colors,
                    borderColor: '#0E1524',
                    borderWidth: 3,
                    hoverOffset: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#1E293B',
                        titleColor: '#F8FAFC',
                        bodyColor: '#94A3B8',
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderWidth: 1,
                        padding: 10,
                        callbacks: {
                            label: (context) => ` ${context.label}: ${context.raw} attempts`
                        }
                    }
                }
            }
        });

        // Custom Legend
        const legendContainer = document.getElementById('needLegend');
        if (legendContainer) {
            legendContainer.innerHTML = (filtered.length > 0 ? filtered : needs).map(n => `
                <div class="legend-item">
                    <span class="legend-dot" style="background:${n.color};"></span>
                    <span>${n.label} (<strong>${n.percentage}%</strong>)</span>
                </div>
            `).join('');
        }
    }

    function renderEnergyChart(energyData) {
        const ctx = document.getElementById('energyChart');
        if (!ctx) return;

        const labels = energyData.map(e => `Energy ${e.energy}`);
        const deniedData = energyData.map(e => e.denied);
        const taskData = energyData.map(e => e.task);
        const allowedData = energyData.map(e => e.allowed);

        if (energyChartInstance) {
            energyChartInstance.destroy();
        }

        energyChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Denied',
                        data: deniedData,
                        backgroundColor: '#F43F5E',
                        borderRadius: 4
                    },
                    {
                        label: 'Wellness Task',
                        data: taskData,
                        backgroundColor: '#F59E0B',
                        borderRadius: 4
                    },
                    {
                        label: 'Allowed',
                        data: allowedData,
                        backgroundColor: '#10B981',
                        borderRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: '#94A3B8',
                            font: { family: 'Plus Jakarta Sans', size: 11 },
                            boxWidth: 10,
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        backgroundColor: '#1E293B',
                        padding: 10
                    }
                },
                scales: {
                    x: {
                        stacked: true,
                        grid: { display: false },
                        ticks: { color: '#94A3B8', font: { family: 'Plus Jakarta Sans' } }
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: '#64748B', font: { family: 'JetBrains Mono' } }
                    }
                }
            }
        });
    }

    function renderTopSites(sites) {
        const container = document.getElementById('sites-list-container');
        if (!container) return;

        if (!sites || sites.length === 0) {
            container.innerHTML = '<div style="color:var(--text-muted); font-size:0.85rem;">No sites recorded yet.</div>';
            return;
        }

        const top5 = sites.slice(0, 5);
        container.innerHTML = top5.map((s, idx) => `
            <div style="background:var(--bg-surface-elevated); padding:10px 14px; border-radius:var(--radius-md); border:1px solid var(--border-subtle);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="font-size:0.75rem; color:var(--text-muted); font-family:var(--font-mono); width:16px;">#${idx + 1}</span>
                        <strong style="font-size:0.9rem; color:#FFFFFF;">${s.site}</strong>
                    </div>
                    <div style="font-size:0.82rem; font-family:var(--font-mono); color:var(--accent-cyan);">
                        ${s.count} (${s.percentage}%)
                    </div>
                </div>
                <div style="height:4px; width:100%; background:rgba(255,255,255,0.06); border-radius:var(--radius-full); overflow:hidden;">
                    <div style="height:100%; width:${s.percentage}%; background:linear-gradient(to right, var(--accent-primary), var(--accent-cyan)); border-radius:var(--radius-full);"></div>
                </div>
            </div>
        `).join('');
    }

    // Connect to shared lifecycle
    window.onFocusForgeDataChanged = function(stats) {
        renderOverview(stats);
    };

    document.addEventListener('DOMContentLoaded', async () => {
        initHeroWave();
        const stats = await FocusForge.loadStats();
        renderOverview(stats);
    });

})();
