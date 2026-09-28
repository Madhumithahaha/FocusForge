const express = require('express');

const statsService = require('../services/statsService');
const analyticsService = require('../services/analyticsService');

const router = express.Router();

// GET /stats (mounted as both /stats and /api/stats)
// ?source=all|live|simulated — filters which records are aggregated.
router.get('/', async (req, res) => {
  try {
    const source = ['live', 'simulated'].includes(req.query.source) ? req.query.source : 'all';
    const stats = await statsService.getStats({ source });
    return res.json({
      success: true,
      message: 'Stats retrieved successfully',
      data: stats,
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve stats',
      data: null
    });
  }
});

// GET /stats/activity — individual attempt records for the Activity page
// table, newest first. Filters: source, verdict, site, need, energy, search.
// Field names in the response (site, need_category, minutes_granted) match
// what dashboard/activity.js already reads; the underlying stored records
// use platform/need/minutesGranted, so this route adapts between the two.
router.get('/activity', async (req, res) => {
  try {
    const { source, verdict, site, need, energy, search } = req.query;
    let attempts = await analyticsService.getAttempts();

    if (source === 'live' || source === 'simulated') {
      attempts = attempts.filter(a => a.source === source);
    }
    if (verdict && verdict !== 'all') {
      attempts = attempts.filter(a => a.verdict === verdict);
    }
    if (site && site !== 'all') {
      // Live records store the extension's short key ("youtube"), seeded
      // ones a hostname ("youtube.com"); the dropdown uses hostnames.
      const wanted = site.toLowerCase().replace(/\.com$/, '');
      attempts = attempts.filter(a => (a.platform || '').toLowerCase().replace(/\.com$/, '') === wanted);
    }
    if (need && need !== 'all') {
      attempts = attempts.filter(a => (a.need || '') === need);
    }
    if (energy && energy !== 'all') {
      const e = Number(energy);
      attempts = attempts.filter(a => Number(a.energy) === e);
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      attempts = attempts.filter(a =>
        (a.excuse || '').toLowerCase().includes(q) ||
        (a.platform || '').toLowerCase().includes(q)
      );
    }

    attempts = attempts
      .slice()
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .map(a => ({
        id: a.id,
        timestamp: a.timestamp,
        site: a.platform || 'unknown',
        energy: a.energy,
        need_category: a.need,
        verdict: a.verdict,
        minutes_granted: a.minutesGranted || 0,
        excuse: a.excuse || '',
        micro_task: a.microTask || null,
        source: a.source || 'live',
      }));

    return res.json({ success: true, attempts });
  } catch (error) {
    console.error('Error getting activity:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve activity.', attempts: [] });
  }
});

// Dashboard manual live test submission
router.post('/attempt', async (req, res) => {
  try {
    const data = req.body;
    await analyticsService.recordAttempt({
      platform: data.site || data.platform || 'unknown',
      energy: data.energy || 3,
      verdict: data.verdict || 'deny',
      need: data.need_category || data.need || 'unknown',
      excuse: data.excuse || data.reason || '',
      requestedMinutes: data.requestedMinutes || 0,
      resetSeconds: data.resetSeconds || 60,
      minutesGranted: data.minutes_granted || data.minutesGranted || 0,
      escalationLevel: data.escalationLevel || 0,
      timestamp: data.timestamp,
      source: 'live'
    });
    return res.json({ success: true, message: 'Attempt recorded manually.' });
  } catch (error) {
    console.error('Error recording manual attempt:', error);
    return res.status(500).json({ success: false, message: 'Failed to record attempt.' });
  }
});

// Dashboard clear data. ?type=live clears only live records (keeps
// simulated history); anything else clears everything.
router.delete('/attempts', async (req, res) => {
  try {
    await analyticsService.clearData(req.query.type);
    return res.json({ success: true, message: 'Data cleared successfully.' });
  } catch (error) {
    console.error('Error clearing data:', error);
    return res.status(500).json({ success: false, message: 'Failed to clear data.' });
  }
});

// Dashboard "Reseed 14-Day History" — regenerates simulated records only,
// leaving any real live records untouched.
router.post('/seed', async (req, res) => {
  try {
    await analyticsService.reseedSimulated();
    return res.json({ success: true, message: 'Simulated history reseeded.' });
  } catch (error) {
    console.error('Error reseeding data:', error);
    return res.status(500).json({ success: false, message: 'Failed to reseed data.' });
  }
});

module.exports = router;
