// Hardcoded rules or thresholds that override LLM if necessary
// e.g., if attemptCount > 5, auto-deny

function checkHardRules(attemptData) {
    if (attemptData.attemptCount > 5) {
        return { action: 'deny', reason: 'Too many attempts' };
    }
    return null;
}

module.exports = {
    checkHardRules
};
