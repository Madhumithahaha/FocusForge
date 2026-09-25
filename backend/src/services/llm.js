'use strict';

/**
 * Groq LLM provider for the FocusForge AI Bouncer.
 *
 * Isolated from Express: routes never import this file directly, they go
 * through services/judge.js, which validates everything returned here and
 * falls back to the deterministic mock judge on ANY failure
 * (missing key, timeout, API error, bad JSON, schema mismatch).
 *
 * Privacy: the API key is read from server-side config only and is never
 * logged, never sent to the client, and never included in error messages.
 * User excuses are sent to Groq (required for judging) but never logged.
 */

const config = require('../config');

const VERDICTS = ['deny', 'task', 'allow'];
const NEEDS = ['tired', 'bored', 'stressed', 'lonely', 'avoiding', 'genuine'];

const JUDGE_SYSTEM_PROMPT = `You are the FocusForge AI Bouncer, a brief mindful gatekeeper for distracting sites.
Classify the user's underlying need into exactly one of: tired, bored, stressed, lonely, avoiding, genuine.
Then return exactly one verdict: deny, task, or allow.
- deny: the urge looks like fatigue/avoidance/doomscrolling; rest first.
- task: a short reset first (boredom, stress, loneliness); grant access after.
- allow: a genuine, specific need (work, study, a concrete task).
Reply with ONLY valid JSON, no markdown, no extra keys:
{"need","verdict","reason","action","resetSeconds"}
reason: one concise sentence. action: one practical step.
resetSeconds: 60-120 for deny/task, 0 for allow.`;

function validateLlmJson(raw) {
  const errors = [];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { valid: false, errors: ['LLM output must be a JSON object.'], value: undefined };
  }
  if (!VERDICTS.includes(raw.verdict)) {
    errors.push(`verdict must be exactly one of: ${VERDICTS.join('/')}.`);
  }
  if (!NEEDS.includes(raw.need)) {
    errors.push(`need must be exactly one of: ${NEEDS.join('/')}.`);
  }
  if (typeof raw.reason !== 'string' || raw.reason.trim().length === 0) {
    errors.push('reason must be a concise non-empty string.');
  }
  if (typeof raw.action !== 'string' || raw.action.trim().length === 0) {
    errors.push('action must be a practical non-empty string.');
  }
  if (!Number.isInteger(raw.resetSeconds) || raw.resetSeconds < 0 || raw.resetSeconds > 600) {
    errors.push('resetSeconds must be an integer between 0 and 600.');
  }
  if (errors.length > 0) {
    return { valid: false, errors, value: undefined };
  }
  return {
    valid: true,
    errors: [],
    value: {
      verdict: raw.verdict,
      need: raw.need,
      reason: raw.reason.trim().slice(0, 300),
      action: raw.action.trim().slice(0, 300),
      resetSeconds: raw.resetSeconds,
    },
  };
}

function getClient() {
  // Lazy require so the app boots even if the SDK is absent (mock mode).
  // groq-sdk v1 CJS interop: constructor may sit on .default or .Groq.
  // eslint-disable-next-line global-require
  const mod = require('groq-sdk');
  const Groq = mod && (mod.default || mod.Groq || mod);
  return new Groq({ apiKey: config.groqApiKey });
}

function buildUserMessage({ energy, excuse, context }) {
  // Only the fields the model needs. Already sanitized upstream (max 500 chars).
  return JSON.stringify({
    energy,
    excuse,
    platform: (context && context.platform) || null,
    requestedMinutes: (context && context.requestedMinutes) || null,
  });
}

/** Tolerate fences/wrapper text, then parse the outer JSON object. */
function extractJson(text) {
  const stripped = String(text || '')
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();
  try {
    return JSON.parse(stripped);
  } catch {
    const start = stripped.indexOf('{');
    const end = stripped.lastIndexOf('}');
    if (start === -1 || end <= start) throw new Error('LLM did not return JSON.');
    return JSON.parse(stripped.slice(start, end + 1));
  }
}

/** Remove any key material before an error is logged or propagated. */
function sanitizeErrorMessage(message) {
  let out = String((message && message.message) || message || 'Unknown LLM error');
  if (config.groqApiKey) {
    out = out.split(config.groqApiKey).join('[redacted]');
  }
  return out
    .replace(/gsk_[A-Za-z0-9_-]{5,}/g, '[redacted]')
    .replace(/sk-[A-Za-z0-9-_]{5,}/g, '[redacted]')
    .slice(0, 300);
}

/**
 * judgeWithLlm(input) — call Groq and return the PARSED (not yet validated)
 * verdict object. The caller (services/judge.js) runs validateLlmJson() and
 * falls back to the mock judge on anything unexpected.
 *
 * Throws with .code set, never leaking the key or the full user input:
 *   MISSING_API_KEY | LLM_TIMEOUT | LLM_PARSE_ERROR | LLM_API_ERROR
 */
async function judgeWithLlm(input) {
  if (!config.groqApiKey) {
    const err = new Error('GROQ_API_KEY is not configured.');
    err.code = 'MISSING_API_KEY';
    throw err;
  }

  const started = Date.now();
  let client;
  try {
    client = getClient();
  } catch (e) {
    const err = new Error(`LLM client init failed: ${sanitizeErrorMessage(e)}`);
    err.code = 'LLM_API_ERROR';
    throw err;
  }

  const timeoutMs = config.llmTimeoutMs;
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error(`Groq request timed out after ${timeoutMs}ms.`);
      err.code = 'LLM_TIMEOUT';
      reject(err);
    }, timeoutMs);
    if (timer.unref) timer.unref();
  });

  try {
    const request = client.chat.completions.create(
      {
        model: config.groqModel,
        temperature: 0.3,
        max_tokens: 400,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: JUDGE_SYSTEM_PROMPT },
          { role: 'user', content: buildUserMessage(input) },
        ],
      },
      { timeout: timeoutMs }
    );
    const completion = await Promise.race([request, timeout]);
    const content = completion?.choices?.[0]?.message?.content;
    if (!content) {
      const err = new Error('LLM returned an empty response.');
      err.code = 'LLM_PARSE_ERROR';
      throw err;
    }
    try {
      return extractJson(content);
    } catch {
      const err = new Error('LLM did not return parseable JSON.');
      err.code = 'LLM_PARSE_ERROR';
      throw err;
    }
  } catch (err) {
    if (err && (err.code === 'LLM_TIMEOUT' || err.code === 'LLM_PARSE_ERROR')) throw err;
    if (err && err.code === 'MISSING_API_KEY') throw err;
    const wrapped = new Error(`Groq request failed: ${sanitizeErrorMessage(err)}`);
    wrapped.code = 'LLM_API_ERROR';
    throw wrapped;
  } finally {
    clearTimeout(timer);
    // Minimal operational log: model + latency + energy band only.
    // Never the excuse, never the key.
    if (config.env !== 'test') {
      // eslint-disable-next-line no-console
      console.log(`[llm] model=${config.groqModel} latency=${Date.now() - started}ms`);
    }
  }
}

module.exports = {
  VERDICTS,
  NEEDS,
  JUDGE_SYSTEM_PROMPT,
  validateLlmJson,
  judgeWithLlm,
  // Alias for the exact name used in the task spec.
  judgeWithLLM: judgeWithLlm,
  // Exported for unit tests.
  _extractJson: extractJson,
  _sanitizeErrorMessage: sanitizeErrorMessage,
};
