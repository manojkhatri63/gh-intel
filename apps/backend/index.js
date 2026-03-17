require('dotenv').config();
const express = require('express');
const cors = require('cors');
const prsRoutes = require('./routes/prs');

const app = express();

// Middleware
app.use(cors()); // Allows frontend to connect
app.use(express.json()); // Parses incoming JSON in req.body

// Routes
app.use('/api/prs', prsRoutes);

// Health Check
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 GH-Intel Backend live on port ${PORT}`);
});