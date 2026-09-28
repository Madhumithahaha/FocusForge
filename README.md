<div align="center">

# 🎯 FocusForge

**An AI bouncer for your attention — not a blocker, a negotiator.**

![Track](https://img.shields.io/badge/Track-Wellness%20%26%20Lifestyle-8A2BE2)
![Status](https://img.shields.io/badge/Status-Hackathon%20Prototype-orange)
![Backend](https://img.shields.io/badge/Backend-Node.js%20%2F%20Express-339933?logo=node.js&logoColor=white)
![AI](https://img.shields.io/badge/AI-Groq%20API-F55036)
![Extension](https://img.shields.io/badge/Extension-Manifest%20V3-4285F4?logo=googlechrome&logoColor=white)

</div>

---

## 💡 Overview

FocusForge is an AI-powered digital-wellbeing tool that steps in when you try to open a distracting site — but instead of just slamming the door shut, it **asks why**.

It reads your stated reason and energy level, interprets intent, and responds with a fair verdict: let you through, hand you a quick wellness task, or ask you to wait it out. The goal isn't rigid restriction (which people just disable when fatigued) — it's addressing the *actual* reason behind the distraction: burnout, boredom, or stress.

> **Track:** Wellness & Lifestyle · ASYNC'26

---

## 🧩 The Problem

Traditional website blockers are all-or-nothing. They don't ask *why* you're distracted, so they get switched off the moment they're inconvenient — usually exactly when you need them most.

## ✨ The Solution

A mindful "bouncer" at the door of every distracting site:

| Signal FocusForge reads | What it can do about it |
|---|---|
| Stated reason for visiting | Judges legitimacy of intent |
| Self-reported energy level | Calibrates the verdict to context |
| Pattern over time | Surfaces insights on the dashboard |

**Possible verdicts:** ✅ Allow &nbsp;·&nbsp; 🧘 Micro-task (stretch, hydrate, breathe) &nbsp;·&nbsp; ⛔ Deny

---

## ⚙️ How It Works

```
1. You try to visit a distracting site
2. Chrome Extension intercepts → shows an intervention overlay
3. You enter your energy level + reason for visiting
4. Server sends this to the AI for evaluation
5. AI returns a verdict: deny / task / allow
```

📄 Full data flow & system design: [`docs/architecture.md`](docs/architecture.md)

---

## 🛠️ Technology Stack

| Layer | Tech |
|---|---|
| **Frontend** | HTML · CSS · JavaScript · Chrome Extension (Manifest V3) |
| **Backend** | Node.js · Express |
| **AI** | Groq API |
| **Dashboard** | HTML · CSS · Chart.js |

---

## 📁 Project Structure

```
FocusForge/
├── extension/   → Chrome extension source code
├── server/      → Express backend + AI evaluation logic
├── dashboard/   → Analytics & metrics dashboard
├── scripts/     → Dev utilities (e.g. seed data generator)
└── docs/        → Project documentation
```

---

## 🚀 Run Locally (Fresh Machine Setup for Windows)

### A. Clone

```powershell
git clone https://github.com/Madhumithahaha/FocusForge.git
cd FocusForge
```

### B. Backend

```powershell
cd server
npm install
copy .env.example .env
npm start
```

* Backend runs on `http://localhost:5000`
* `/health` can be checked at `http://localhost:5000/health`
* `.env` is intentionally not committed.
* `MOCK_MODE=true` in `.env.example` allows the project to run without a Groq API key.
* Users only need to configure `GROQ_API_KEY` and set `MOCK_MODE=false` if they want live Groq judging.

### C. Dashboard

Open a SECOND terminal:

```powershell
cd FocusForge\dashboard
python -m http.server 5500
```

When the server is started from the `dashboard` directory, the correct URL is:
`http://localhost:5500/overview.html`

Do NOT open `/dashboard/overview` for this Python static-server setup.

Note: Python must be installed and available through PATH.

### D. Chrome Extension

1. Open `chrome://extensions`
2. Enable Developer mode
3. Click "Load unpacked"
4. Select the `FocusForge\extension` folder
5. Reload the extension after code changes
6. Open a supported website such as YouTube
7. Refresh the page if necessary

The extension currently connects to:
`http://localhost:5000`

Therefore, each teammate must run the backend locally on their own laptop.

---

## 🛠️ Troubleshooting

* **`EADDRINUSE` / port 5000 already in use**: Find the process locking the port (`netstat -ano | findstr :5000`) and kill it (`taskkill /PID <PID> /F`).
* **port 5500 already in use**: Start the dashboard on a different port (e.g., `python -m http.server 5501`).
* **dashboard 404 caused by using `/dashboard/overview` instead of `/overview.html`**: Navigate exactly to `http://localhost:5500/overview.html`.
* **backend not running / extension cannot reach backend**: Verify the backend terminal is running without errors and check `http://localhost:5000/health`.
* **missing `.env`**: Run `copy .env.example .env` in the `server` folder.
* **missing `node_modules`**: Run `npm install` in the `server` folder.
* **Python not installed**: Install Python and ensure it is added to your Windows PATH.
* **extension loaded but old behavior appears → reload extension + refresh webpage**: Click the reload icon in `chrome://extensions`, then refresh the target page.

---

## 🏗️ Project Architecture

```
Chrome Extension
↓
localhost:5000
↓
FocusForge Backend
↓
Mock Judge / Groq
↓
attempt persistence + stats
↓
Dashboard at localhost:5500
```

The dashboard and backend are separate local servers.

---

## 📡 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/judge` | Evaluates a site access attempt |
| `GET` | `/api/stats?source=all\|live\|simulated` | Returns attempt statistics |
| `GET` | `/api/stats/activity` | Individual attempts for the Activity page (filters: `source, verdict, site, need, energy, search`) |
| `POST` | `/api/stats/attempt` | Records a manual live attempt (dashboard modal) |
| `POST` | `/api/stats/seed` | Regenerates simulated history (keeps live records) |
| `DELETE` | `/api/stats/attempts?type=live\|all` | Clears live-only or all records |
| `POST` | `/verify` | On-task check: does the currently viewed content still match the stated reason? Body: `{ excuse, observedContent, energy?, platform?, need? }` → `{ onTask, confidence, message }` |
| `POST` | `/insight` | Generates a wellness insight |

---

## 🔒 Privacy & Security

- 🔑 API keys never exposed to the client extension
- 🧹 No unnecessary webpage content collected
- 💾 Data kept locally / minimally on the server
- 🎛️ Server retains final decision control

> **Note on data:** the dashboard currently runs on simulated data from `scripts/generate-seed-data.js`, generated purely for the prototype demo — it is **not** real user data.

---

## 🕒 Work Timeline

**Before the event**
- Repository scaffolding & directory structure
- Basic API contract definition + README outline

**During the event**
- Full implementation: extension UI, service workers, Express routes, AI prompts, dashboard charts
- Groq API integration
- Polish & testing

---

## 📦 Third-Party APIs, Models & Libraries

- [Groq API](https://groq.com) — LLM inference
- [Chart.js](https://www.chartjs.org) — data visualization

---

<div align="center">
<sub>Built for ASYNC'26 · Team TechTonic</sub>
</div>