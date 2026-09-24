require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// API Routes
const judgeRoutes = require('./routes/judge');
const statsRoutes = require('./routes/stats');
const insightRoutes = require('./routes/insight');

app.use('/judge', judgeRoutes);
app.use('/stats', statsRoutes);
app.use('/insight', insightRoutes);
app.use('/attempts', statsRoutes); // Alias for direct attempt CRUD

// Serve dashboard static assets
app.use('/dashboard', express.static(path.join(__dirname, '../dashboard')));

// Clean dashboard multi-page routing
app.get('/dashboard/overview', (req, res) => {
    res.sendFile(path.join(__dirname, '../dashboard/overview.html'));
});

app.get('/dashboard/fingerprint', (req, res) => {
    res.sendFile(path.join(__dirname, '../dashboard/fingerprint.html'));
});

app.get('/dashboard/experiment', (req, res) => {
    res.sendFile(path.join(__dirname, '../dashboard/experiment.html'));
});

app.get('/dashboard/activity', (req, res) => {
    res.sendFile(path.join(__dirname, '../dashboard/activity.html'));
});

app.get('/dashboard', (req, res) => {
    res.redirect('/dashboard/overview');
});

app.get('/', (req, res) => {
    res.redirect('/dashboard/overview');
});

app.listen(PORT, () => {
    console.log(`FocusForge Server listening on port ${PORT}`);
    console.log(`Dashboard available at: http://localhost:${PORT}/dashboard/overview`);
});
