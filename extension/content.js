// content.js - Injected directly into the target websites (e.g., YouTube, Instagram)
// This script has access to the webpage's DOM.

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

    chrome.storage.local.get(['ff_access_grant'], (result) => {
        const grants = result.ff_access_grant || {};
        const grant = grants[currentSite];
        if (grant && grant.accessGranted && grant.expiresAt > Date.now()) {
            console.log('FocusForge: Access is currently granted until', new Date(grant.expiresAt));
            
            if (typeof createFloatingTimer === 'function') {
                createFloatingTimer(grant.expiresAt, currentSite);
            }

            // Resumed grant (reload / navigation): re-arm the one-time on-task check.
            scheduleComplianceCheck(currentSite, grant);
            
            if (!window.ff_expiration_timer) {
                const timeRemaining = grant.expiresAt - Date.now();
                window.ff_expiration_timer = setTimeout(() => {
                    console.log('FocusForge: Access grant expired. Re-showing intervention.');
                    window.ff_expiration_timer = null;
                    chrome.storage.local.get(['ff_access_grant'], (res) => {
                        const st = res.ff_access_grant || {};
                        delete st[currentSite];
                        chrome.storage.local.set({ ff_access_grant: st }, () => {
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


// ---------------------------------------------------------------------------
// On-task check (mid-grant compliance verification)
//
// When a reason earns a short window of access, we check ONCE, roughly half
// way through the remaining time, whether what the user is actually viewing
// still matches the reason they gave. Design rules:
//   - Privacy: only a short text signal (video title / channel / caption,
//     max 300 chars) is read, sent to the local backend, and never stored.
//   - One check per grant (persisted as grant.complianceChecked), so
//     reloads / SPA navigation can't cause repeated pestering.
//   - Fails open: no signal, backend down, or any error => no nudge.
//   - A soft nudge, never a hard re-lock: the user decides.
// ---------------------------------------------------------------------------

const FF_MIN_REMAINING_FOR_CHECK_MS = 90 * 1000;
const FF_GENERIC_TITLES = ['youtube', 'instagram', ''];

function ffCurrentSiteKey() {
    const host = window.location.hostname;
    if (host.includes('youtube.com')) return 'youtube';
    if (host.includes('instagram.com')) return 'instagram';
    return host;
}

function ffText(selector) {
    const el = document.querySelector(selector);
    return el && el.textContent ? el.textContent.replace(/\s+/g, ' ').trim() : '';
}

// Short, low-sensitivity description of what is on screen right now.
function getContentSignal(site) {
    let signal = '';
    try {
        if (site === 'youtube') {
            const title = ffText('ytd-watch-metadata h1') || ffText('h1.ytd-watch-metadata') ||
                (document.title || '').replace(/^\(\d+\)\s*/, '').replace(/\s*-\s*YouTube$/i, '');
            const channel = ffText('ytd-watch-metadata ytd-channel-name a') || ffText('#owner #channel-name a');
            signal = channel && title ? `${title} (channel: ${channel})` : title;
        } else if (site === 'instagram') {
            const meta = document.querySelector('meta[property="og:title"]');
            signal = ffText('article h1') || (meta && meta.getAttribute('content')) ||
                (document.title || '').replace(/\s*[•|-]\s*Instagram.*$/i, '');
        }
    } catch (e) {
        signal = '';
    }
    signal = (signal || '').replace(/\s+/g, ' ').trim().slice(0, 300);
    return FF_GENERIC_TITLES.includes(signal.toLowerCase()) ? '' : signal;
}

function scheduleComplianceCheck(site, grant) {
    if (window.ff_compliance_timer) return; // already scheduled in this page
    if (!grant || !grant.accessGranted || !grant.excuse || grant.complianceChecked) return;

    const remaining = grant.expiresAt - Date.now();
    if (remaining < FF_MIN_REMAINING_FOR_CHECK_MS) return; // too short to be worth checking

    window.ff_compliance_timer = setTimeout(() => {
        window.ff_compliance_timer = null;
        runComplianceCheck(site);
    }, Math.round(remaining * 0.5));
}

function runComplianceCheck(site) {
    chrome.storage.local.get(['ff_access_grant'], (result) => {
        const grants = result.ff_access_grant || {};
        const grant = grants[site];
        if (!grant || !grant.accessGranted || grant.expiresAt <= Date.now() || grant.complianceChecked) return;

        // Mark first: guarantees at most one check per grant, whatever happens next.
        grant.complianceChecked = true;
        chrome.storage.local.set({ ff_access_grant: grants }, () => {
            const observedContent = getContentSignal(site);
            if (!observedContent) return; // nothing informative to compare — fail open

            const payload = { excuse: grant.excuse, observedContent, platform: site };
            if (Number.isInteger(grant.energy)) payload.energy = grant.energy;
            if (grant.need) payload.need = grant.need;

            chrome.runtime.sendMessage({ action: 'verifyAttempt', payload }, (response) => {
                if (chrome.runtime.lastError || !response || !response.success) return;
                const data = response.data;
                if (data && data.success && data.onTask === false) {
                    showComplianceNudge(site, data.message);
                }
            });
        });
    });
}

function showComplianceNudge(site, message) {
    if (document.getElementById('ff-nudge')) return;

    const nudge = document.createElement('div');
    nudge.id = 'ff-nudge';
    nudge.className = 'ff-nudge';

    const title = document.createElement('p');
    title.className = 'ff-nudge-title';
    title.textContent = 'Quick check-in';

    const text = document.createElement('p');
    text.className = 'ff-nudge-text';
    text.textContent = message || 'This might not be what you came here for. Still on track?';

    const actions = document.createElement('div');
    actions.className = 'ff-nudge-actions';

    const keepBtn = document.createElement('button');
    keepBtn.className = 'ff-nudge-btn ff-nudge-btn-secondary';
    keepBtn.textContent = "Yes, I'm on track";
    keepBtn.addEventListener('click', () => nudge.remove());

    const stopBtn = document.createElement('button');
    stopBtn.className = 'ff-nudge-btn ff-nudge-btn-primary';
    stopBtn.textContent = 'End session now';
    stopBtn.addEventListener('click', () => {
        nudge.remove();
        if (window.ff_expiration_timer) {
            clearTimeout(window.ff_expiration_timer);
            window.ff_expiration_timer = null;
        }
        if (typeof removeFloatingTimer === 'function') removeFloatingTimer();
        chrome.storage.local.get(['ff_access_grant'], (res) => {
            const st = res.ff_access_grant || {};
            delete st[site];
            chrome.storage.local.set({ ff_access_grant: st }, () => {
                const root = document.getElementById('ff-overlay-root');
                if (root) root.remove();
                showOverlay();
            });
        });
    });

    actions.appendChild(keepBtn);
    actions.appendChild(stopBtn);
    nudge.appendChild(title);
    nudge.appendChild(text);
    nudge.appendChild(actions);
    document.body.appendChild(nudge);
}
