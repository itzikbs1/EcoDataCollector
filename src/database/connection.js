import mongoose from "mongoose";

const connectDB = async () => {
    try {
        mongoose.connection.on('connected', () => {
            console.log('Connected to database:', mongoose.connection.db.databaseName);
        });
        const conn = await mongoose.connect('mongodb+srv://itzik3877:M6nI5eDfVQTgqyEe@cluster0.eelz2.mongodb.net/');
        // const conn = await mongoose.connect('mongodb://127.0.0.1:27017/recycling_bins');
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
}

export default connectDB;