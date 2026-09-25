'use strict';

const express = require('express');
const { generalLimiter } = require('../middleware/rateLimit');

const router = express.Router();

// GET /stats — stub for Task 2. Aggregation lands in a later task.
router.get('/', generalLimiter, (req, res) => {
  return res.status(501).json({
    success: false,
    message: 'Stats endpoint not implemented yet (Task 2 foundation only).',
  });
});

module.exports = router;
