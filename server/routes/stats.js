const express = require('express');
const router = express.Router();
const analyticsService = require('../services/analytics');

// GET /stats - deterministic analytics
router.get('/', (req, res) => {
    try {
        const source = req.query.source || 'all';
        const stats = analyticsService.getStats(source);
        res.json(stats);
    } catch (error) {
        console.error('Error calculating /stats:', error);
        res.status(500).json({ error: 'Internal server error calculating stats' });
    }
});

// GET /stats/activity - list of attempts with filtering
router.get('/activity', (req, res) => {
    try {
        const { source, verdict, site, need, energy, search } = req.query;
        const attempts = analyticsService.getAttempts({ source, verdict, site, need, energy, search });
        res.json({
            total: attempts.length,
            attempts
        });
    } catch (error) {
        console.error('Error fetching activity:', error);
        res.status(500).json({ error: 'Internal server error fetching activity' });
    }
});

// POST /stats/attempt - add an attempt (live or simulated)
router.post('/attempt', (req, res) => {
    try {
        const data = req.body;
        if (!data || !data.site) {
            return res.status(400).json({ error: 'Site is required' });
        }
        const created = analyticsService.addAttempt(data);
        res.status(201).json({ success: true, attempt: created });
    } catch (error) {
        console.error('Error creating attempt:', error);
        res.status(500).json({ error: 'Internal server error creating attempt' });
    }
});

// DELETE /stats/attempts - clear attempts (type='live' or type='all')
router.delete('/attempts', (req, res) => {
    try {
        const type = req.query.type || 'live';
        const result = analyticsService.clearAttempts(type);
        res.json({ success: true, ...result });
    } catch (error) {
        console.error('Error clearing attempts:', error);
        res.status(500).json({ error: 'Internal server error clearing attempts' });
    }
});

module.exports = router;
