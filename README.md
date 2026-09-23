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

## 🚀 Setup Instructions

### 1. Environment Variables
```bash
cd server
cp .env.example .env
# add your Groq API key to .env
```

### 2. Run the Backend
```bash
cd server
npm install
npm start
# → runs on http://localhost:3000
```

### 3. Load the Chrome Extension
1. Open `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked** → select the `extension` folder

### 4. Run the Dashboard
```bash
npx serve dashboard
```
*(or just open `dashboard/index.html` directly in your browser)*

---

## 📡 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/judge` | Evaluates a site access attempt |
| `GET` | `/stats` | Returns attempt statistics |
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