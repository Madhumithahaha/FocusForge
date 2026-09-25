// FocusForge - Experiment Controller
(function() {
    'use strict';

    // Persisted Check-in State
    function getCheckinState() {
        try {
            const raw = localStorage.getItem('focusforge_experiment_checkins');
            if (raw) return JSON.parse(raw);
        } catch (e) {}
        // Default state for prototype demo: Day 1 completed (better), Day 2 completed (better), Day 3 pending
        return {
            1: 'better',
            2: 'better',
            3: null
        };
    }

    function saveCheckinState(state) {
        localStorage.setItem('focusforge_experiment_checkins', JSON.stringify(state));
    }

    function updateExperimentPage(stats) {
        if (!stats) return;

        // 1. Current Pattern Card (Dynamic from Stats)
        const peakWindow = stats.peakWindow || '10 PM – 12 AM';
        const topNeed = stats.mostCommonNeed || 'Tired';
        const avgEnergy = stats.averageEnergy || 2.0;
        const topSite = stats.topSite || 'youtube.com';

        const topNeedObj = stats.attemptsByNeed ? stats.attemptsByNeed.find(n => n.label === topNeed) : null;
        const needPct = topNeedObj ? topNeedObj.percentage : 40;

        document.getElementById('exp-current-pattern').textContent = 
            `${peakWindow} surge + Low Energy (${avgEnergy}/5) + '${topNeed}' Trigger`;

        document.getElementById('exp-pattern-desc').textContent = 
            `Derived directly from your active analytics: ${topNeedObj ? topNeedObj.percentage : 42}% of distraction events occur during ${peakWindow} on ${topSite}, primarily fueled by '${topNeed}' rather than conscious utility.`;

        // 2. Testable Hypothesis Card
        document.getElementById('exp-hypothesis-title').textContent = 
            `Somatic Reset vs ${topSite} Escapism`;

        document.getElementById('exp-hypothesis-desc').textContent = 
            `If fatigue-driven ${topSite} visits during ${peakWindow} are intercepted with a calibrated somatic reset, repeat friction attempts will decrease by at least 35% without requiring willpower suppression.`;

        // 3. Action Card Tailored to Detected Need
        const needKey = (topNeed || '').toLowerCase();
        let actionTitle = "Full Glass of Cold Water + 3-Min Screen Blackout";
        let actionDesc = `When the prompt triggers during ${peakWindow}: Stand up, drink a full glass of cold water, and look away from all displays for 180 seconds to relax ciliary eye muscles.`;

        if (needKey === 'stressed') {
            actionTitle = "60-Second Physiological Sigh (Autonomic Reset)";
            actionDesc = "When tension peaks: Two quick nasal inhalations followed by one prolonged exhalation through the mouth. Repeat 5 times to downregulate sympathetic arousal.";
        } else if (needKey === 'bored') {
            actionTitle = "2-Minute Physical Movement / Walking Window";
            actionDesc = "Step away from the workstation immediately. Walk to a window, stretch your shoulders, and complete 10 gentle torso twists to restore dopamine receptors.";
        } else if (needKey === 'avoiding') {
            actionTitle = "Smallest First Step: 5-Minute Micro-Timer";
            actionDesc = "Open only the difficult task document. Commit to working for exactly 300 seconds with zero expectation of completion.";
        }

        document.getElementById('exp-action-title').textContent = actionTitle;
        document.getElementById('exp-action-desc').textContent = actionDesc;

        // 4. Key Measurement Metric
        const peakHourObj = stats.attemptsByHour.reduce((max, h) => h.count > max.count ? h : max, { count: 0 });
        const baselineVal = Math.max(1, peakHourObj.count * 2);

        document.getElementById('exp-metric-title').textContent = 
            `Attempts during ${peakWindow} Window`;

        document.getElementById('exp-baseline-val').textContent = 
            `${baselineVal} attempts`;

        document.getElementById('exp-metric-desc').innerHTML = 
            `Baseline: <strong id="exp-baseline-val">${baselineVal} attempts</strong> across current sample. Target: Under ${Math.ceil(baselineVal * 0.6)} attempts during 72-hour window.`;

        // 5. Update Comparison Numbers
        document.getElementById('comp-base-attempts').textContent = `${baselineVal} attempts`;
        document.getElementById('comp-base-energy').textContent = `${avgEnergy} / 5`;
        document.getElementById('comp-base-trigger').textContent = `${topNeed} (${needPct}%)`;
        document.getElementById('comp-base-lost').textContent = `~${baselineVal * 18} min est.`;

        const postAttempts = Math.max(0, Math.ceil(baselineVal * 0.52));
        const postPctChange = Math.round(((baselineVal - postAttempts) / baselineVal) * 100);
        document.getElementById('comp-post-attempts').textContent = `${postAttempts} attempts (-${postPctChange}%)`;
        document.getElementById('comp-post-energy').textContent = `${(avgEnergy + 1.1).toFixed(1)} / 5 (+1.1)`;
        document.getElementById('comp-post-reclaimed').textContent = `+${Math.round(baselineVal * 0.48 * 18)} min reclaimed`;

        // Render Check-in Buttons & Status
        renderCheckinUI();
    }

    function renderCheckinUI() {
        const state = getCheckinState();
        let completedCount = 0;
        let sentiments = [];

        [1, 2, 3].forEach(day => {
            const card = document.getElementById(`card-day-${day}`);
            const statusIcon = document.getElementById(`status-icon-${day}`);
            const btns = document.querySelectorAll(`.checkin-btn[data-day="${day}"]`);
            const val = state[day];

            btns.forEach(btn => {
                btn.className = 'checkin-btn';
                if (btn.dataset.val === val) {
                    btn.classList.add('selected');
                    if (val === 'better') btn.classList.add('better');
                    if (val === 'harder') btn.classList.add('harder');
                }
            });

            if (val) {
                completedCount++;
                sentiments.push(val);
                if (card) {
                    card.className = 'timeline-day-card completed';
                }
                if (statusIcon) statusIcon.textContent = '✓';
            } else {
                if (card) {
                    card.className = (day === completedCount + 1) ? 'timeline-day-card active-day' : 'timeline-day-card';
                }
                if (statusIcon) statusIcon.textContent = (day === completedCount + 1) ? '●' : '○';
            }
        });

        // Update Active Phase Badge
        const activeBadge = document.getElementById('experiment-active-badge');
        if (activeBadge) {
            if (completedCount === 3) {
                activeBadge.textContent = 'Phase: Review & Trajectory (Completed)';
                activeBadge.className = 'badge badge-allow';
            } else {
                activeBadge.textContent = `Phase: Measure (Day ${completedCount + 1} of 3)`;
                activeBadge.className = 'badge badge-live';
            }
        }

        // Comparison Banner & Note
        const compNote = document.getElementById('comparison-in-progress-note');
        const compBadge = document.getElementById('comparison-status-badge');
        const compSentiment = document.getElementById('comp-post-sentiment');

        if (compSentiment) {
            const betterCnt = sentiments.filter(s => s === 'better').length;
            const sameCnt = sentiments.filter(s => s === 'same').length;
            const harderCnt = sentiments.filter(s => s === 'harder').length;
            let sentParts = [];
            if (betterCnt > 0) sentParts.push(`${betterCnt} Better`);
            if (sameCnt > 0) sentParts.push(`${sameCnt} Same`);
            if (harderCnt > 0) sentParts.push(`${harderCnt} Harder`);
            compSentiment.textContent = sentParts.join(' · ') || 'In progress';
        }

        if (completedCount === 3) {
            if (compNote) compNote.style.display = 'none';
            if (compBadge) {
                compBadge.textContent = 'Experiment Completed · Review Active';
                compBadge.className = 'badge badge-allow';
            }
        } else {
            if (compNote) compNote.style.display = 'flex';
            if (compBadge) {
                compBadge.textContent = `Day ${completedCount + 1} Check-in Pending`;
                compBadge.className = 'badge badge-simulated';
            }
        }
    }

    function bindCheckinEvents() {
        const btns = document.querySelectorAll('.checkin-btn');
        btns.forEach(btn => {
            btn.addEventListener('click', () => {
                const day = btn.dataset.day;
                const val = btn.dataset.val;
                const state = getCheckinState();
                state[day] = val;
                saveCheckinState(state);
                renderCheckinUI();
                FocusForge.showToast(`Day ${day} check-in recorded: ${val.toUpperCase()}`, 'success');
            });
        });

        document.getElementById('btn-reset-checkins')?.addEventListener('click', () => {
            const resetState = { 1: null, 2: null, 3: null };
            saveCheckinState(resetState);
            renderCheckinUI();
            FocusForge.showToast('Check-ins reset for new experiment cycle', 'info');
        });
    }

    // Connect to shared lifecycle
    window.onFocusForgeDataChanged = function(stats) {
        updateExperimentPage(stats);
    };

    document.addEventListener('DOMContentLoaded', async () => {
        bindCheckinEvents();
        const stats = await FocusForge.loadStats();
        updateExperimentPage(stats);
    });

})();
