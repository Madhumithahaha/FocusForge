const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../server/data/attempts.json');

const sampleAttempts = [
    {
        site: "youtube.com",
        energy: 2,
        excuse: "I am tired",
        attemptCount: 1,
        timestamp: new Date().toISOString()
    }
];

fs.writeFileSync(dataPath, JSON.stringify(sampleAttempts, null, 2));
console.log('Seed data generated at', dataPath);
