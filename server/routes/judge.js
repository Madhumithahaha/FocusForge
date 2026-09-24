const express = require('express');
const router = express.Router();
const llmService = require('../services/llm');
const validatorService = require('../services/validator');
const analyticsService = require('../services/analytics');

router.post('/', async (req, res) => {
    try {
        const attemptData = req.body;
        // Validate request
        if (!validatorService.isValidAttempt(attemptData)) {
            return res.status(400).json({ error: 'Invalid attempt data' });
        }

        // Call LLM / Rule evaluation
        const result = await llmService.evaluateAttempt(attemptData);
        
        // Save live attempt to data/attempts.json
        const savedRecord = analyticsService.addAttempt({
            site: attemptData.site,
            energy: attemptData.energy,
            excuse: attemptData.excuse,
            attemptCount: attemptData.attemptCount || 1,
            verdict: result.verdict,
            need_category: result.need_category,
            excuse_strength: result.excuse_strength,
            minutes_granted: result.minutes_granted,
            micro_task: result.micro_task,
            timestamp: new Date().toISOString(),
            source: 'live'
        });

        res.json({
            ...result,
            savedId: savedRecord.id
        });
    } catch (error) {
        console.error('Error in /judge:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
