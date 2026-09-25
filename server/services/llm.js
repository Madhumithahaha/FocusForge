const Groq = require('groq-sdk');
const bouncerPrompt = require('../prompts/bouncer-prompt');

let groq = null;
if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'your_groq_api_key_here') {
    try {
        groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    } catch (e) {
        console.warn('Groq client initialization failed, will use fallback:', e.message);
    }
}

// In-memory cache for insights
const insightCache = new Map();

function generateDeterministicInsight(stats) {
    if (!stats || stats.totalAttempts === 0) {
        return {
            fingerprint: "No activity data recorded yet. Once you begin browsing, FocusForge will detect patterns in when your energy, needs, and digital temptations intersect.",
            experiment: {
                observation: "Baseline attention calibration in progress — awaiting initial attempt signals.",
                hypothesis: "Tracking your next 3 distraction events will reveal your primary digital impulse triggers.",
                action: "Interact with the FocusForge bouncer check-in whenever visiting a blocked site.",
                metric: "Log 3 genuine check-in events across your next work sessions."
            }
        };
    }

    if (stats.isSmallSample || stats.totalAttempts < 4) {
        return {
            fingerprint: `Early fingerprint: Only ${stats.totalAttempts} attempt(s) recorded so far. Initial signals point toward activity around ${stats.peakWindow} with an average energy of ${stats.averageEnergy}/5. Keep using FocusForge to construct a fully reliable circadian attention profile.`,
            experiment: {
                observation: `Early clustering noted around ${stats.peakWindow} with primary trigger indicated as '${stats.mostCommonNeed}'.`,
                hypothesis: `Recording 3 more interventions will establish whether ${stats.mostCommonNeed} is a chronic fatigue habit or isolated variance.`,
                action: `Take a 60-second breathing pause before clicking through to ${stats.topSite || 'distracting sites'}.`,
                metric: `Log attempts during your next 2 active work days.`
            }
        };
    }

    // Dynamic, high-quality, 3-sentence deterministic narrative derived directly from actual numbers
    const topSitePct = stats.attemptsBySite && stats.attemptsBySite[0] ? stats.attemptsBySite[0].percentage : 35;
    const sentence1 = `Your attention pattern reveals a strong circadian friction window between ${stats.peakWindow}, with ${stats.topSite} acting as your primary diversion doorway (${topSitePct}% of attempts).`;
    const sentence2 = `Significantly, ${stats.denialRate}% of visits were intercepted because attempts coincided with depleted energy (averaging ${stats.averageEnergy} out of 5) sparked by a detected need for '${stats.mostCommonNeed}' rather than legitimate intent.`;
    const sentence3 = `FocusForge has preserved an estimated ${stats.estimatedMinutesReclaimed} minutes of cognitive bandwidth by breaking this recurring fatigue reflex before passive doomscrolling took hold.`;

    const fingerprint = `${sentence1} ${sentence2} ${sentence3}`;

    // Select tailored action based on detected need
    let action = "Step away from the screen for a 2-minute physical shoulder and neck stretch.";
    const needLower = (stats.mostCommonNeed || '').toLowerCase();
    if (needLower === 'tired') {
        action = "Full glass of cold water + 3-minute screen blackout to reset visual accommodation.";
    } else if (needLower === 'stressed') {
        action = "60-second physiological sigh breathing (two quick inhales through the nose, long sigh out through the mouth).";
    } else if (needLower === 'bored') {
        action = "2-minute physical reset: walk to a window or do 10 gentle torso twists before continuing.";
    } else if (needLower === 'avoiding') {
        action = "Smallest first step: open your editor/doc and set a non-negotiable 5-minute single-task focus timer.";
    } else if (needLower === 'genuine') {
        action = "Set an explicit 15-minute stopwatch before starting your research to avoid rabbit holes.";
    }

    const experiment = {
        observation: `${stats.peakWindow} distraction surge combined with low energy (${stats.averageEnergy}/5) and '${stats.mostCommonNeed}' as the dominant psychological trigger.`,
        hypothesis: `Replacing passive screen gratification during the ${stats.peakWindow} window with an immediate physical reset will reduce repeat distraction attempts by at least 35%.`,
        action: action,
        metric: `Attempts during ${stats.peakWindow} (Current baseline: ${Math.max(1, Math.round(stats.totalAttempts * 0.4))} attempts / 3 days).`
    };

    return { fingerprint, experiment };
}

function validateInsight(obj) {
    if (!obj || typeof obj !== 'object') return false;
    if (typeof obj.fingerprint !== 'string' || obj.fingerprint.trim().length < 20) return false;
    if (!obj.experiment || typeof obj.experiment !== 'object') return false;
    const { observation, hypothesis, action, metric } = obj.experiment;
    if (typeof observation !== 'string' || observation.trim().length < 5) return false;
    if (typeof hypothesis !== 'string' || hypothesis.trim().length < 5) return false;
    if (typeof action !== 'string' || action.trim().length < 5) return false;
    if (typeof metric !== 'string' || metric.trim().length < 5) return false;
    return true;
}

