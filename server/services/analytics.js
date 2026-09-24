const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../data/attempts.json');

const NEED_CONFIG = [
    { key: 'tired', label: 'Tired', color: '#F59E0B' },
    { key: 'bored', label: 'Bored', color: '#3B82F6' },
    { key: 'stressed', label: 'Stressed', color: '#EC4899' },
    { key: 'lonely', label: 'Lonely', color: '#8B5CF6' },
    { key: 'avoiding', label: 'Avoiding', color: '#EF4444' },
    { key: 'genuine', label: 'Genuine', color: '#10B981' },
    { key: 'other', label: 'Other', color: '#6B7280' }
];

function readAttempts() {
    try {
        if (!fs.existsSync(dataPath)) {
            fs.mkdirSync(path.dirname(dataPath), { recursive: true });
            fs.writeFileSync(dataPath, '[]', 'utf-8');
            return [];
        }
        const raw = fs.readFileSync(dataPath, 'utf-8');
        return JSON.parse(raw);
    } catch (err) {
        console.error('Error reading attempts.json:', err);
        return [];
    }
}

function writeAttempts(data) {
    try {
        fs.mkdirSync(path.dirname(dataPath), { recursive: true });
        fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
        return true;
    } catch (err) {
        console.error('Error writing attempts.json:', err);
        return false;
    }
}

