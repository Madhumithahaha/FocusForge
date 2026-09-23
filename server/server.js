require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Routes
const judgeRoutes = require('./routes/judge');
const statsRoutes = require('./routes/stats');
const insightRoutes = require('./routes/insight');

app.use('/judge', judgeRoutes);
app.use('/stats', statsRoutes);
app.use('/insight', insightRoutes);

app.get('/', (req, res) => {
    res.send('FocusForge Backend is running.');
});

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
