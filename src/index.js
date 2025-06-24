import express from 'express';
import dotenv from 'dotenv';
import connectDB from './db/connectDB.js';

dotenv.config();

// Connect to MongoDB
connectDB();

// Create express app
const app = express();

// Basic middleware
app.use(express.json());

// Basic route
app.get('/', (req, res) => {
  res.send('API is running...');
});

// Start server
const PORT = process.env.PORT;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});