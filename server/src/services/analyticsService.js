const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '../../data');
const ATTEMPTS_FILE = path.join(DATA_DIR, 'attempts.json');

class AnalyticsService {
  constructor() {
    this.writeLock = Promise.resolve();
  }

  async init() {
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      try {
        await fs.access(ATTEMPTS_FILE);
      } catch {
        await fs.writeFile(ATTEMPTS_FILE, JSON.stringify([]));
      }
    } catch (err) {
      console.error('AnalyticsService: Failed to initialize data directory or file', err);
    }
  }

  async _readAll() {
    try {
      const data = await fs.readFile(ATTEMPTS_FILE, 'utf8');
      if (data.trim()) return JSON.parse(data);
    } catch (err) {
      if (err.code !== 'ENOENT') {
        console.error('AnalyticsService: Failed to parse attempts.json, starting fresh', err);
      }
    }
    return [];
  }

  // Read-only helper for routes/services that just need the current data
  // (e.g. stats). Not part of the write queue since it doesn't mutate.
  async getAttempts() {
    return this._readAll();
  }

  async recordAttempt(attemptData) {
    this.writeLock = this.writeLock.then(async () => {
      try {
        const attempts = await this._readAll();

        const record = {
          id: attemptData.id || crypto.randomUUID(),
          timestamp: attemptData.timestamp || new Date().toISOString(),
          platform: attemptData.platform || 'unknown',
          energy: attemptData.energy,
          verdict: attemptData.verdict,
          need: attemptData.need,
          excuse: attemptData.excuse || '',
          requestedMinutes: attemptData.requestedMinutes,
          resetSeconds: attemptData.resetSeconds,
          minutesGranted: attemptData.minutesGranted || 0,
          escalationLevel: attemptData.escalationLevel || 0,
          // 'live' = real judged/recorded attempt (from /judge or the dashboard's
          // manual "Record Live Attempt" modal); 'simulated' = seed/demo data.
          source: attemptData.source === 'simulated' ? 'simulated' : 'live',
        };

        attempts.push(record);
        await fs.writeFile(ATTEMPTS_FILE, JSON.stringify(attempts, null, 2));
      } catch (err) {
        console.error('AnalyticsService: Failed to record attempt', err);
      }
    }).catch(err => console.error(err));
    return this.writeLock;
  }

  // type: 'live' clears only live records (keeps simulated history intact);
  // anything else ('all', undefined, ...) clears everything.
  async clearData(type) {
    this.writeLock = this.writeLock.then(async () => {
      try {
        if (type === 'live') {
          const attempts = await this._readAll();
          const kept = attempts.filter((a) => a.source === 'simulated');
          await fs.writeFile(ATTEMPTS_FILE, JSON.stringify(kept, null, 2));
        } else {
          await fs.writeFile(ATTEMPTS_FILE, JSON.stringify([]));
        }
      } catch (err) {
        console.error('AnalyticsService: Failed to clear attempts', err);
      }
    }).catch(err => console.error(err));
    return this.writeLock;
  }

  // Replace all 'simulated' records with a freshly generated batch, leaving
  // 'live' records untouched. Used by the dashboard's "Reseed 14-Day
  // History" button.
  async reseedSimulated() {
    this.writeLock = this.writeLock.then(async () => {
      try {
        const { generateBelievableAttempts } = require('../../../scripts/generate-seed-data');
        const attempts = await this._readAll();
        const live = attempts.filter((a) => a.source === 'live');
        const simulated = generateBelievableAttempts();
        await fs.writeFile(ATTEMPTS_FILE, JSON.stringify([...simulated, ...live], null, 2));
      } catch (err) {
        console.error('AnalyticsService: Failed to reseed simulated data', err);
      }
    }).catch(err => console.error(err));
    return this.writeLock;
  }
}

const analyticsService = new AnalyticsService();
// Fire-and-forget init
analyticsService.init().catch(console.error);

module.exports = analyticsService;
