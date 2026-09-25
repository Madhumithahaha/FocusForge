'use strict';

const express = require('express');
const { validateJudgeBody } = require('../utils/validation');
const { judgeAttempt } = require('../services/judge');

const router = express.Router();

router.post('/', validateJudgeBody, async (req, res) => {
  try {
    const result = await judgeAttempt(req.judgeInput, { injectionFlag: false });
    
    const ALLOWED_NEEDS = ['tired', 'bored', 'stressed', 'lonely', 'avoiding', 'genuine'];
    const ALLOWED_VERDICTS = ['deny', 'task', 'allow'];
    if (!ALLOWED_NEEDS.includes(result.need)) result.need = 'avoiding';
    if (!ALLOWED_VERDICTS.includes(result.verdict)) result.verdict = 'deny';
    if (!Number.isInteger(result.resetSeconds)) result.resetSeconds = 120;
    
    res.json({
      success: true,
      verdict: result.verdict,
      need: result.need,
      reason: result.reason,
      action: result.action,
      resetSeconds: result.resetSeconds,
    });
  } catch (err) {
    console.error("ROUTE ERROR:", err.message);
    res.status(500).json({ success: false, error: "Unable to process request" });
  }
});

module.exports = router;
