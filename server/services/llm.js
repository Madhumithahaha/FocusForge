// const Groq = require('groq-sdk');
// const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const bouncerPrompt = require('../prompts/bouncer-prompt');

async function evaluateAttempt(attemptData) {
    // TODO: Implement actual Groq API call here
    // Dummy response for scaffolding
    return {
        verdict: "deny",
        need_category: "tired",
        excuse_strength: 3,
        minutes_granted: 0,
        micro_task: {
            type: "stretch",
            seconds: 60
        },
        roast: "You said you were tired. YouTube won't help you sleep.",
        distress_flag: false
    };
}

async function generateInsight(stats) {
    // TODO: Implement actual Groq API call here
    return "You seem to try accessing distracting sites mostly when you are bored in the afternoon.";
}

module.exports = {
    evaluateAttempt,
    generateInsight
};
