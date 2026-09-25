// content.js - Injected directly into the target websites (e.g., YouTube, Instagram)
// This script has access to the webpage's DOM.

console.log('FocusForge content script loaded');
console.log('FocusForge: Content script executing on ' + window.location.hostname);

// Trigger the overlay to display safely
function safeInitOverlay() {
    console.log('FocusForge: safeInitOverlay called');
    
    chrome.storage.local.get(['ff_access_grant'], (result) => {
        const grant = result.ff_access_grant;
        if (grant && grant.accessGranted && grant.expiresAt > Date.now()) {
            console.log('FocusForge: Access is currently granted until', new Date(grant.expiresAt));
            
            if (typeof createFloatingTimer === 'function') {
                createFloatingTimer(grant.expiresAt);
            }
            
            if (!window.ff_expiration_timer) {
                const timeRemaining = grant.expiresAt - Date.now();
                window.ff_expiration_timer = setTimeout(() => {
                    console.log('FocusForge: Access grant expired. Re-showing intervention.');
                    window.ff_expiration_timer = null;
                    chrome.storage.local.remove(['ff_access_grant'], () => {
                        showOverlay();
                    });
                }, timeRemaining);
            }
            return;
        }
        showOverlay();
    });
}

function showOverlay() {
    try {
        if (typeof initFocusForgeOverlay === 'function') {
            console.log('FocusForge: Calling initFocusForgeOverlay');
            initFocusForgeOverlay();
        } else {
            console.error('FocusForge: ERROR - initFocusForgeOverlay function is not defined!');
        }
    } catch (e) {
        console.error('FocusForge: ERROR calling initFocusForgeOverlay:', e);
    }
}

// Send a basic ping message to the background service worker to verify communication
chrome.runtime.sendMessage({ action: 'ping', url: window.location.href }, (response) => {
    if (chrome.runtime.lastError) {
        console.warn('FocusForge: Could not communicate with service worker:', chrome.runtime.lastError.message);
    } else {
        console.log('FocusForge: Received response from service worker:', response);
        // ONLY call overlay initialization after confirming service worker communication
        console.log('FocusForge: Initial load triggering safeInitOverlay...');
        safeInitOverlay();
    }
});

// Handle Single Page Application (SPA) navigation
// Sites like YouTube change the URL without a full page reload.
let lastUrl = window.location.href;
setInterval(() => {
    if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        console.log('FocusForge: SPA navigation detected. URL changed to ' + lastUrl);
        safeInitOverlay();
    }
}, 1000);
