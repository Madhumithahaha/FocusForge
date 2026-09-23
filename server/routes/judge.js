const express = require('express');
const router = express.Router();
const llmService = require('../services/llm');
const validatorService = require('../services/validator');

router.post('/', async (req, res) => {
    try {
        const attemptData = req.body;
        // Validate request
        if (!validatorService.isValidAttempt(attemptData)) {
            return res.status(400).json({ error: 'Invalid attempt data' });
        }

        // Call LLM
        const result = await llmService.evaluateAttempt(attemptData);
        
        // TODO: Save attempt to data/attempts.json

        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
