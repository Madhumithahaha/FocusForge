const http = require('http');

const cases = [
  { energy: 2, excuse: 'I am so tired and exhausted', requestedMinutes: 5, expectedNeed: 'tired' },
  { energy: 4, excuse: 'I am bored and have nothing to do', requestedMinutes: 5, expectedNeed: 'bored' },
  { energy: 4, excuse: 'I need to check a legitimate email from my boss', requestedMinutes: 5, expectedNeed: 'genuine' },
  { energy: 1, excuse: 'I am very stressed and overwhelmed', requestedMinutes: 5, expectedNeed: 'stressed' }
];

async function postJudge(payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: '/judge',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    }, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => resolve(JSON.parse(body)));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function getHealth() {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: '/health',
      method: 'GET'
    }, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => resolve(JSON.parse(body)));
    });
    req.on('error', reject);
    req.end();
  });
}

async function run() {
  console.log('--- GET /health ---');
  console.log(await getHealth());

  for (const c of cases) {
    console.log(`\n--- POST /judge (Initial: ${c.expectedNeed}) ---`);
    const res1 = await postJudge({
      energy: c.energy,
      excuse: c.excuse,
      requestedMinutes: c.requestedMinutes
    });
    console.log('Response:', res1);

    if (res1.status === 'question') {
      console.log(`\n--- POST /judge (Follow-up: ${c.expectedNeed}) ---`);
      const res2 = await postJudge({
        energy: c.energy,
        excuse: c.excuse,
        requestedMinutes: c.requestedMinutes,
        messages: [
          { role: 'assistant', content: res1.question },
          { role: 'user', content: 'Here is some follow up.' }
        ]
      });
      console.log('Response:', res2);
    }
  }
}

run().catch(console.error);
