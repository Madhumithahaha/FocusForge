// FocusForge - Fingerprint Controller
(function() {
    'use strict';

    let currentStats = null;
    let selectedHighlight = 'peak';

    // SVG Drawing Elements
    const ridgesGroup = () => document.getElementById('fp-ridges-group');
    const filamentsGroup = () => document.getElementById('fp-filaments-group');
    const nodesGroup = () => document.getElementById('fp-nodes-group');
    const centerCore = () => document.getElementById('fp-center-core');

    function renderFingerprintVisual(stats) {
        const rGroup = ridgesGroup();
        const fGroup = filamentsGroup();
        const nGroup = nodesGroup();
        if (!rGroup || !fGroup || !nGroup) return;

        rGroup.innerHTML = '';
        fGroup.innerHTML = '';
        nGroup.innerHTML = '';

        const isSmallSample = stats.isSmallSample || stats.totalAttempts < 4;
        const total = Math.max(1, stats.totalAttempts);

        // Map need colors
        const topNeedObj = stats.attemptsByNeed && stats.attemptsByNeed[0];
        const primaryColor = topNeedObj ? topNeedObj.color : '#06B6D4';
        if (centerCore()) {
            centerCore().setAttribute('fill', primaryColor);
        }

        // Draw 9 Biometric Fingerprint Ridges (Concentric ellipses with biometric loops & gaps)
        const numRidges = 9;
        const baseRx = 20;
        const baseRy = 24;

        for (let i = 1; i <= numRidges; i++) {
            const rx = baseRx + i * 16;
            const ry = baseRy + i * 18;

            // Stroke weight and opacity based on data
            let strokeColor = 'rgba(99, 102, 241, 0.4)';
            let strokeWidth = 1.5;
            let strokeDash = isSmallSample ? '4 4' : 'none';

            // Energy level mapping for rings 2 to 6
            const energyIdx = Math.min(5, Math.max(1, Math.floor(i / 1.8)));
            const energyStat = stats.attemptsByEnergy.find(e => e.energy === energyIdx);
            if (energyStat && energyStat.percentage > 25) {
                strokeColor = 'rgba(6, 182, 212, 0.7)';
                strokeWidth = 2.2;
            }

            // Create elliptical arc with biometric opening (cut)
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            
            // Alternate openings like natural fingerprint whorls
            const startAngle = (i % 2 === 0 ? 0.3 : 3.4);
            const endAngle = startAngle + (Math.PI * 1.8);
            
            const x1 = rx * Math.cos(startAngle);
            const y1 = ry * Math.sin(startAngle);
            const x2 = rx * Math.cos(endAngle);
            const y2 = ry * Math.sin(endAngle);

            const d = `M ${x1} ${y1} A ${rx} ${ry} 0 1 1 ${x2} ${y2}`;
            path.setAttribute('d', d);
            path.setAttribute('fill', 'none');
            path.setAttribute('stroke', strokeColor);
            path.setAttribute('stroke-width', strokeWidth);
            path.setAttribute('stroke-linecap', 'round');
            path.setAttribute('stroke-dasharray', strokeDash);
            path.setAttribute('class', 'fp-ridge');
            path.dataset.ridgeIndex = i;

            // Interactive hover on ridge
            path.addEventListener('mouseenter', () => {
                showContextInsight(`Fingerprint Ridge Layer ${i}`, 
                    `Corresponds to Energy Level ${energyIdx} band. ${energyStat ? energyStat.percentage : 20}% of attention friction is concentrated around this threshold.`);
            });

            rGroup.appendChild(path);
        }

        // Draw 24 Radial Circadian Hour Filaments around the periphery
        const outerRadius = 175;
        const innerRadius = 160;

        stats.attemptsByHour.forEach(h => {
            const angle = (h.hour / 24) * Math.PI * 2 - Math.PI / 2;
            const x1 = Math.cos(angle) * innerRadius;
            const y1 = Math.sin(angle) * innerRadius;
            
            // Extend filament length according to attempt count
            const len = Math.min(22, 6 + h.count * 1.8);
            const x2 = Math.cos(angle) * (innerRadius + len);
            const y2 = Math.sin(angle) * (innerRadius + len);

            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', x1);
            line.setAttribute('y1', y1);
            line.setAttribute('x2', x2);
            line.setAttribute('y2', y2);
            line.setAttribute('stroke-linecap', 'round');

            // Highlight peak hours
            const isPeak = h.count >= Math.max(...stats.attemptsByHour.map(a => a.count)) * 0.75 && h.count > 0;
            if (isPeak) {
                line.setAttribute('stroke', '#22D3EE');
                line.setAttribute('stroke-width', 2.5);
                line.setAttribute('filter', 'url(#glow)');
            } else {
                line.setAttribute('stroke', 'rgba(255, 255, 255, 0.15)');
                line.setAttribute('stroke-width', 1.2);
            }

            line.addEventListener('mouseenter', () => {
                showContextInsight(`${h.label} Circadian Filament`, 
                    `${h.count} attempt(s) recorded at ${h.label}. Denied: ${h.denied}, Tasks: ${h.task}, Allowed: ${h.allowed}.`);
            });

            fGroup.appendChild(line);
        });

        // Interactive Key Data Nodes
        const nodes = [
            {
                id: 'peak-node',
                angle: 22 / 24 * Math.PI * 2 - Math.PI / 2, // 10 PM position
                radius: 120,
                color: '#22D3EE',
                title: `Peak Window (${stats.peakWindow})`,
                desc: `Distraction density crests during ${stats.peakWindow}, representing your primary daily friction window.`
            },
            {
                id: 'need-node',
                angle: 14 / 24 * Math.PI * 2 - Math.PI / 2, // 2 PM position
                radius: 90,
                color: primaryColor,
                title: `Dominant Driver: ${stats.mostCommonNeed}`,
                desc: `'${stats.mostCommonNeed}' accounts for ${topNeedObj ? topNeedObj.percentage : 40}% of your digital impulses, indicating physiological fatigue over conscious choice.`
            },
            {
                id: 'energy-node',
                angle: 2 / 24 * Math.PI * 2 - Math.PI / 2, // late night
                radius: 65,
                color: '#F59E0B',
                title: `Energy Baseline: ${stats.averageEnergy} / 5`,
                desc: `Low vitality (Energy 1–2) was reported in ${stats.attemptsByEnergy.filter(e => e.energy <= 2).reduce((sum, e) => sum + e.percentage, 0)}% of attempts.`
            },
            {
                id: 'denial-node',
                angle: 18 / 24 * Math.PI * 2 - Math.PI / 2, // 6 PM
                radius: 140,
                color: '#F43F5E',
                title: `Intervention Impact (${stats.denialRate}% Denied)`,
                desc: `The AI bouncer filtered ${stats.denied} low-legitimacy visits, preventing premature context-switching.`
            }
        ];

        nodes.forEach(n => {
            const cx = Math.cos(n.angle) * n.radius;
            const cy = Math.sin(n.angle) * n.radius;

            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', cx);
            circle.setAttribute('cy', cy);
            circle.setAttribute('r', 5);
            circle.setAttribute('fill', n.color);
            circle.setAttribute('stroke', '#FFFFFF');
            circle.setAttribute('stroke-width', 1.5);
            circle.setAttribute('class', 'fp-node');
            circle.setAttribute('filter', 'url(#glow)');

            circle.addEventListener('mouseenter', () => {
                showContextInsight(n.title, n.desc);
            });
            circle.addEventListener('click', () => {
                showContextInsight(n.title, n.desc);
            });

            nGroup.appendChild(circle);
        });
    }

    function showContextInsight(title, desc) {
        const titleEl = document.getElementById('ctx-title');
        const bodyEl = document.getElementById('ctx-body');
        if (titleEl) titleEl.textContent = title;
        if (bodyEl) bodyEl.textContent = desc;
    }

    function updateFingerprintStats(stats) {
        currentStats = stats;
        const isLive = FocusForgeState.source === 'live';
        const isSmallSample = stats.isSmallSample || stats.totalAttempts < 4;

        // Early Sample Banner Handling
        const earlyCallout = document.getElementById('early-sample-callout');
        const earlyText = document.getElementById('early-sample-text');
        if (earlyCallout) {
            if (isSmallSample) {
                earlyCallout.style.display = 'flex';
                if (earlyText) {
                    earlyText.textContent = `Only ${stats.totalAttempts} attempt(s) recorded so far. Initial signals point toward activity around ${stats.peakWindow} with average energy of ${stats.averageEnergy}/5. Keep using FocusForge to construct a reliable pattern.`;
                }
            } else {
                earlyCallout.style.display = 'none';
            }
        }

        // Status Tag
        const statusTag = document.getElementById('fingerprint-status-tag');
        if (statusTag) {
            statusTag.textContent = isLive 
                ? `Live Verified Records (${stats.liveCount} events)`
                : `14-Day Resonant Pattern (${stats.totalAttempts} events)`;
        }

        // 1. Peak Window
        document.getElementById('fp-peak-window').textContent = stats.peakWindow;
        const peakHourObj = stats.attemptsByHour.reduce((max, h) => h.count > max.count ? h : max, { count: 0 });
        const peakPct = stats.totalAttempts > 0 ? Math.round((peakHourObj.count / stats.totalAttempts) * 100) : 0;
        document.getElementById('fp-peak-desc').textContent = `${peakPct}% of attempts occur during peak window`;

        // 2. Common Need
        document.getElementById('fp-common-need').textContent = stats.mostCommonNeed;
        const topNeedObj = stats.attemptsByNeed && stats.attemptsByNeed[0];
        document.getElementById('fp-need-desc').textContent = topNeedObj 
            ? `${topNeedObj.percentage}% of attempts triggered by '${topNeedObj.label}'`
            : 'No primary trigger identified yet';

        // 3. Average Energy
        document.getElementById('fp-avg-energy').textContent = `${stats.averageEnergy} / 5`;
        const lowEnergyPct = stats.attemptsByEnergy.filter(e => e.energy <= 2).reduce((sum, e) => sum + e.percentage, 0);
        document.getElementById('fp-energy-desc').textContent = `${lowEnergyPct}% of attempts occur at Energy 1–2`;

        // 4. Top Site
        document.getElementById('fp-top-site').textContent = stats.topSite;
        const topSiteObj = stats.attemptsBySite && stats.attemptsBySite[0];
        document.getElementById('fp-site-desc').textContent = topSiteObj
            ? `${topSiteObj.percentage}% of all distraction attempts`
            : 'No site data yet';

        // 5. Denial Rate
        document.getElementById('fp-denial-rate').textContent = `${stats.denialRate}%`;
        document.getElementById('fp-denial-desc').textContent = `${stats.denied} attempts blocked due to fatigue/procrastination`;

        // 6. Est. Reclaimed
        document.getElementById('fp-est-reclaimed').textContent = `${stats.estimatedMinutesReclaimed} min`;
        const hrs = (stats.estimatedMinutesReclaimed / 60).toFixed(1);
        document.getElementById('fp-reclaimed-desc').textContent = `≈ ${hrs} hours preserved from doomscrolling`;

        // Render Biometric SVG
        renderFingerprintVisual(stats);

        // Bind interactive stat cards
        bindStatCardInteractions(stats);

        // Load AI Narrative
        loadNarrative(stats);
    }

    function bindStatCardInteractions(stats) {
        const cards = document.querySelectorAll('.fingerprint-stat-card');
        cards.forEach(card => {
            card.onclick = () => {
                cards.forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                const type = card.dataset.highlight;

                if (type === 'peak') {
                    showContextInsight(`Peak Window: ${stats.peakWindow}`, 
                        `Circadian clustering shows that your cognitive friction peaks sharply between ${stats.peakWindow}. Interventions scheduled before this period are 3x more effective.`);
                } else if (type === 'need') {
                    showContextInsight(`Dominant Trigger: ${stats.mostCommonNeed}`, 
                        `The predominant emotional state driving website requests is '${stats.mostCommonNeed}'. FocusForge redirects this unmet need into physical recovery rather than digital escapism.`);
                } else if (type === 'energy') {
                    showContextInsight(`Vitality Baseline: ${stats.averageEnergy}/5`, 
                        `Most distractions occur when energy is depleted, confirming that mindless browsing is a symptom of exhaustion, not a lack of willpower.`);
                } else if (type === 'site') {
                    showContextInsight(`Primary Gateway: ${stats.topSite}`, 
                        `${stats.topSite} represents your most habitual default reflex when cognitive friction arises.`);
                } else if (type === 'denial') {
                    showContextInsight(`Denial Rate: ${stats.denialRate}%`, 
                        `${stats.denialRate}% of visits lacked justifiable focus goals and were mindfully deflected.`);
                } else if (type === 'reclaimed') {
                    showContextInsight(`Bandwidth Preserved: ${stats.estimatedMinutesReclaimed} min`, 
                        `Estimated minutes rescued from passive video or feed scrolling sessions.`);
                }
            };
        });
    }

    async function loadNarrative(stats) {
        const textBox = document.getElementById('narrative-text-box');
        const expTitle = document.getElementById('exp-preview-title');
        const expAction = document.getElementById('exp-preview-action');
        if (!textBox) return;

        textBox.innerHTML = `<span class="skeleton" style="display:block; height:60px;"></span>`;

        try {
            const data = await FocusForge.loadInsight(stats);
            if (data && data.fingerprint) {
                textBox.textContent = data.fingerprint;
                if (data.experiment) {
                    if (expTitle) expTitle.textContent = data.experiment.observation || "Behavioral Reset";
                    if (expAction) expAction.textContent = data.experiment.action || "Take a physical pause.";
                }
            } else {
                throw new Error('Malformed insight response');
            }
        } catch (e) {
            // High-quality local deterministic fallback
            const topSitePct = stats.attemptsBySite[0] ? stats.attemptsBySite[0].percentage : 35;
            textBox.textContent = `Your attention pattern reveals a strong circadian friction window between ${stats.peakWindow}, with ${stats.topSite} acting as your primary diversion doorway (${topSitePct}% of attempts). Significantly, ${stats.denialRate}% of visits were intercepted because attempts coincided with depleted energy (averaging ${stats.averageEnergy} out of 5) sparked by a detected need for '${stats.mostCommonNeed}' rather than legitimate intent. FocusForge has preserved an estimated ${stats.estimatedMinutesReclaimed} minutes of cognitive bandwidth by breaking this recurring fatigue reflex.`;
        }
    }

    // Connect to shared lifecycle
    window.onFocusForgeDataChanged = function(stats) {
        updateFingerprintStats(stats);
    };

    document.addEventListener('DOMContentLoaded', async () => {
        const stats = await FocusForge.loadStats();
        updateFingerprintStats(stats);

        document.getElementById('btn-refresh-narrative')?.addEventListener('click', () => {
            if (currentStats) loadNarrative(currentStats);
        });
    });

})();
