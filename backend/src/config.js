require('dotenv').config();

module.exports = {
  port: parseInt(process.env.PORT, 10) || 5000,
  env: process.env.NODE_ENV || 'development',

  // Kept server-side only. Never send this to the client.
  // Read only inside services/llm.js when making the Groq call.
  groqApiKey: process.env.GROQ_API_KEY || '',
  groqModel: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',

  // Abort the Groq request after this long; the judge service then falls back
  // to the deterministic mock judge. Configurable via LLM_TIMEOUT_MS.
  llmTimeoutMs: parseInt(process.env.LLM_TIMEOUT_MS, 10) || 12000,

  // When true, later tasks may bypass the real Groq call with a stub.
  mockMode: String(process.env.MOCK_MODE || 'true').toLowerCase() === 'true',

  // Single knob for AI rate limiting (requests per minute per IP).
  maxRequestsPerMinute: parseInt(process.env.MAX_REQUESTS_PER_MINUTE, 10) || 30,

  // Escalation window (minutes) used to judge consecutive deny/task decisions.
  escalationWindowMinutes: parseInt(process.env.ESCALATION_WINDOW_MINUTES, 10) || 30,

  // Maximum number of judge attempts allowed per session (informational; in‑memory
  // store tracks per‑IP but this knob can be used by a future persistent backend).
  maxJudgesPerSession: parseInt(process.env.MAX_JUDGES_PER_SESSION, 10) || 20,
};
