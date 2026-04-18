import { Router } from 'express';
import { adminDecision } from '../constroller/admin.controller.js';
import { verifyToken } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/decision', verifyToken, adminDecision);

export default router;
