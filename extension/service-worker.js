// service-worker.js - Background script
// This script runs in the background, independent of any specific webpage.
// It handles core extension events and acts as a middleman for API calls to our Express backend.

console.log('FocusForge: Background service worker loaded.');

// Listen for messages from our content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

    // Check if the message is the basic ping from our content script
    if (request.action === 'ping') {
        console.log('FocusForge: Received ping from content script on URL:', request.url);

        // Send a response back to the content script confirming communication
        sendResponse({ status: 'success', message: 'Pong from Service Worker!' });
    }

    // --- DEVELOPMENT / MOCK MODE CONFIGURATION ---
    const USE_MOCK_BACKEND = true; // Set to false to use the real backend
    const MOCK_VERDICT = 'allow'; // Options: 'deny', 'task', 'allow'

    const MOCK_RESPONSES = {
        deny: {
            verdict: "deny",
            need_category: "tired",
            excuse_strength: 8,
            minutes_granted: 0,
            micro_task: { type: "stretch", seconds: 10 },
            roast: "Your brain is asking for a break, not another scroll spiral.",
            distress_flag: false
        },
        task: {
            verdict: "task",
            need_category: "stressed",
            excuse_strength: 6,
            minutes_granted: 0,
            micro_task: { type: "breathing", seconds: 10 },
            roast: "The feed can wait. Your nervous system clearly has the meeting first.",
            distress_flag: false
        },
        allow: {
            verdict: "allow",
            need_category: "genuine",
            excuse_strength: 2,
            minutes_granted: 0.5,
            micro_task: { type: "none", seconds: 0 },
            roast: "",
            distress_flag: false
        }
    };
    // ---------------------------------------------

    if (request.action === 'submitAttempt') {
        if (USE_MOCK_BACKEND) {
            console.log('FocusForge: MOCK MODE Active - generating mock response for:', MOCK_VERDICT);
            // Simulate network delay
            setTimeout(() => {
                const mockData = MOCK_RESPONSES[MOCK_VERDICT] || MOCK_RESPONSES.deny;
                sendResponse({ success: true, data: mockData });
            }, 800);
            return true; // Indicates asynchronous response
        }

        const BACKEND_BASE_URL = 'http://localhost:3000';
        fetch(`${BACKEND_BASE_URL}/judge`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request.payload)
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                sendResponse({ success: true, data: data });
            })
            .catch(error => {
                console.error('FocusForge: fetch error:', error);
                sendResponse({ success: false, error: 'Failed to reach the backend.' });
            });
        return true; // Indicates asynchronous response
    }

    // Required for asynchronous responses in Manifest V3 if we do async work
    // return true; 
});

