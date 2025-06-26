import dotenv from 'dotenv';
import connectDB from './db/connectDB.js';
import app from './app.js';

dotenv.config({
  path: "./.env"
});

// Connect to MongoDB
connectDB()
.then(()=>{
const PORT = process.env.PORT
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
})
.catch((err)=>{
    console.log("MongoDB connection failed on index.js",err);
    process.exit(1);
})

