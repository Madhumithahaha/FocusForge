'use strict';

const config = require('../config');
const { detectPromptInjection } = require('../utils/validation');
const { validateLlmJson, judgeWithLlm } = require('./llm');

const KEYWORDS = {
  genuine: [
    'tutorial', 'homework', 'assignment', 'study', 'studying', 'course', 'lecture',
    'learn', 'research', 'project', 'work', 'docs', 'documentation', 'fix', 'bug',
    'ticket', 'exam', 'class',
  ],
  tired: [
    'tired', 'exhausted', 'exhausting', 'sleepy', 'sleep', 'fatigue', 'fatigued',
    'drained', 'drowsy', 'low energy', 'long day', 'weary',
  ],
  stressed: [
    'stress', 'stressed', 'stressful', 'anxiet', 'overwhelm', 'overload',
    'worried', 'panic', "can't cope", 'pressure',
  ],
  lonely: [
    'lonely', 'alone', 'isolated', 'nobody', 'no one', 'miss ', 'missing',
    'no friends', 'talk to someone',
  ],
  avoiding: [
    'avoid', 'procrastinat', 'put off', 'putting off', "don't want to", 'dont want to',
    'distract myself', 'instead of',
  ],
  bored: [
    'bored', 'boring', 'nothing to do', 'killing time', 'kill time', 'scroll',
    'binge', 'for fun', 'just want to watch',
  ],
};

function hits(text, words) {
  return words.some((w) => text.includes(w));
}

/**
 * Deterministic mock judge using energy, excuse keywords and requestedMinutes.
 * Used whenever MOCK_MODE=true.  The function never calls Groq.
 * Returns the same schema as the real LLM verdict:
 * {verdict, need, reason, action, resetSeconds}
 */
function mockJudge({ energy, excuse, context }) {
  const text = String(excuse).toLowerCase();
  const requestedMinutes = (context && context.requestedMinutes) ? Number(context.requestedMinutes) : 0;

  // 1. Low energy + "tired/exhausted/sleepy" -> need = tired
  if (energy <= 2 && /tired|exhausted|sleepy/.test(text)) {
    return {
      verdict: 'deny',
      need: 'tired',
      reason: 'Your response suggests you are mainly trying to recover from fatigue.',
      action: 'Take a short 2-minute reset before deciding.',
      resetSeconds: 120,
    };
  }

  // 2. Excuse containing "bored/nothing to do" -> need = bored
  if (/bored|nothing to do/.test(text)) {
    return {
      verdict: 'task',
      need: 'bored',
      reason: 'This looks like boredom rather than a real need.',
      action: 'Do a 60-second reset (stretch, water, breathe), then decide.',
      resetSeconds: 60,
    };
  }

  // 3. Excuse containing "stress/overwhelmed" -> need = stressed
  if (/stress|overwhelm|overloaded|panic/.test(text)) {
    return {
      verdict: 'task',
      need: 'stressed',
      reason: 'You seem stressed and reaching for relief.',
      action: 'Try a 90-second breathing reset, then revisit the urge.',
      resetSeconds: 90,
    };
  }

  // 4. Excuse containing "lonely/no one" -> need = lonely
  if (/lonely|no one|alone/.test(text)) {
    return {
      verdict: 'task',
      need: 'lonely',
      reason: 'You sound a bit lonely right now.',
      action: 'Message someone or step outside for 90 seconds first.',
      resetSeconds: 90,
    };
  }

  // 5. Excuse containing "assignment/exam/homework/work/later" -> need = avoiding
  if (/assignment|exam|homework|work|later/.test(text)) {
    return {
      verdict: 'deny',
      need: 'avoiding',
      reason: 'This looks like avoiding something harder.',
      action: 'Work on the hard thing for 2 minutes first, then decide.',
      resetSeconds: 120,
    };
  }

  // 6. Otherwise -> need = genuine (allow)
  return {
    verdict: 'allow',
    need: 'genuine',
    reason: 'This looks like a genuine, specific need.',
    action: 'Go ahead — keep it to the time you planned.',
    resetSeconds: 0,
  };
}

/**
 * Server-side guardrails. Runs on every candidate verdict (mock or LLM):
 * - prompt-injection flag forces a firm deny (never allow),
 * - enums are re-checked (client can never smuggle a verdict through input,
 *   and a bad LLM payload can never leak to the client),
 * - resetSeconds is normalized: 0 for allow, 60-120 for deny/task.
 */
function applyServerRules(candidate, { injectionFlag = false } = {}) {
  if (injectionFlag) {
    return {
      success: true,
      verdict: 'deny',
      need: 'avoiding',
      reason: 'That input looks like an instruction override, so the bouncer is staying firm.',
      action: 'State your reason plainly without instructions and try again.',
      resetSeconds: 120,
    };
  }

  const verdict = ['deny', 'task', 'allow'].includes(candidate.verdict)
    ? candidate.verdict
    : 'deny';
  const need = ['tired', 'bored', 'stressed', 'lonely', 'avoiding', 'genuine'].includes(
    candidate.need
  )
    ? candidate.need
    : 'avoiding';
  const reason =
    typeof candidate.reason === 'string' && candidate.reason.trim()
      ? candidate.reason.trim().slice(0, 300)
      : 'No clear reason was given.';
  const action =
    typeof candidate.action === 'string' && candidate.action.trim()
      ? candidate.action.trim().slice(0, 300)
      : 'Pause for a minute, then decide.';

  let resetSeconds;
  if (verdict === 'allow') {
    resetSeconds = 0;
  } else if (
    Number.isInteger(candidate.resetSeconds) &&
    candidate.resetSeconds >= 60 &&
    candidate.resetSeconds <= 120
  ) {
    resetSeconds = candidate.resetSeconds;
  } else {
    resetSeconds = verdict === 'deny' ? 120 : 90;
  }

  return { success: true, verdict, need, reason, action, resetSeconds };
}

/**
 * Full pipeline: inject-check -> mock|LLM -> validate -> server rules.
 * `input` must already be sanitized by validateJudgePayload.
 *
 * Resilience: ANY LLM problem (missing key, timeout, API error, unparseable
 * or schema-invalid JSON) falls back to the deterministic mock judge, so the
 * endpoint always returns a usable verdict. Only the failure KIND is logged —
 * never the key, never the full user input.
 */
async function judgeAttempt(input, { injectionFlag } = {}) {
  const flag =
    typeof injectionFlag === 'boolean'
      ? injectionFlag
      : detectPromptInjection(input.excuse).injected;

  if (config.mockMode) {
    return applyServerRules(mockJudge(input), { injectionFlag: flag });
  }

  try {
    const raw = await judgeWithLlm({
      energy: input.energy,
      excuse: input.excuse,
      context: input.context || {},
      injectionFlag: flag,
    });
    const checked = validateLlmJson(raw);
    if (!checked.valid) {
      // eslint-disable-next-line no-console
      console.error(`[judge] invalid LLM JSON (${checked.errors.join(' ')}) — using fallback.`);
      return applyServerRules(mockJudge(input), { injectionFlag: flag });
    }
    return applyServerRules(checked.value, { injectionFlag: flag });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`[judge] LLM failed (${(err && err.code) || 'UNKNOWN'}) — using fallback.`);
    return applyServerRules(mockJudge(input), { injectionFlag: flag });
  }
}

module.exports = { mockJudge, applyServerRules, judgeAttempt, KEYWORDS };
