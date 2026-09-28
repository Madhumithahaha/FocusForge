const express = require('express');
const verifyService = require('../services/verifyService');
const {
  validateVerifyInput,
  sanitizeExcuse,
  sanitizePlatform,
  sanitizeObservedContent,
  detectPromptInjection,
} = require('../utils/validation');

const router = express.Router();

router.get('/', (req, res) => {
  return res.json({
    success: true,
    message: 'Verify route ready. POST /verify (or /api/verify) with { excuse, observedContent } for an on-task check.',
  });
});

// POST /verify (mounted as both /verify and /api/verify in server.js)
// Mid-grant compliance check: is the currently observed page content still
// consistent with the reason that earned the grant? Real-time only — not
// persisted to attempts.json, and never blocks; the extension decides how
// to present the result (a soft nudge, not a hard re-lock).
router.post('/', async (req, res, next) => {
  try {
    const validation = validateVerifyInput(req.body);
    if (!validation.valid) {
      return res.status(400).json({ success: false, message: validation.error });
    }

    const { energy, need } = validation.value;
    const sanitizedExcuse = sanitizeExcuse(validation.value.excuse);
    const sanitizedPlatform = sanitizePlatform(validation.value.platform);
    const sanitizedObservedContent = sanitizeObservedContent(validation.value.observedContent);

    if (detectPromptInjection(validation.value.excuse) || detectPromptInjection(validation.value.observedContent)) {
      console.warn('Prompt injection attempt redacted in /verify request');
    }

    const result = await verifyService.evaluate({
      excuse: sanitizedExcuse,
      observedContent: sanitizedObservedContent,
      energy,
      platform: sanitizedPlatform,
      need,
    });

    if (!result.success) {
      console.error(`Verify evaluation failed: ${result.message || 'unknown error'}`);
      return res.status(502).json({ success: false, message: 'Unable to process request' });
    }

    return res.json({
      success: true,
      onTask: result.onTask,
      confidence: result.confidence,
      message: result.message,
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
