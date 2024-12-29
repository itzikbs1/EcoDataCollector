// import 'dotenv/config';
import pkg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from the project root
dotenv.config({ path: path.join(__dirname, '../../.env') });

const { Pool } = pkg;


const pool = new Pool({
    user: String(process.env.DB_USER),
    host: String(process.env.DB_HOST),
    database: String(process.env.DB_NAME),
    password: String(process.env.DB_PASSWORD),
    port: Number(process.env.DB_PORT)
});


pool.query('SELECT NOW()', (err, res) => {
    if(err) {
        console.error('Error connecting to the database: ', err);
    } else {
        console.log('Successfully connected to database');
    }
});

// Replace module.exports with ES module export syntax
export const query = (text, params) => pool.query(text, params);
export { pool };