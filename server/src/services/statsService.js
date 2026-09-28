const fs = require('fs').promises;
const path = require('path');

const ATTEMPTS_FILE = path.join(__dirname, '../../data/attempts.json');

class StatsService {
  async getStats() {
    let attempts = [];
    try {
      const data = await fs.readFile(ATTEMPTS_FILE, 'utf8');
      if (data.trim()) {
        attempts = JSON.parse(data);
      }
    } catch (err) {
      if (err.code !== 'ENOENT') {
        console.error('StatsService: Error reading attempts.json', err);
      }
    }

    const totalAttempts = attempts.length;
    let denied = 0;
    let task = 0;
    let allowed = 0;
    let totalEnergy = 0;
    let estimatedMinutesReclaimed = 0;

    const hourCounts = new Array(24).fill(0);
    const needCounts = {};
    const energyCounts = {
      1: { count: 0, denied: 0, task: 0, allowed: 0 },
      2: { count: 0, denied: 0, task: 0, allowed: 0 },
      3: { count: 0, denied: 0, task: 0, allowed: 0 },
      4: { count: 0, denied: 0, task: 0, allowed: 0 },
      5: { count: 0, denied: 0, task: 0, allowed: 0 }
    };
    const siteCounts = {};

    attempts.forEach(a => {
      // Verdict counts
      if (a.verdict === 'deny') {
        denied++;
        estimatedMinutesReclaimed += 18;
      } else if (a.verdict === 'task') {
        task++;
        estimatedMinutesReclaimed += 12;
      } else if (a.verdict === 'allow') {
        allowed++;
      }

      // Energy
      const energy = Number(a.energy) || 3;
      totalEnergy += energy;
      if (energyCounts[energy] !== undefined) {
        energyCounts[energy].count++;
        if (a.verdict === 'deny') {
          energyCounts[energy].denied++;
        } else if (a.verdict === 'task') {
          energyCounts[energy].task++;
        } else if (a.verdict === 'allow') {
          energyCounts[energy].allowed++;
        }
      }

      // Hour
      if (a.timestamp) {
        const date = new Date(a.timestamp);
        if (!isNaN(date.getTime())) {
          hourCounts[date.getHours()]++;
        }
      }

      // Need
      const need = a.need || 'unknown';
      needCounts[need] = (needCounts[need] || 0) + 1;

      // Site
      const site = a.platform || 'unknown';
      siteCounts[site] = (siteCounts[site] || 0) + 1;
    });

    const averageEnergy = totalAttempts > 0 ? (totalEnergy / totalAttempts).toFixed(1) : "0.0";
    const denialRate = totalAttempts > 0 ? Math.round((denied / totalAttempts) * 100) : 0;
    const taskRate = totalAttempts > 0 ? Math.round((task / totalAttempts) * 100) : 0;
    const allowRate = totalAttempts > 0 ? Math.round((allowed / totalAttempts) * 100) : 0;

    // Attempts by Hour
    const attemptsByHour = hourCounts.map((count, hour) => {
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 === 0 ? 12 : hour % 12;
      return {
        hour,
        label: `${displayHour} ${ampm}`,
        count
      };
    });

    // Peak Window
    let peakHour = 0;
    let maxHourCount = -1;
    hourCounts.forEach((count, idx) => {
      if (count > maxHourCount) {
        maxHourCount = count;
        peakHour = idx;
      }
    });
    const peakAmPm = peakHour >= 12 ? 'PM' : 'AM';
    const peakDisplayHour = peakHour % 12 === 0 ? 12 : peakHour % 12;
    const peakWindow = totalAttempts > 0 ? `${peakDisplayHour} ${peakAmPm} - ${peakDisplayHour === 12 ? 1 : peakDisplayHour + 1} ${peakAmPm}` : 'N/A';

    // Need distribution
    let mostCommonNeed = 'None';
    let maxNeedCount = -1;
    const attemptsByNeed = Object.keys(needCounts).map(label => {
      const count = needCounts[label];
      if (count > maxNeedCount) {
        maxNeedCount = count;
        mostCommonNeed = label;
      }
      return {
        label,
        count,
        percentage: Math.round((count / totalAttempts) * 100)
      };
    }).sort((a, b) => b.count - a.count);

    // Energy distribution
    const attemptsByEnergy = Object.keys(energyCounts).map(energy => ({
      energy: Number(energy),
      count: energyCounts[energy].count,
      denied: energyCounts[energy].denied,
      task: energyCounts[energy].task,
      allowed: energyCounts[energy].allowed
    }));

    // Site distribution
    let topSite = 'None';
    let maxSiteCount = -1;
    const attemptsBySite = Object.keys(siteCounts).map(site => {
      const count = siteCounts[site];
      if (count > maxSiteCount) {
        maxSiteCount = count;
        topSite = site;
      }
      return {
        site,
        count,
        percentage: Math.round((count / totalAttempts) * 100)
      };
    }).sort((a, b) => b.count - a.count);

    return {
      totalAttempts,
      denied,
      task,
      allowed,
      estimatedMinutesReclaimed,
      peakWindow,
      mostCommonNeed,
      denialRate,
      taskRate,
      allowRate,
      averageEnergy,
      attemptsByHour,
      attemptsByNeed,
      attemptsByEnergy,
      attemptsBySite,
      topSite,
      isSmallSample: totalAttempts < 4
    };
  }
}

module.exports = new StatsService();
