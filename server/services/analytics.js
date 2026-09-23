const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../data/attempts.json');

function getStats() {
    // TODO: Read from data/attempts.json and aggregate statistics
    return {
        total_attempts: 0,
        verdict_breakdown: { deny: 0, task: 0, allow: 0 },
        // ...
    };
}

module.exports = {
    getStats
};
