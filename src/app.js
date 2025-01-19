import express from 'express';
import mongoose from 'mongoose';

import recycleBinsRoutes from './routes/recycleBinRoutes.js';
import connectDB from './database/connection.js';

const app = express();

app.use(express.json());

app.use('/api', recycleBinsRoutes);


const PORT = 3000;
// Start server only after connecting to database
async function startServer() {
    try {
        await connectDB();
        
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();