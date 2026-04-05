import { Router } from 'express';
import { processAiEvidence } from '../constroller/ai_process.controller.js';

const router = Router();

router.post('/process', processAiEvidence);

export default router;
