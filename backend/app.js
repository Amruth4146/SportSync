const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const authRoutes = require('./routes/auth');
const gameRoutes = require('./routes/games');
const walletRoutes = require('./routes/walletRoutes');
const turfRoutes = require('./routes/turfs');

const app = express();


app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());

mongoose
.connect(process.env.MONGO_URI, { dbName: 'sports_matching' })
.then(() => console.log('MongoDB connected'))
.catch((err) => console.error('MongoDB error:', err));

app.use('/api/auth', authRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/turfs', turfRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