function formatHourLabel(h) {
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12} ${ampm}`;
}

function getStats(source = 'all') {
    const allAttempts = readAttempts();
    const liveCount = allAttempts.filter(a => a.source === 'live').length;
    const simulatedCount = allAttempts.filter(a => a.source === 'simulated').length;

    // Filter by source
    const filtered = allAttempts.filter(a => {
        if (source === 'live') return a.source === 'live';
        return true; // 'all' returns both live and simulated
    });

    const totalAttempts = filtered.length;

    if (totalAttempts === 0) {
        return {
            totalAttempts: 0,
            denied: 0,
            task: 0,
            allowed: 0,
            denialRate: 0,
            taskRate: 0,
            allowRate: 0,
            estimatedMinutesReclaimed: 0,
            attemptsByHour: Array.from({ length: 24 }, (_, i) => ({
                hour: i,
                label: formatHourLabel(i),
                count: 0,
                denied: 0,
                task: 0,
                allowed: 0
            })),
            attemptsByWeekday: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label, day) => ({
                day,
                label,
                count: 0
            })),
            attemptsBySite: [],
            attemptsByNeed: NEED_CONFIG.map(n => ({
                need: n.key,
                label: n.label,
                count: 0,
                percentage: 0,
                color: n.color
            })),
            attemptsByEnergy: [1, 2, 3, 4, 5].map(energy => ({
                energy,
                count: 0,
                percentage: 0,
                denied: 0,
                task: 0,
                allowed: 0
            })),
            averageEnergy: 0,
            averageExcuseStrength: 0,
            peakWindow: 'No data recorded',
            mostCommonNeed: 'None',
            topSite: 'None',
            liveCount,
            simulatedCount,
            sourceFilter: source,
            isSmallSample: true
        };
    }

    let denied = 0;
    let task = 0;
    let allowed = 0;
    let totalMinutesReclaimed = 0;
    let sumEnergy = 0;
    let sumExcuseStrength = 0;

    const hourMap = Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        label: formatHourLabel(i),
        count: 0,
        denied: 0,
        task: 0,
        allowed: 0
    }));

    const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weekdayMap = weekdayNames.map((label, day) => ({
        day,
        label,
        count: 0
    }));

    const siteCounts = {};
    const needCounts = {};
    NEED_CONFIG.forEach(n => { needCounts[n.key] = 0; });

    const energyMap = [1, 2, 3, 4, 5].reduce((acc, lvl) => {
        acc[lvl] = { energy: lvl, count: 0, percentage: 0, denied: 0, task: 0, allowed: 0 };
        return acc;
    }, {});

    filtered.forEach(item => {
        const v = (item.verdict || 'deny').toLowerCase();
        if (v === 'deny') denied++;
        else if (v === 'task') task++;
        else if (v === 'allow') allowed++;

        // Reclaimed minutes
        let reclaimed = item.estimated_reclaimed_minutes;
        if (typeof reclaimed !== 'number') {
            if (v === 'deny') reclaimed = 18;
            else if (v === 'task') reclaimed = 12;
            else reclaimed = 0;
        }
        totalMinutesReclaimed += reclaimed;

        // Energy & excuse strength
        const energy = Math.max(1, Math.min(5, Number(item.energy) || 2));
        sumEnergy += energy;

        const excuseStr = Math.max(1, Math.min(5, Number(item.excuse_strength) || 2));
        sumExcuseStrength += excuseStr;

        // Energy breakdown
        if (energyMap[energy]) {
            energyMap[energy].count++;
            if (v === 'deny') energyMap[energy].denied++;
            else if (v === 'task') energyMap[energy].task++;
            else if (v === 'allow') energyMap[energy].allowed++;
        }

        // Timestamp parsing
        const date = new Date(item.timestamp);
        if (!isNaN(date.getTime())) {
            const h = date.getHours();
            if (hourMap[h]) {
                hourMap[h].count++;
                if (v === 'deny') hourMap[h].denied++;
                else if (v === 'task') hourMap[h].task++;
                else if (v === 'allow') hourMap[h].allowed++;
            }

            const day = date.getDay();
            if (weekdayMap[day]) {
                weekdayMap[day].count++;
            }
        }

        // Site
        const site = (item.site || 'other').toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
        if (!siteCounts[site]) {
            siteCounts[site] = { site, count: 0, denied: 0, task: 0, allowed: 0 };
        }
        siteCounts[site].count++;
        if (v === 'deny') siteCounts[site].denied++;
        else if (v === 'task') siteCounts[site].task++;
        else if (v === 'allow') siteCounts[site].allowed++;

        // Need
        const rawNeed = (item.need_category || item.need || 'other').toLowerCase();
        const matchedNeed = NEED_CONFIG.find(n => n.key === rawNeed) ? rawNeed : 'other';
        needCounts[matchedNeed] = (needCounts[matchedNeed] || 0) + 1;
    });

    const denialRate = Math.round((denied / totalAttempts) * 100);
    const taskRate = Math.round((task / totalAttempts) * 100);
    const allowRate = Math.round((allowed / totalAttempts) * 100);
    const averageEnergy = Number((sumEnergy / totalAttempts).toFixed(1));
    const averageExcuseStrength = Number((sumExcuseStrength / totalAttempts).toFixed(1));

    // Sites sorted desc
    const attemptsBySite = Object.values(siteCounts)
        .sort((a, b) => b.count - a.count)
        .map(s => ({
            ...s,
            percentage: Math.round((s.count / totalAttempts) * 100)
        }));

    // Needs with percentages
    const attemptsByNeed = NEED_CONFIG.map(n => ({
        need: n.key,
        label: n.label,
        count: needCounts[n.key] || 0,
        percentage: Math.round(((needCounts[n.key] || 0) / totalAttempts) * 100),
        color: n.color
    })).sort((a, b) => b.count - a.count);

    // Energy array with percentages
    const attemptsByEnergy = Object.values(energyMap).map(e => ({
        ...e,
        percentage: Math.round((e.count / totalAttempts) * 100)
    }));

    // Calculate Peak Window: best 2-hour window or single peak
    let bestWindowStart = 22;
    let maxWindowCount = -1;
    for (let h = 0; h < 24; h++) {
        const nextH = (h + 1) % 24;
        const windowCount = hourMap[h].count + hourMap[nextH].count;
        if (windowCount > maxWindowCount) {
            maxWindowCount = windowCount;
            bestWindowStart = h;
        }
    }
    const windowEnd = (bestWindowStart + 2) % 24;
    const peakWindow = `${formatHourLabel(bestWindowStart)} – ${formatHourLabel(windowEnd)}`;

    const topNeedObj = attemptsByNeed[0];
    const mostCommonNeed = (topNeedObj && topNeedObj.count > 0) ? topNeedObj.label : 'None';
    const topSite = (attemptsBySite[0] && attemptsBySite[0].count > 0) ? attemptsBySite[0].site : 'None';

    return {
        totalAttempts,
        denied,
        task,
        allowed,
        denialRate,
        taskRate,
        allowRate,
        estimatedMinutesReclaimed: totalMinutesReclaimed,
        attemptsByHour: hourMap,
        attemptsByWeekday: weekdayMap,
        attemptsBySite,
        attemptsByNeed,
        attemptsByEnergy,
        averageEnergy,
        averageExcuseStrength,
        peakWindow,
        mostCommonNeed,
        topSite,
        liveCount,
        simulatedCount,
        sourceFilter: source,
        isSmallSample: totalAttempts < 4
    };
}

function getAttempts(filters = {}) {
    let list = readAttempts();
    
    // Sort descending by timestamp (newest first)
    list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    if (filters.source && filters.source !== 'all') {
        list = list.filter(a => a.source === filters.source);
    }
    if (filters.verdict && filters.verdict !== 'all') {
        list = list.filter(a => (a.verdict || '').toLowerCase() === filters.verdict.toLowerCase());
    }
    if (filters.site && filters.site !== 'all') {
        list = list.filter(a => (a.site || '').toLowerCase().includes(filters.site.toLowerCase()));
    }
    if (filters.need && filters.need !== 'all') {
        list = list.filter(a => (a.need_category || a.need || '').toLowerCase() === filters.need.toLowerCase());
    }
    if (filters.energy && filters.energy !== 'all') {
        list = list.filter(a => String(a.energy) === String(filters.energy));
    }
    if (filters.search) {
        const q = filters.search.toLowerCase();
        list = list.filter(a => 
            (a.site && a.site.toLowerCase().includes(q)) ||
            (a.excuse && a.excuse.toLowerCase().includes(q)) ||
            (a.need_category && a.need_category.toLowerCase().includes(q))
        );
    }

    return list;
}

function addAttempt(data) {
    const list = readAttempts();
    const newAttempt = {
        id: data.id || `live-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: data.timestamp || new Date().toISOString(),
        site: (data.site || 'unknown.com').toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, ''),
        energy: Math.max(1, Math.min(5, Number(data.energy) || 2)),
        need_category: (data.need_category || data.need || 'tired').toLowerCase(),
        excuse: data.excuse || 'Taking a quick break',
        excuse_strength: Number(data.excuse_strength) || 2,
        verdict: (data.verdict || 'deny').toLowerCase(),
        minutes_granted: Number(data.minutes_granted) || 0,
        estimated_reclaimed_minutes: typeof data.estimated_reclaimed_minutes === 'number'
            ? data.estimated_reclaimed_minutes
            : ((data.verdict === 'deny') ? 18 : (data.verdict === 'task' ? 12 : 0)),
        micro_task: data.micro_task || null,
        attemptCount: Number(data.attemptCount) || 1,
        source: data.source || 'live'
    };

    list.push(newAttempt);
    writeAttempts(list);
    return newAttempt;
}

function clearAttempts(type = 'all') {
    if (type === 'live') {
        const list = readAttempts().filter(a => a.source !== 'live');
        writeAttempts(list);
        return { cleared: 'live', remaining: list.length };
    } else {
        writeAttempts([]);
        return { cleared: 'all', remaining: 0 };
    }
}

module.exports = {
    getStats,
    getAttempts,
    addAttempt,
    clearAttempts,
    readAttempts,
    writeAttempts
};
