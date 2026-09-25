// overlay.js - Handles the UI for the intervention screen
// This script will run in the context of the webpage alongside content.js.

function initFocusForgeOverlay() {
    console.log('FocusForge: initFocusForgeOverlay entered');
    try {
        console.log('FocusForge: Initializing overlay...');

        // Prevent multiple injections
        if (document.getElementById('ff-overlay-root')) {
            console.log('FocusForge: Overlay already exists. Skipping injection.');
            return;
        }

        if (!document.body) {
            console.warn('FocusForge: document.body is not ready yet. Retrying in 100ms...');
            setTimeout(initFocusForgeOverlay, 100);
            return;
        }

        console.log('FocusForge: Creating overlay');

        // Create the overlay container
        const overlayRoot = document.createElement('div');
        overlayRoot.id = 'ff-overlay-root';
        overlayRoot.className = 'ff-overlay';

    // Inject the HTML structure using ff- prefix for CSS isolation
    overlayRoot.innerHTML = `
        <div class="ff-card">
            <div class="ff-header">
                <span class="ff-title">FocusForge</span>
                <button id="ff-close-btn" class="ff-close-btn" title="Dismiss">&times;</button>
            </div>
            <div class="ff-body">
                <p class="ff-message">We noticed you're about to enter a distracting site. Let's take a mindful pause.</p>
                
                <div class="ff-energy-section">
                    <label class="ff-label">Energy Level (1 = Low, 5 = High)</label>
                    <div class="ff-energy-selector" id="ff-energy-selector">
                        <button class="ff-energy-btn" data-value="1">1</button>
                        <button class="ff-energy-btn" data-value="2">2</button>
                        <button class="ff-energy-btn" data-value="3">3</button>
                        <button class="ff-energy-btn" data-value="4">4</button>
                        <button class="ff-energy-btn" data-value="5">5</button>
                    </div>
                </div>
                
                <div class="ff-excuse-section">
                    <label class="ff-label">Why do you want to open this right now?</label>
                    <textarea id="ff-excuse-input" class="ff-textarea" placeholder="e.g., I'm tired and need a break..."></textarea>
                </div>
                
                <div id="ff-error-msg" style="color: #ff4444; font-size: 14px; margin-bottom: 12px; display: none;"></div>
                <button id="ff-continue-btn" class="ff-primary-btn">Continue</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlayRoot);
    console.log('FocusForge: Overlay appended to DOM');

    // Verify it actually exists
    if (document.getElementById('ff-overlay-root')) {
        console.log('FocusForge: Verified overlay exists in DOM');
    } else {
        console.error('FocusForge: Overlay was appended but cannot be found in DOM!');
    }

    // --- State variables ---
    let selectedEnergy = null;
    let currentTimerId = null;

    // --- Event Listeners ---

    // Handle close button
    document.getElementById('ff-close-btn').addEventListener('click', () => {
        if (currentTimerId) {
            clearInterval(currentTimerId);
            currentTimerId = null;
        }
        overlayRoot.remove();
        console.log('FocusForge: Overlay dismissed by user.');
    });

    // Handle energy selection
    const energyButtons = document.querySelectorAll('.ff-energy-btn');
    energyButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Remove active class from all
            energyButtons.forEach(b => b.classList.remove('active'));
            // Add active class to clicked
            e.target.classList.add('active');
            // Store value
            selectedEnergy = parseInt(e.target.getAttribute('data-value'), 10);
        });
    });

    // Handle Continue button
    document.getElementById('ff-continue-btn').addEventListener('click', () => {
        const input = collectInput();

        // Energy Validation
        if (!input.energy || input.energy < 1 || input.energy > 5) {
            alert('Please select a valid energy level (1-5) before continuing.');
            return;
        }
        
        // Excuse Validation
        if (!input.excuse) {
            alert('Please provide a reason for wanting to open this site.');
            return;
        }

        if (input.excuse.length > 500) {
            alert('Your reason is too long. Please keep it under 500 characters.');
            return;
        }

        const attemptData = buildAttemptData(input);
        sendToBackend(attemptData);
    });

    function collectInput() {
        const excuseText = document.getElementById('ff-excuse-input').value.trim();
        return { energy: selectedEnergy, excuse: excuseText };
    }

    function buildAttemptData(input) {
        let site = window.location.hostname;
        if (site.includes('youtube.com')) {
            site = 'youtube';
        } else if (site.includes('instagram.com')) {
            site = 'instagram';
        }

        let attemptCount = parseInt(sessionStorage.getItem('ff_attemptCount') || '0', 10);
        attemptCount++;
        sessionStorage.setItem('ff_attemptCount', attemptCount.toString());

        return {
            site: site,
            energy: input.energy,
            excuse: input.excuse,
            timestamp: new Date().toISOString(),
            attemptCount: attemptCount
        };
    }

    function sendToBackend(attemptData) {
        console.log('FocusForge: Sending attempt data to backend:', attemptData);
        
        const continueBtn = document.getElementById('ff-continue-btn');
        const errorMsg = document.getElementById('ff-error-msg');
        const originalBtnText = continueBtn.textContent;
        
        continueBtn.disabled = true;
        continueBtn.textContent = 'Checking your excuse...';
        errorMsg.style.display = 'none';

        chrome.runtime.sendMessage({ action: 'submitAttempt', payload: attemptData }, (response) => {
            if (chrome.runtime.lastError || !response || !response.success) {
                console.error('FocusForge: Backend submission failed', chrome.runtime.lastError || (response && response.error));
                errorMsg.textContent = 'Unable to reach the judge. Please try again.';
                errorMsg.style.display = 'block';
                
                continueBtn.disabled = false;
                continueBtn.textContent = originalBtnText;
                return;
            }

            console.log('FocusForge: Received verdict:', response.data);
            
            const verdictData = response.data;
            if (!verdictData || typeof verdictData.verdict !== 'string') {
                console.error('FocusForge: Invalid response from backend', verdictData);
                errorMsg.textContent = 'Received an invalid response from the judge. Please try again.';
                errorMsg.style.display = 'block';
                
                continueBtn.disabled = false;
                continueBtn.textContent = originalBtnText;
                return;
            }
            
            renderVerdict(verdictData);
        });
    }

    function formatTaskInfo(task) {
        if (!task) return 'Take a break';
        const mapping = {
            'breathing': 'breathing exercise',
            'water': 'water break',
            'stretch': 'stretch',
            'eye_rest': 'eye rest',
            'walk': 'short walk',
            'first_step': 'first step'
        };
        const taskName = mapping[task.type] || 'break';
        
        if (task.seconds >= 60) {
            return `${Math.round(task.seconds / 60)}-minute ${taskName}`;
        }
        return `${task.seconds}-second ${taskName}`;
    }

    function renderTaskRunning(verdictData) {
        if (currentTimerId) {
            clearInterval(currentTimerId);
            currentTimerId = null;
        }

        const body = document.querySelector('.ff-body');
        body.innerHTML = '';
        
        const task = verdictData.micro_task;
        const seconds = task ? task.seconds : 60;
        let remaining = seconds;
        
        const title = document.createElement('h2');
        title.className = 'ff-title';
        title.style.marginBottom = '15px';
        title.textContent = formatTaskInfo(task);
        
        const countdownLabel = document.createElement('p');
        countdownLabel.className = 'ff-message';
        countdownLabel.textContent = 'Time remaining';
        
        const countdownTimer = document.createElement('h1');
        countdownTimer.className = 'ff-countdown-large';
        countdownTimer.style.margin = '10px 0 20px 0';
        
        const instructionLabel = document.createElement('p');
        instructionLabel.className = 'ff-message';
        instructionLabel.textContent = 'Complete the reset before continuing.';
        
        const formatTime = (s) => {
            const m = Math.floor(s / 60).toString().padStart(2, '0');
            const sec = (s % 60).toString().padStart(2, '0');
            return `${m}:${sec}`;
        };
        
        countdownTimer.textContent = formatTime(remaining);
        
        body.appendChild(title);
        body.appendChild(countdownLabel);
        body.appendChild(countdownTimer);
        body.appendChild(instructionLabel);
        
        currentTimerId = setInterval(() => {
            remaining--;
            if (remaining <= 0) {
                remaining = 0;
                clearInterval(currentTimerId);
                currentTimerId = null;
                renderTaskComplete();
            }
            countdownTimer.textContent = formatTime(remaining);
        }, 1000);
    }

    function renderTaskComplete() {
        const body = document.querySelector('.ff-body');
        body.innerHTML = '';
        
        const title = document.createElement('h2');
        title.className = 'ff-title';
        title.style.marginBottom = '15px';
        title.textContent = 'Reset complete.';
        
        const message = document.createElement('p');
        message.className = 'ff-message';
        message.style.marginBottom = '20px';
        message.textContent = 'Nice. Your pause is done.';
        
        const continueBtn = document.createElement('button');
        continueBtn.className = 'ff-primary-btn';
        continueBtn.textContent = 'Continue';
        continueBtn.addEventListener('click', () => {
            const root = document.getElementById('ff-overlay-root');
            if (root) {
                root.remove();
                initFocusForgeOverlay();
            }
        });
        
        body.appendChild(title);
        body.appendChild(message);
        body.appendChild(continueBtn);
    }

    function renderVerdict(verdictData) {
        const body = document.querySelector('.ff-body');
        body.innerHTML = ''; // safely clear the input state
        
        if (verdictData.distress_flag) {
            const title = document.createElement('h2');
            title.className = 'ff-title';
            title.style.marginBottom = '15px';
            title.textContent = 'Take a moment before continuing.';
            
            const message = document.createElement('p');
            message.className = 'ff-message';
            message.textContent = "You don't have to handle everything at once. Consider reaching out to someone you trust.";
            
            const closeBtn = document.createElement('button');
            closeBtn.className = 'ff-primary-btn';
            closeBtn.style.marginTop = '20px';
            closeBtn.textContent = 'Close';
            closeBtn.addEventListener('click', () => {
                const root = document.getElementById('ff-overlay-root');
                if (root) root.remove();
            });
            
            body.appendChild(title);
            body.appendChild(message);
            body.appendChild(closeBtn);
            return;
        }

        if (verdictData.verdict === 'deny') {
            const title = document.createElement('h2');
            title.className = 'ff-title';
            title.style.marginBottom = '15px';
            title.textContent = 'Maybe this is a reset moment.';
            
            const roast = document.createElement('p');
            roast.className = 'ff-message';
            roast.style.fontStyle = 'italic';
            roast.style.marginBottom = '15px';
            roast.textContent = `"${verdictData.roast}"`;
            
            const taskInfo = document.createElement('div');
            taskInfo.style.marginBottom = '20px';
            taskInfo.style.fontWeight = 'bold';
            taskInfo.textContent = formatTaskInfo(verdictData.micro_task);
            
            const startBtn = document.createElement('button');
            startBtn.className = 'ff-primary-btn';
            startBtn.textContent = 'Start reset';
            startBtn.addEventListener('click', () => {
                startBtn.disabled = true;
                renderTaskRunning(verdictData);
            });
            
            body.appendChild(title);
            body.appendChild(roast);
            body.appendChild(taskInfo);
            body.appendChild(startBtn);
        } 
        else if (verdictData.verdict === 'task') {
            const title = document.createElement('h2');
            title.className = 'ff-title';
            title.style.marginBottom = '15px';
            title.textContent = `Take a ${formatTaskInfo(verdictData.micro_task)}.`;
            
            const roast = document.createElement('p');
            roast.className = 'ff-message';
            roast.style.fontStyle = 'italic';
            roast.style.marginBottom = '15px';
            roast.textContent = `"${verdictData.roast}"`;
            
            const startBtn = document.createElement('button');
            startBtn.className = 'ff-primary-btn';
            startBtn.textContent = 'Start';
            startBtn.addEventListener('click', () => {
                startBtn.disabled = true;
                renderTaskRunning(verdictData);
            });
            
            body.appendChild(title);
            body.appendChild(roast);
            body.appendChild(startBtn);
        }
        else if (verdictData.verdict === 'allow') {
            const title = document.createElement('h2');
            title.className = 'ff-title';
            title.style.marginBottom = '12px';
            title.textContent = 'Access granted';
            
            const mins = verdictData.minutes_granted || 5;
            
            const message = document.createElement('p');
            message.className = 'ff-message';
            message.textContent = 'You have a little time. Use it intentionally.';
            
            const countdownTimer = document.createElement('div');
            countdownTimer.className = 'ff-countdown-large';
            
            const remainingLabel = document.createElement('p');
            remainingLabel.className = 'ff-message';
            remainingLabel.style.marginTop = '-15px';
            remainingLabel.textContent = 'remaining';
            
            const continueBtn = document.createElement('button');
            continueBtn.className = 'ff-primary-btn';
            continueBtn.textContent = 'Continue';
            continueBtn.addEventListener('click', () => {
                const root = document.getElementById('ff-overlay-root');
                if (root) root.remove();
                
                chrome.storage.local.get(['ff_access_grant'], (result) => {
                    const grant = result.ff_access_grant;
                    if (grant && grant.accessGranted && grant.expiresAt > Date.now()) {
                        createFloatingTimer(grant.expiresAt);
                    }
                });
            });
            
            body.appendChild(title);
            body.appendChild(message);
            body.appendChild(countdownTimer);
            body.appendChild(remainingLabel);
            body.appendChild(continueBtn);

            chrome.storage.local.get(['ff_access_grant'], (result) => {
                let expiresAt;
                const existingGrant = result.ff_access_grant;

                // Resume existing or create new grant
                if (existingGrant && existingGrant.accessGranted && existingGrant.expiresAt > Date.now()) {
                    expiresAt = existingGrant.expiresAt;
                } else {
                    expiresAt = Date.now() + (mins * 60 * 1000);
                    chrome.storage.local.set({
                        ff_access_grant: {
                            accessGranted: true,
                            expiresAt: expiresAt
                        }
                    });
                }

                if (currentTimerId) {
                    clearInterval(currentTimerId);
                    currentTimerId = null;
                }
                
                const updateDisplay = () => {
                    const remainingMs = expiresAt - Date.now();
                    if (remainingMs <= 0) {
                        countdownTimer.textContent = "00:00";
                        if (currentTimerId) clearInterval(currentTimerId);
                        currentTimerId = null;
                        
                        // Expire access and re-trigger intervention
                        chrome.storage.local.remove(['ff_access_grant'], () => {
                            const root = document.getElementById('ff-overlay-root');
                            if (root) root.remove();
                            initFocusForgeOverlay();
                        });
                        return;
                    }

                    const s = Math.floor(remainingMs / 1000);
                    const mStr = Math.floor(s / 60).toString().padStart(2, '0');
                    const sStr = (s % 60).toString().padStart(2, '0');
                    countdownTimer.textContent = `${mStr}:${sStr}`;
                };
                
                updateDisplay();
                currentTimerId = setInterval(updateDisplay, 1000);
            });
        }
    }
    } catch (e) {
        console.error('FocusForge: FATAL ERROR in initFocusForgeOverlay:', e);
    }
}

let ff_floating_interval = null;

function createFloatingTimer(expiresAt) {
    if (document.getElementById('ff-floating-timer')) {
        return; // Already exists
    }

    const timerRoot = document.createElement('div');
    timerRoot.id = 'ff-floating-timer';
    timerRoot.className = 'ff-floating-timer';
    
    timerRoot.innerHTML = `
        <p class="ff-floating-timer-title">FocusForge</p>
        <p class="ff-floating-timer-time" id="ff-floating-time-display">00:00</p>
        <p class="ff-floating-timer-label">remaining</p>
    `;
    
    document.body.appendChild(timerRoot);
    
    const display = document.getElementById('ff-floating-time-display');
    
    if (ff_floating_interval) clearInterval(ff_floating_interval);
    
    const updateDisplay = () => {
        const remainingMs = expiresAt - Date.now();
        if (remainingMs <= 0) {
            clearInterval(ff_floating_interval);
            ff_floating_interval = null;
            removeFloatingTimer();
            // Trigger intervention directly if overlay not open
            if (!document.getElementById('ff-overlay-root')) {
                chrome.storage.local.remove(['ff_access_grant'], () => {
                    initFocusForgeOverlay();
                });
            }
            return;
        }

        const s = Math.floor(remainingMs / 1000);
        const mStr = Math.floor(s / 60).toString().padStart(2, '0');
        const sStr = (s % 60).toString().padStart(2, '0');
        if (display) display.textContent = `${mStr}:${sStr}`;
    };
    
    updateDisplay();
    ff_floating_interval = setInterval(updateDisplay, 1000);
}

function removeFloatingTimer() {
    const el = document.getElementById('ff-floating-timer');
    if (el) el.remove();
    if (ff_floating_interval) {
        clearInterval(ff_floating_interval);
        ff_floating_interval = null;
    }
}


