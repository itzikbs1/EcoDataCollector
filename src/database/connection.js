import mongoose from "mongoose";
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the directory path for the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file from project root (one level up from src)
dotenv.config({ path: join(__dirname, '../../.env') });

const connectDB = async () => {
    try {
        mongoose.connection.on('connected', () => {
            console.log('Connected to database:', mongoose.connection.db.databaseName);
        });
        mongoose.connection.on('error', (err) => {
            console.error('MongoDB connection error:', err);
        });
        
        mongoose.connection.on('disconnected', () => {
            console.log('MongoDB disconnected');
        });
        const conn = await mongoose.connect(process.env.MONGODB_URI);
        // const conn = await mongoose.connect('mongodb://127.0.0.1:27017/recycling_bins');
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
}

export default connectDB;