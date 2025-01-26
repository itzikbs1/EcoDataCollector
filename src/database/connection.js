import mongoose from "mongoose";
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

        console.log(`MongoDB Connected: ${conn.connection.host}`);

    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
}

export default connectDB;