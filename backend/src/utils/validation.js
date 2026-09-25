'use strict';

/**
 * Validation + sanitization for POST /judge.
 *
 * Accepted input (everything else is ignored — client verdicts are never trusted):
 * {
 *   energy: 1-5 (integer, required),
 *   excuse: non-empty string, max 500 chars (required),
 *   context: optional object {
 *     platform: optional non-empty string (max 80),
 *     requestedMinutes: optional integer 1-60
 *   }
 * }
 */

const EXCUSE_MAX = 500;
const PLATFORM_MAX = 80;

// Patterns that suggest the excuse is trying to steer the judge
// ("ignore instructions", fake system blocks, forced-verdict demands, ...).
// Detection never rejects the request — it flags it so server-side rules
// can refuse to `allow` (see services/judge.js).
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+|any\s+|previous\s+|prior\s+|above\s+|your\s+)*/i,
  /disregard\s+(all\s+|previous\s+|prior\s+|your\s+)*/i,
  /\bsystem\s*:/i,
  /you\s+are\s+now\b/i,
  /\bnew\s+instructions\b/i,
  /\bjailbreak\b/i,
  /\bDAN\b/,
  /reveal\s+(your\s+)?(prompt|instructions|system)/i,
  /(verdict|respond|reply|answer|output)\s*[:=]?\s*(must|always|only)\s+(be\s+)?allow/i,
  /always\s+(return|give|grant)\s+allow/i,
  /pretend\s+(you\s+are|to\s+be)\b/i,
  /\[ *system *\]/i,
  /<\|?\s*system\s*\|?>/i,
];

function isEnergyLevel(value) {
  return Number.isInteger(value) && value >= 1 && value <= 5;
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/** Collapse whitespace, strip control chars, trim. Never nulls out. */
function sanitizeText(raw, maxLen) {
  const noControls = String(raw).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
  const collapsed = noControls.replace(/\s+/g, ' ').trim();
  return collapsed.slice(0, maxLen);
}

function detectPromptInjection(excuse) {
  const text = String(excuse || '');
  const matched = INJECTION_PATTERNS.filter((re) => re.test(text)).map((re) => re.source);
  return { injected: matched.length > 0, signals: matched };
}

function validateJudgePayload(body) {
  const errors = [];

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { valid: false, errors: ['Request body must be a JSON object.'], value: undefined };
  }

  // energy — required, strict integer 1-5 (strings like "3" are rejected).
  if (!Number.isInteger(body.energy) || body.energy < 1 || body.energy > 5) {
    errors.push('energy must be an integer from 1 to 5.');
  }

  // excuse — required, non-empty, max 500 chars (measured pre-trim to be strict).
  if (typeof body.excuse !== 'string' || body.excuse.trim().length === 0) {
    errors.push('excuse must be a non-empty string.');
  } else if (body.excuse.length > EXCUSE_MAX) {
    errors.push(`excuse must be at most ${EXCUSE_MAX} characters.`);
  }

  // context — fully optional; if present must be an object.
  let platform;
  let requestedMinutes;
  if (body.context !== undefined) {
    if (!body.context || typeof body.context !== 'object' || Array.isArray(body.context)) {
      errors.push('context must be an object if provided.');
    } else {
      if (body.context.platform !== undefined) {
        if (
          typeof body.context.platform !== 'string' ||
          body.context.platform.trim().length === 0
        ) {
          errors.push('context.platform must be a non-empty string if provided.');
        } else if (body.context.platform.length > PLATFORM_MAX) {
          errors.push(`context.platform must be at most ${PLATFORM_MAX} characters.`);
        } else {
          platform = body.context.platform.trim().toLowerCase().slice(0, PLATFORM_MAX);
        }
      }
      if (body.context.requestedMinutes !== undefined) {
        if (
          !Number.isInteger(body.context.requestedMinutes) ||
          body.context.requestedMinutes < 1 ||
          body.context.requestedMinutes > 60
        ) {
          errors.push('context.requestedMinutes must be an integer between 1 and 60 if provided.');
        } else {
          requestedMinutes = body.context.requestedMinutes;
        }
      }
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors, value: undefined };
  }

  // Sanitized value: only whitelisted fields survive.
  // Any client-supplied verdict/need/success/resetSeconds is dropped here.
  const value = {
    energy: body.energy,
    excuse: sanitizeText(body.excuse, EXCUSE_MAX),
    context: {},
  };
  if (platform !== undefined) value.context.platform = platform;
  if (requestedMinutes !== undefined) value.context.requestedMinutes = requestedMinutes;

  return { valid: true, errors: [], value };
}

/** Express middleware: 400 { success:false, message, errors } on bad input. */
function validateJudgeBody(req, res, next) {
  const { valid, errors, value } = validateJudgePayload(req.body);
  if (!valid) {
    return res.status(400).json({ success: false, message: 'Invalid input.', errors });
  }
  req.judgeInput = value;
  return next();
}

module.exports = {
  EXCUSE_MAX,
  isEnergyLevel,
  isNonEmptyString,
  sanitizeText,
  detectPromptInjection,
  validateJudgePayload,
  validateJudgeBody,
};
