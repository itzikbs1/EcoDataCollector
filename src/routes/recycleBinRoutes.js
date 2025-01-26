import express from 'express';
import { getRecycleBins } from '../controllers/recycleBinController.js';

const router = express.Router();


router.post('/bins', getRecycleBins);

export default router;