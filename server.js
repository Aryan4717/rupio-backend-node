require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { sequelize } = require('./config/db');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'Rupio API is running!' });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/aa', require('./routes/aa'));
app.use('/api/transactions', require('./routes/transactions'));

// Start server
const PORT = process.env.PORT || 3000;

sequelize.authenticate()
  .then(() => {
    console.log('✅ Database connected');
    app.listen(PORT, () => {
      console.log(`🚀 Rupio server running on http://localhost:${PORT}`);
      console.log(`📊 pgAdmin: http://localhost:5050`);
    });
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err);
  });