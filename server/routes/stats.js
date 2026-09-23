const express = require('express');
const router = express.Router();
const analyticsService = require('../services/analytics');

router.get('/', (req, res) => {
    try {
        const stats = analyticsService.getStats();
        res.json(stats);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
