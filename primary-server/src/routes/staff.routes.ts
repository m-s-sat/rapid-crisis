import { Router } from 'express';
import { verifyToken } from '../middleware/auth.middleware.js';
import * as staffController from '../constroller/staff.controller.js';

const router = Router();

router.get('/', verifyToken, staffController.getStaff);
router.post('/', verifyToken, staffController.createStaff);
router.delete('/:id', verifyToken, staffController.deleteStaff);

export default router;
