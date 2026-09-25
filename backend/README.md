# FocusForge Backend — AI Bouncer judging API

Express + mock judge (deterministic, keyword + energy based). Groq is **not** wired yet — `src/services/llm.js` exposes the provider interface (`judgeWithLlm`, `validateLlmJson`, `JUDGE_SYSTEM_PROMPT`) for the next step. Set `MOCK_MODE=false` and plug in Groq there.

## Structure

```
backend/
├── src/
│   ├── server.js              # Express app, /health, route mounting, error handling
│   ├── config.js              # dotenv-backed config (PORT, GROQ_*, MOCK_MODE, limits)
│   ├── routes/
│   │   ├── judge.js           # POST /judge — validate → service → respond (no AI logic)
│   │   └── stats.js           # GET /stats (stub → 501)
│   ├── services/
│   │   ├── judge.js           # pipeline: mock|LLM → validate → server-side rules
│   │   └── llm.js             # provider interface (Groq lands here next)
│   ├── middleware/
│   │   ├── rateLimit.js       # per-minute AI + general limiters
│   │   └── security.js        # helmet, CORS, JSON parsing, logging, errors
│   └── utils/
│       └── validation.js      # schema, sanitize, prompt-injection detect
├── test/judge.test.js
├── .env / .env.example
├── package.json
└── README.md
```

## Setup

```bash
cd backend
cp .env.example .env   # MOCK_MODE=true works with no key
npm install
```

## Run

```bash
npm start    # production: node src/server.js
npm run dev  # development: nodemon src/server.js
npm test     # unit tests (node:test, no extra deps)
```

Server listens on `PORT` (default `5000`).

## Endpoint: POST /judge

Input:

```json
{ "energy": 1, "excuse": "I'm tired...", "context": { "platform": "youtube", "requestedMinutes": 10 } }
```

- `energy`: required integer 1–5 (strict — `"3"` is rejected)
- `excuse`: required non-empty string, max 500 chars
- `context`: optional object; `platform` optional non-empty string; `requestedMinutes` optional integer 1–60
- Anything else in the body (e.g. `verdict`, `need`) is ignored — the client is never trusted

Success response:

```json
{ "success": true, "verdict": "deny", "need": "tired", "reason": "...", "action": "...", "resetSeconds": 120 }
```

- `verdict` ∈ `deny/task/allow`, `need` ∈ `tired/bored/stressed/lonely/avoiding/genuine`
- `resetSeconds`: `0` for `allow`, `60–120` for `deny`/`task`
- Invalid input → `400 { success:false, message, errors[] }`

## curl examples (MOCK_MODE=true)

```bash
BASE=http://localhost:5000

# 1. tired user -> deny/tired
curl -s -X POST $BASE/judge -H 'Content-Type: application/json' -d \
  '{"energy":1,"excuse":"I'"'"'m tired and want to watch YouTube for a while","context":{"platform":"youtube","requestedMinutes":10}}'; echo

# 2. bored user -> task/bored
curl -s -X POST $BASE/judge -H 'Content-Type: application/json' -d \
  '{"energy":3,"excuse":"I am bored, nothing to do, just want to scroll","context":{"platform":"tiktok","requestedMinutes":15}}'; echo

# 3. genuine user -> allow/genuine
curl -s -X POST $BASE/judge -H 'Content-Type: application/json' -d \
  '{"energy":4,"excuse":"Need to follow a React hooks tutorial for my ticket","context":{"platform":"youtube","requestedMinutes":20}}'; echo

# 4. invalid energy -> 400
curl -s -X POST $BASE/judge -H 'Content-Type: application/json' -d \
  '{"energy":9,"excuse":"just a minute"}'; echo

# 5. excessively long excuse (501 chars) -> 400
python3 -c "print('{\"energy\":3,\"excuse\":\"'+'x'*501+'\"}')" > /tmp/long.json
curl -s -X POST $BASE/judge -H 'Content-Type: application/json' -d @/tmp/long.json; echo
```

## Security notes

- `GROQ_API_KEY` lives only in `src/config.js` / `src/services/llm.js` on the server and is never sent in any response.
- Helmet headers + CORS + 32kb JSON body limit are applied globally.
- `/judge` is behind a strict per-minute limiter (`MAX_REQUESTS_PER_MINUTE`); injection-flagged input is forced to `deny`/`avoiding` server-side.
