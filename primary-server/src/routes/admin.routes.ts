import { Router } from 'express';
import { adminDecision } from '../constroller/admin.controller.js';

const router = Router();

router.post('/decision', adminDecision);

export default router;
