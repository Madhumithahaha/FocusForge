# Architecture

## Data Flow
1. **Client (Extension)**: Intercepts web requests. Collects user input (energy, excuse).
2. **Server (Express)**: Exposes REST API. Receives attempts.
3. **LLM Service (Groq)**: Analyzes attempt context based on system prompts.
4. **Data Storage**: Local JSON file (`attempts.json`) for prototype simplicity.

## Modules
- **Extension**: Content scripts, Service Worker (Manifest V3), HTML/CSS overlays.
- **Server**: Express.js, Routing, Validation, LLM Integration.
- **Dashboard**: Static HTML/JS using Chart.js to visualize analytics data.
