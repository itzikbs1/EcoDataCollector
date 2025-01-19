import express from 'express';
import { getRecycleBins } from '../controllers/recycleBinController.js';

const router = express.Router();


router.get('/bins', getRecycleBins);

export default router;