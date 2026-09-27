const fs = require('fs').promises;
const path = require('path');

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

  async recordAttempt(attemptData) {
    this.writeLock = this.writeLock.then(async () => {
      try {
        let attempts = [];
        try {
          const data = await fs.readFile(ATTEMPTS_FILE, 'utf8');
          if (data.trim()) {
            attempts = JSON.parse(data);
          }
        } catch (err) {
          if (err.code !== 'ENOENT') {
            console.error('AnalyticsService: Failed to parse attempts.json, starting fresh', err);
          }
        }

        const record = {
          timestamp: new Date().toISOString(),
          platform: attemptData.platform || 'unknown',
          energy: attemptData.energy,
          verdict: attemptData.verdict,
          need: attemptData.need,
          requestedMinutes: attemptData.requestedMinutes,
          resetSeconds: attemptData.resetSeconds,
          minutesGranted: attemptData.minutesGranted || 0,
          escalationLevel: attemptData.escalationLevel || 0
        };

        attempts.push(record);
        await fs.writeFile(ATTEMPTS_FILE, JSON.stringify(attempts, null, 2));
      } catch (err) {
        console.error('AnalyticsService: Failed to record attempt', err);
      }
    }).catch(err => console.error(err));
    return this.writeLock;
  }
  async clearData() {
    this.writeLock = this.writeLock.then(async () => {
      try {
        await fs.writeFile(ATTEMPTS_FILE, JSON.stringify([]));
      } catch (err) {
        console.error('AnalyticsService: Failed to clear attempts', err);
      }
    }).catch(err => console.error(err));
    return this.writeLock;
  }
}

const analyticsService = new AnalyticsService();
// Fire-and-forget init
analyticsService.init().catch(console.error);

module.exports = analyticsService;
