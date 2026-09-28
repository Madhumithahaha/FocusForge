const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../server/data/attempts.json');

function generateBelievableAttempts() {
    const attempts = [];
    const now = Date.now();
    const DAY_MS = 24 * 60 * 60 * 1000;

    const sites = [
        { domain: 'youtube.com', weight: 40 },
        { domain: 'reddit.com', weight: 25 },
        { domain: 'x.com', weight: 18 },
        { domain: 'instagram.com', weight: 10 },
        { domain: 'netflix.com', weight: 7 }
    ];

    const excusesByNeed = {
        tired: [
            "My brain is completely fried after coding for 4 hours.",
            "Too exhausted to think, just want to watch one quick video.",
            "Drained from meetings, needing a mindless scroll.",
            "Energy is zero, can't focus on this documentation."
        ],
        bored: [
            "Waiting for tests to finish running, killing time.",
            "Bored of writing boilerplate code.",
            "Need a quick stimulation hit before the next task.",
            "Just checking my feed for 2 minutes."
        ],
        stressed: [
            "Panicking about tomorrow's deadline, need an escape.",
            "Too much cognitive overload right now.",
            "Stuck on an impossible bug, feeling anxious.",
            "Overwhelmed with tasks, need a mental reset."
        ],
        avoiding: [
            "Procrastinating on writing the final report.",
            "Dreading cleaning up the messy legacy code.",
            "Putting off sending that difficult email.",
            "Avoiding starting this hard feature."
        ],
        genuine: [
            "Looking for an official tutorial on Web Audio API.",
            "Need to review the conference talk on system architecture.",
            "Checking open-source bug report mentioned in our repo.",
            "Verifying UX design pattern examples."
        ],
        lonely: [
            "Working alone all day, just wanted some community connection.",
            "Checking team chat and developer discussions."
        ],
        other: [
            "Checking if internet connection is working.",
            "Looking up a quick shortcut."
        ]
    };

    function pickWeighted(items) {
        const total = items.reduce((sum, item) => sum + item.weight, 0);
        let rand = Math.random() * total;
        for (const item of items) {
            if (rand < item.weight) return item.domain;
            rand -= item.weight;
        }
        return items[0].domain;
    }

    let idCounter = 1;

    // Generate ~50 simulated records spanning the past 14 days
    for (let day = 13; day >= 1; day--) {
        const dayBase = now - day * DAY_MS;
        // 3 to 5 attempts per day
        const attemptsToday = 3 + Math.floor(Math.random() * 3);

        for (let i = 0; i < attemptsToday; i++) {
            // Cluster around 10 PM - 12 AM (late night) or 2 PM - 4 PM (afternoon lull)
            const isLateNight = Math.random() < 0.55;
            const isAfternoon = !isLateNight && Math.random() < 0.65;
            
            let hour;
            if (isLateNight) {
                hour = Math.random() < 0.7 ? 22 : 23; // 10 PM or 11 PM
            } else if (isAfternoon) {
                hour = 14 + Math.floor(Math.random() * 3); // 2 PM - 4 PM
            } else {
                hour = 9 + Math.floor(Math.random() * 12); // other daytime hour
            }

            const minute = Math.floor(Math.random() * 60);
            const second = Math.floor(Math.random() * 60);
            const dateObj = new Date(dayBase);
            dateObj.setHours(hour, minute, second, 0);

            const site = pickWeighted(sites);

            // Determine need and energy based on time of day
            let need;
            let energy;
            if (isLateNight) {
                energy = Math.random() < 0.75 ? (Math.random() < 0.5 ? 1 : 2) : 3;
                need = Math.random() < 0.6 ? 'tired' : (Math.random() < 0.5 ? 'bored' : 'avoiding');
            } else if (isAfternoon) {
                energy = Math.random() < 0.6 ? 2 : (Math.random() < 0.6 ? 3 : 1);
                need = Math.random() < 0.4 ? 'bored' : (Math.random() < 0.5 ? 'stressed' : 'avoiding');
            } else {
                energy = 2 + Math.floor(Math.random() * 4); // 2 to 5
                need = Math.random() < 0.35 ? 'genuine' : (Math.random() < 0.4 ? 'stressed' : 'tired');
            }

            // Determine verdict based on energy, need, and legitimacy
            let verdict;
            let minutesGranted = 0;
            let microTask = null;
            let excuseStrength;
            let estimatedReclaimed = 0;

            if (need === 'genuine' && energy >= 3) {
                verdict = 'allow';
                minutesGranted = 15;
                excuseStrength = 4 + Math.floor(Math.random() * 2);
                estimatedReclaimed = 0;
            } else if (need === 'stressed' || (energy === 2 && Math.random() < 0.4)) {
                verdict = 'task';
                minutesGranted = 5;
                excuseStrength = 2 + Math.floor(Math.random() * 2);
                estimatedReclaimed = 12;
                microTask = {
                    type: Math.random() < 0.5 ? 'breathing' : 'stretch',
                    seconds: 60,
                    title: Math.random() < 0.5 ? '60-Second Physiological Sigh' : '2-Minute Neck & Shoulder Release'
                };
            } else {
                verdict = 'deny';
                minutesGranted = 0;
                excuseStrength = 1 + Math.floor(Math.random() * 2);
                estimatedReclaimed = 18;
            }

            const excuseList = excusesByNeed[need] || excusesByNeed.other;
            const excuse = excuseList[Math.floor(Math.random() * excuseList.length)];

            // Field names match the live schema written by analyticsService.recordAttempt()
            // (server/src/services/analyticsService.js) so simulated and live records are
            // read identically by statsService / the Activity API.
            attempts.push({
                id: `sim-${idCounter++}`,
                timestamp: dateObj.toISOString(),
                platform: site,
                energy,
                need,
                excuse,
                excuseStrength,
                verdict,
                requestedMinutes: minutesGranted || undefined,
                resetSeconds: verdict === 'allow' ? 0 : 60,
                minutesGranted,
                estimatedReclaimedMinutes: estimatedReclaimed,
                microTask,
                escalationLevel: 0,
                source: 'simulated'
            });
        }
    }

    // Sort chronologically ascending
    attempts.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    return attempts;
}

// Exported so the server can regenerate simulated history on demand
// (see AnalyticsService.reseedSimulated(), used by POST /api/stats/seed)
// without shelling out to this script. Real 'live' records are never
// touched here — only ever written by /judge or the dashboard's manual
// "Record Live Attempt" modal.
module.exports = { generateBelievableAttempts };

// Standalone CLI usage: `node scripts/generate-seed-data.js` writes
// server/data/attempts.json directly, replacing ALL existing data
// (including any live records) with a fresh simulated batch.
if (require.main === module) {
    const data = generateBelievableAttempts();
    fs.mkdirSync(path.dirname(dataPath), { recursive: true });
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`Generated ${data.length} believable simulated seed attempts at ${dataPath}`);
}
