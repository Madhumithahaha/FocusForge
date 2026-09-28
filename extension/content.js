// content.js - Injected directly into the target websites (e.g., YouTube, Instagram)
// This script has access to the webpage's DOM.

function isExtensionContextValid() {
    try {
        if (!chrome || !chrome.runtime || !chrome.runtime.id) return false;
        return true;
    } catch (e) {
        return false;
    }
}

function safeStorageGet(keys, callback) {
    try {
        if (!isExtensionContextValid()) return;
        chrome.storage.local.get(keys, (res) => {
            try {
                if (!isExtensionContextValid()) return;
                if (chrome.runtime.lastError) return;
                callback(res);
            } catch (e) {}
        });
    } catch (e) {}
}

function safeStorageSet(data, callback) {
    try {
        if (!isExtensionContextValid()) return;
        chrome.storage.local.set(data, () => {
            try {
                if (!isExtensionContextValid()) return;
                if (chrome.runtime.lastError) return;
                if (callback) callback();
            } catch (e) {}
        });
    } catch (e) {}
}

function safeSendMessage(msg, callback) {
    try {
        if (!isExtensionContextValid()) {
            if (callback) callback({ success: false, error: 'Invalid context' });
            return;
        }
        chrome.runtime.sendMessage(msg, (response) => {
            try {
                if (!isExtensionContextValid()) {
                    if (callback) callback({ success: false, error: 'Invalid context' });
                    return;
                }
                if (chrome.runtime.lastError) {
                    if (callback) callback({ success: false, error: chrome.runtime.lastError.message });
                    return;
                }
                if (callback) callback(response);
            } catch (e) {}
        });
    } catch (e) {
        if (callback) callback({ success: false, error: 'Invalid context' });
    }
}

console.log('FocusForge content script loaded');
console.log('FocusForge: Content script executing on ' + window.location.hostname);

// Trigger the overlay to display safely
function safeInitOverlay() {
    console.log('FocusForge: safeInitOverlay called');
    
    let currentSite = window.location.hostname;
    if (currentSite.includes('youtube.com')) {
        currentSite = 'youtube';
    } else if (currentSite.includes('instagram.com')) {
        currentSite = 'instagram';
    }

    safeStorageGet(['ff_access_grant'], (result) => {
        const grants = result.ff_access_grant || {};
        const grant = grants[currentSite];
        if (grant && grant.accessGranted && grant.expiresAt > Date.now()) {
            console.log('FocusForge: Access is currently granted until', new Date(grant.expiresAt));
            
            if (typeof createFloatingTimer === 'function') {
                createFloatingTimer(grant.expiresAt, currentSite);
            }
            
            if (!window.ff_expiration_timer) {
                const timeRemaining = grant.expiresAt - Date.now();
                window.ff_expiration_timer = setTimeout(() => {
                    console.log('FocusForge: Access grant expired. Re-showing intervention.');
                    window.ff_expiration_timer = null;
                    safeStorageGet(['ff_access_grant'], (res) => {
                        const st = res.ff_access_grant || {};
                        delete st[currentSite];
                        safeStorageSet({ ff_access_grant: st }, () => {
                            showOverlay();
                        });
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
safeSendMessage({ action: 'ping', url: window.location.href }, (response) => {
    if (!response || response.error) {
        console.warn('FocusForge: Could not communicate with service worker:', response && response.error);
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
