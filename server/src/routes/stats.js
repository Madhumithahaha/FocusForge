const express = require('express');

const statsService = require('../services/statsService');
const analyticsService = require('../services/analyticsService');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const stats = await statsService.getStats();
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

module.exports = router;

// Dashboard manual live test submission
router.post('/attempt', async (req, res) => {
  try {
    const data = req.body;
    await analyticsService.recordAttempt({
      platform: data.site || 'unknown',
      energy: data.energy || 3,
      verdict: data.verdict || 'deny',
      need: data.need_category || 'unknown',
      requestedMinutes: data.requestedMinutes || 0,
      resetSeconds: data.resetSeconds || 60,
      minutesGranted: data.minutes_granted || 0,
      escalationLevel: data.escalationLevel || 0
    });
    return res.json({ success: true, message: 'Attempt recorded manually.' });
  } catch (error) {
    console.error('Error recording manual attempt:', error);
    return res.status(500).json({ success: false, message: 'Failed to record attempt.' });
  }
});

// Dashboard clear data
router.delete('/attempts', async (req, res) => {
  try {
    await analyticsService.clearData();
    return res.json({ success: true, message: 'Data cleared successfully.' });
  } catch (error) {
    console.error('Error clearing data:', error);
    return res.status(500).json({ success: false, message: 'Failed to clear data.' });
  }
});
