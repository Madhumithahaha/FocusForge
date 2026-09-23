// service-worker.js - Background script
console.log('FocusForge background service worker loaded.');

// TODO: Listen for messages from content scripts
// TODO: Communicate with the Express backend (POST /judge)

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'evaluateAttempt') {
        // Fetch call to http://localhost:3000/judge goes here
    }
});
