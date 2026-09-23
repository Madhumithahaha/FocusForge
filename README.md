# FocusForge

## Project Overview
FocusForge is an AI-powered digital-wellbeing tool that intervenes when a user attempts to access distracting websites. Instead of simply blocking access, it asks why the user wants to access the site, interprets the user's reason, and provides an appropriate short wellness intervention or controlled access.

## ASYNC'26 Track
**Track 2 — Wellness & Lifestyle**

## Problem
Traditional website blockers are rigid and often lead to users simply disabling them when they feel fatigued. They don't address the underlying reason *why* a user is distracted (e.g., burnout, boredom, stress).

## Proposed Solution
A system that acts as a mindful "bouncer". It evaluates the user's intent, energy levels, and rationale, granting short access or suggesting micro-wellness tasks (like stretching or hydrating) based on the context.

## How It Works
1. User attempts to visit a distracting site.
2. The Chrome Extension intercepts the request and overlays an intervention screen.
3. User inputs their energy level and excuse for visiting.
4. The extension sends this to the server for AI evaluation.
5. The server returns a verdict (deny, task, or allow).

## Architecture
See [Architecture Documentation](docs/architecture.md) for details on the data flow and system design.

## Technology Stack
- **Frontend**: HTML, CSS, JavaScript, Chrome Extension Manifest V3
- **Backend**: Node.js, Express
- **AI**: Groq API
- **Dashboard**: HTML, CSS, Chart.js

## Project Structure
- `/extension` - Chrome extension source code
- `/server` - Express backend and AI logic
- `/dashboard` - Analytics and metrics dashboard
- `/scripts` - Utilities for development (e.g., seed data)
- `/docs` - Project documentation

## Setup Instructions

### Environment Variables
1. Copy `.env.example` to `.env` in the `server` directory.
2. Add your Groq API key to `.env`.

### Running the Backend
1. `cd server`
2. `npm install`
3. `npm start` (Runs on http://localhost:3000)

### Loading the Chrome Extension
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the `extension` folder.

### Running the Dashboard
Open `dashboard/index.html` in your browser, or serve it using a simple HTTP server (e.g., `npx serve dashboard`).

## API Documentation
The core API contract is defined below:

- `POST /judge`: Evaluates a site access attempt.
- `GET /stats`: Returns attempt statistics.
- `POST /insight`: Generates a wellness insight.

## Privacy & Security
- API keys are never exposed to the client extension.
- We do not collect unnecessary webpage content.
- Data is kept locally/minimally on the server.
- The server retains control over final decisions.

## Data Disclosure
The dashboard currently uses simulated data generated via `/scripts/generate-seed-data.js` for demonstration purposes. This is strictly for the prototype presentation and does not represent real user data.

## Prior Work / Pre-Event Work
**Pre-Event Work:**
- Initial repository scaffolding, directory structure setup, and blank file creation.
- Basic API contract definition and README outline.

**Event Work:**
- All implementation logic (Extension UI, Service Workers, Backend Express routes, AI Prompts, Dashboard Charts).
- Integrating the Groq API.
- Polishing and testing the prototype.

## Third-Party APIs, Models, Libraries and Assets
- Groq API for LLM inference
- Chart.js for data visualization