async function callGroqForInsight(stats) {
    if (!groq) return null;

    // Send ONLY computed statistics, never raw logs or browsing content!
    const statsSummary = {
        totalAttempts: stats.totalAttempts,
        peakWindow: stats.peakWindow,
        mostCommonNeed: stats.mostCommonNeed,
        averageEnergy: stats.averageEnergy,
        topSite: stats.topSite,
        denialRate: stats.denialRate,
        taskRate: stats.taskRate,
        allowRate: stats.allowRate,
        estimatedMinutesReclaimed: stats.estimatedMinutesReclaimed,
        isSmallSample: stats.isSmallSample
    };

    const prompt = `You are the FocusForge Behavioral Insight AI.
Analyze the following DETERMINISTIC attention statistics for a user:
${JSON.stringify(statsSummary, null, 2)}

CRITICAL RULES:
1. ONLY reference numbers and facts provided in the JSON above. Never invent or recalculate statistics.
2. Produce a 3-sentence fingerprint narrative in the "fingerprint" field explaining what the pattern shows (when, why, energy condition).
3. Produce one 3-day experiment with observation, hypothesis, action, and metric.
4. Output MUST be strictly valid JSON matching this exact structure:
{
  "fingerprint": "...",
  "experiment": {
    "observation": "...",
    "hypothesis": "...",
    "action": "...",
    "metric": "..."
  }
}
Do not include markdown codeblocks or any commentary outside the JSON object.`;

    const chatCompletion = await groq.chat.completions.create({
        messages: [
            { role: 'system', content: 'You are a precise behavioral analytics assistant. Output ONLY valid JSON.' },
            { role: 'user', content: prompt }
        ],
        model: 'llama3-8b-8192',
        temperature: 0.2,
        response_format: { type: 'json_object' }
    });

    const content = chatCompletion.choices[0]?.message?.content;
    if (!content) return null;
    return JSON.parse(content);
}

async function generateInsight(stats) {
    // Generate cache key based on source, total attempts, and peak window
    const cacheKey = `${stats.sourceFilter || 'all'}_${stats.totalAttempts}_${stats.peakWindow}_${stats.averageEnergy}_${stats.mostCommonNeed}`;
    if (insightCache.has(cacheKey)) {
        return insightCache.get(cacheKey);
    }

    let insight = null;

    // Attempt Groq LLM if configured
    if (groq) {
        try {
            insight = await callGroqForInsight(stats);
            if (!validateInsight(insight)) {
                console.warn('First Groq attempt invalid, retrying once...');
                insight = await callGroqForInsight(stats);
            }
        } catch (err) {
            console.warn('Groq insight generation encountered an error:', err.message);
        }
    }

    // Fallback if Groq unavailable or response invalid
    if (!validateInsight(insight)) {
        insight = generateDeterministicInsight(stats);
    }

    insightCache.set(cacheKey, insight);
    return insight;
}

async function evaluateAttempt(attemptData) {
    if (groq) {
        try {
            const prompt = `${bouncerPrompt}
Evaluate this attempt:
Site: ${attemptData.site}
Energy Level: ${attemptData.energy}/5
User Stated Reason: "${attemptData.excuse}"
Attempt Count Today: ${attemptData.attemptCount || 1}

Output JSON with:
{
  "verdict": "deny" | "task" | "allow",
  "need_category": "tired" | "bored" | "stressed" | "lonely" | "avoiding" | "genuine" | "other",
  "excuse_strength": 1-5,
  "minutes_granted": 0 | 5 | 10 | 15,
  "micro_task": null or { "type": "stretch" | "breathing" | "water", "seconds": 60, "title": "..." },
  "roast": "Empathetic mindful feedback"
}`;

            const chatCompletion = await groq.chat.completions.create({
                messages: [
                    { role: 'system', content: 'You are the FocusForge AI Bouncer. Respond in JSON only.' },
                    { role: 'user', content: prompt }
                ],
                model: 'llama3-8b-8192',
                temperature: 0.3,
                response_format: { type: 'json_object' }
            });

            const content = chatCompletion.choices[0]?.message?.content;
            if (content) {
                const parsed = JSON.parse(content);
                return parsed;
            }
        } catch (e) {
            console.warn('Groq evaluateAttempt failed, falling back to rule engine:', e.message);
        }
    }

    // Deterministic rule engine fallback
    const energy = Number(attemptData.energy) || 2;
    const excuse = (attemptData.excuse || '').toLowerCase();
    
    let need = 'other';
    if (excuse.includes('tired') || excuse.includes('exhaust') || excuse.includes('sleep') || energy <= 1) need = 'tired';
    else if (excuse.includes('bore') || excuse.includes('kill time') || excuse.includes('distract')) need = 'bored';
    else if (excuse.includes('stress') || excuse.includes('panic') || excuse.includes('anxious') || excuse.includes('overwhelm')) need = 'stressed';
    else if (excuse.includes('put off') || excuse.includes('procrastinat') || excuse.includes('dread')) need = 'avoiding';
    else if (excuse.includes('learn') || excuse.includes('doc') || excuse.includes('tutorial') || excuse.includes('work')) need = 'genuine';

    if (need === 'genuine' && energy >= 3) {
        return {
            verdict: "allow",
            need_category: need,
            excuse_strength: 4,
            minutes_granted: 15,
            micro_task: null,
            roast: "Legitimate learning goal detected. 15 focused minutes granted."
        };
    } else if (need === 'stressed' || (energy === 2 && need === 'tired')) {
        return {
            verdict: "task",
            need_category: need,
            excuse_strength: 2,
            minutes_granted: 5,
            micro_task: {
                type: need === 'stressed' ? "breathing" : "stretch",
                seconds: 60,
                title: need === 'stressed' ? "60-Second Physiological Sigh" : "2-Minute Neck & Eye Reset"
            },
            roast: "High cognitive tension detected. Reset your body before you decide."
        };
    } else {
        return {
            verdict: "deny",
            need_category: need,
            excuse_strength: 1,
            minutes_granted: 0,
            micro_task: null,
            roast: "Low energy detected. Mindless scrolling will deepen fatigue, not cure it."
        };
    }
}

module.exports = {
    evaluateAttempt,
    generateInsight,
    generateDeterministicInsight
};
