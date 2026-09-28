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

            attempts.push({
                id: `sim-${idCounter++}`,
                timestamp: dateObj.toISOString(),
                site,
                energy,
                need_category: need,
                excuse,
                excuse_strength: excuseStrength,
                verdict,
                minutes_granted: minutesGranted,
                estimated_reclaimed_minutes: estimatedReclaimed,
                micro_task: microTask,
                attemptCount: Math.floor(Math.random() * 3) + 1,
                source: 'simulated'
            });
        }
    }

    // Add 2 realistic live records for today so Live Only has initial demonstrable data
    const todayBase = new Date(now);
    todayBase.setHours(14, 25, 0, 0);
    attempts.push({
        id: `live-${idCounter++}`,
        timestamp: todayBase.toISOString(),
        site: 'youtube.com',
        energy: 2,
        need_category: 'tired',
        excuse: "Heavy afternoon crash, just wanted music.",
        excuse_strength: 2,
        verdict: 'task',
        minutes_granted: 5,
        estimated_reclaimed_minutes: 12,
        micro_task: {
            type: 'stretch',
            seconds: 60,
            title: '60-Second Physical Stretch'
        },
        attemptCount: 1,
        source: 'live'
    });

    const liveRecent = new Date(now - 45 * 60 * 1000); // 45 min ago
    attempts.push({
        id: `live-${idCounter++}`,
        timestamp: liveRecent.toISOString(),
        site: 'reddit.com',
        energy: 1,
        need_category: 'bored',
        excuse: "Waiting for build to finish, feeling lazy.",
        excuse_strength: 1,
        verdict: 'deny',
        minutes_granted: 0,
        estimated_reclaimed_minutes: 18,
        micro_task: null,
        attemptCount: 2,
        source: 'live'
    });

    // Sort chronologically ascending
    attempts.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    return attempts;
}

const data = generateBelievableAttempts();
fs.mkdirSync(path.dirname(dataPath), { recursive: true });
fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
console.log(`Generated ${data.length} believable seed attempts (${data.filter(d => d.source === 'simulated').length} simulated, ${data.filter(d => d.source === 'live').length} live) at ${dataPath}`);
