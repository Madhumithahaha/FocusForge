'use strict';

const rateLimit = require('express-rate-limit');
const config = require('../config');

/**
 * Rate limiting appropriate for an AI-backed API:
 * - AI endpoints (/judge) are expensive -> strict per-minute cap.
 * - Everything else gets a looser general cap so health/stats stay usable.
 */

const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: config.maxRequestsPerMinute, // e.g. 30 (see MAX_REQUESTS_PER_MINUTE)
  standardHeaders: true, // RateLimit-* headers
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please slow down and try again in a minute.',
  },
});

const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: config.maxRequestsPerMinute * 4,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Try again shortly.' },
});

module.exports = { aiLimiter, generalLimiter };
