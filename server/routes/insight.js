const express = require('express');
const router = express.Router();
const llmService = require('../services/llm');
const analyticsService = require('../services/analytics');

router.post('/', async (req, res) => {
    try {
        const stats = analyticsService.getStats();
        const insight = await llmService.generateInsight(stats);
        res.json({ insight });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
