'use strict';

const express = require('express');
const config = require('./config');
const { applySecurity, requestLogger, notFound, errorHandler } = require('./middleware/security');
const judgeRoutes = require('./routes/judge');
const statsRoutes = require('./routes/stats');

const app = express();

applySecurity(app);
app.use(requestLogger);

// Health endpoint (Task 2 contract — exact shape required).
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'FocusForge backend is running',
    mockMode: config.mockMode,
  });
});

app.use('/judge', judgeRoutes);
app.use('/stats', statsRoutes);

// 404 + centralized errors (must be last).
app.use(notFound);
app.use(errorHandler);

if (require.main === module) {
  app.listen(config.port, () => {
    console.log(`FocusForge backend listening on :${config.port} (${config.env})`);
  });
}

module.exports = app;
