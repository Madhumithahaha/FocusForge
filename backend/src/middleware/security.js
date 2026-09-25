'use strict';

const cors = require('cors');
const helmet = require('helmet');
const express = require('express');

/**
 * Baseline security + parsing.
 * GROQ_API_KEY is never attached to req/res — it stays in config only.
 */
function applySecurity(app) {
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '32kb', strict: true }));
}

/**
 * Minimal request log: method, url, status, duration.
 * Does not log bodies (user excuses can be personal).
 */
function requestLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - start}ms)`);
  });
  next();
}

function notFound(req, res) {
  res.status(404).json({ success: false, message: 'Not found' });
}

// Centralized error handler — must be registered last (4 args).
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Invalid JSON body' });
  }
  console.error(err);
  return res
    .status(err && err.status ? err.status : 500)
    .json({ success: false, message: 'Internal server error' });
}

module.exports = { applySecurity, requestLogger, notFound, errorHandler };
