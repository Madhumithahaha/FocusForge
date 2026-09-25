const express = require('express');
const router = express.Router();
const llmService = require('../services/llm');
const analyticsService = require('../services/analytics');

router.post('/', async (req, res) => {
    try {
        const source = req.query.source || req.body.source || 'all';
        // The LLM receives ONLY computed statistics, never raw logs or browsing content!
        let stats = req.body.stats;
        if (!stats || typeof stats !== 'object' || !stats.totalAttempts) {
            stats = analyticsService.getStats(source);
        }

        const insight = await llmService.generateInsight(stats);
        
        // Return structured insight format
        res.json({
            success: true,
            insight,
            fingerprint: insight.fingerprint,
            experiment: insight.experiment
        });
    } catch (error) {
        console.error('Error generating insight:', error);
        // Fallback gracefully so insight endpoint never breaks the UI
        const source = req.query.source || req.body?.source || 'all';
        const fallbackStats = analyticsService.getStats(source);
        const fallback = llmService.generateDeterministicInsight(fallbackStats);
        res.json({
            success: true,
            insight: fallback,
            fingerprint: fallback.fingerprint,
            experiment: fallback.experiment,
            fallback: true
        });
    }
});

// Also support GET /insight for convenience and quick testing
router.get('/', async (req, res) => {
    try {
        const source = req.query.source || 'all';
        const stats = analyticsService.getStats(source);
        const insight = await llmService.generateInsight(stats);
        res.json({
            success: true,
            insight,
            fingerprint: insight.fingerprint,
            experiment: insight.experiment
        });
    } catch (error) {
        console.error('Error generating insight (GET):', error);
        const fallbackStats = analyticsService.getStats('all');
        const fallback = llmService.generateDeterministicInsight(fallbackStats);
        res.json({
            success: true,
            insight: fallback,
            fingerprint: fallback.fingerprint,
            experiment: fallback.experiment,
            fallback: true
        });
    }
});

module.exports = router;
