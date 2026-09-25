'use strict';

const config = require('../config');

// ---------------------------------------------------------------------------
// In‑memory per‑IP store (acceptable for development only;
// // not suitable for multi‑instance production deployment without a shared
// // store such as Redis or a database).
// ---------------------------------------------------------------------------

// Map<ip, { requestTimes: number[], verdictHistory: {verdict:string, timestamp:number}[], consecutiveDenyTask: number }>
const store = new Map();

/** Return the client IP suitable as a store key. In production you may want
  * to use a session ID or authenticated user identifier rather than the raw IP. */
function parseIp(req) {
  // Prefer the left‑most IP when behind a reverse proxy.
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const leftmost = forwarded.split(',')[0].trim();
    // Strip IPv6 zone id if present.
    return leftmost.split(':')[0];
  }
  // Fallback to the direct remote address.
  const addr = req.socket?.remoteAddress || '';
  return addr.split(':')[0];
}

/** Remove timestamps older than `cutoff` (ms since epoch). */
function pruneOlderThan(arr, cutoff) {
  return arr.filter(t => t > cutoff);
}

/** Initialise (or retrieve) the state for *ip*. */
function getState(ip) {
  let s = store.get(ip);
  if (!s) {
    s = {
      requestTimes: [],
      verdictHistory: [],
      consecutiveDenyTask: 0,
    };
    store.set(ip, s);
  }
  return s;
}

/** Clean up stale entries based on the configured escalation window and a 1‑minute
  * sliding window for rate‑limit counting. */
function cleanupState(state) {
  const now = Date.now();
  const escWindowMs = config.escalationWindowMinutes * 60 * 1000;
  const minuteWindowMs = 60 * 1000;

  state.requestTimes = pruneOlderThan(state.requestTimes, now - minuteWindowMs);
  state.verdictHistory = pruneOlderThan(
    state.verdictHistory.map(e => ({ verdict: e.verdict, timestamp: e.timestamp })),
    now - escWindowMs
  );
}

/** Rate‑limit check: return *true* if the IP may make another judge request
  * within the current minute (configurable via MAX_REQUESTS_PER_MINUTE). */
function canMakeRequest(ip) {
  const state = getState(ip);
  cleanupState(state);
  return state.requestTimes.length < config.maxRequestsPerMinute;
}

/** Record a judged attempt for the given IP and verdict.  Updates the
  * consecutive‑deny‑/task counter and purges stale entries. */
function recordAttempt(ip, verdict) {
  const state = getState(ip);
  cleanupState(state);
  const now = Date.now();

  state.requestTimes.push(now);
  state.verdictHistory.push({ verdict, timestamp: now });

  if (verdict === 'deny' || verdict === 'task') {
    state.consecutiveDenyTask += 1;
  } else {
    // an "allow" resets the escalation counter
    state.consecutiveDenyTask = 0;
  }
}

/** -------------------------------------------------------------------------
 * Escalation logic
 *
 * The function looks at the number of ``deny`` / ``task`` verdicts that have
 * been recorded within the ``ESCALATION_WINDOW_MINUTES`` window and maps that
 * count to an escalation level and a cooldown duration that should be returned
 * to the client.
 *
 * Level 0 – normal judgment (no cooldown).
 * Level 1 – short reset (≈ 60 s cooldown).
 * Level 2 – slightly longer reset (≈ 120 s cooldown).
 * Level 3 – stronger intervention / cooldown (≈ 180 s cooldown).
 * ------------------------------------------------------------------------- */
function getEscalation(ip) {
  const state = getState(ip);
  cleanupState(state);

  const now = Date.now();
  const escWindowMs = config.escalationWindowMinutes * 60 * 1000;

  // Count consecutive deny/task entries that fall inside the escalation window.
  // As soon as an ``allow`` appears we reset the running count.
  let consecutive = 0;
  for (const entry of state.verdictHistory) {
    if (now - entry.timestamp <= escWindowMs) {
      if (entry.verdict === 'deny' || entry.verdict === 'task') {
        consecutive += 1;
      } else {
        // allow resets the streak
        consecutive = 0;
      }
    } else {
      // outside the window – stop counting
      break;
    }
  }
  // Also honour the in‑memory counter that judge.js maintains, as a fallback.
  const effective = Math.max(consecutive, state.consecutiveDenyTask || 0);

  let level = 0;
  let cooldownSeconds = 0;

  if (effective >= 7) {
    level = 3;
    cooldownSeconds = 180;   // 3 minutes
  } else if (effective >= 5) {
    level = 2;
    cooldownSeconds = 120;   // 2 minutes
  } else if (effective >= 3) {
    level = 1;
    cooldownSeconds = 60;    // 1 minute
  }

  return { level, cooldownSeconds };
}

/** Reset the escalation state for an IP (e.g. after the user completes a
  * suggested reset or after a successful allow). */
function resetEscalation(ip) {
  const state = getState(ip);
  state.consecutiveDenyTask = 0;
  state.verdictHistory = [];
  state.requestTimes = [];
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------
module.exports = {
  parseIp,
  canMakeRequest,
  recordAttempt,
  getEscalation,
  resetEscalation,
};