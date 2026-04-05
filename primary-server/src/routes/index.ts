import { Router } from 'express';
import staffRoutes from './staff.routes.js';
import guestRoutes from './guest.routes.js';
import aiRoutes from './ai.routes.js';
import adminRoutes from './admin.routes.js';

const router = Router();

router.use('/staff', staffRoutes);
router.use('/guests', guestRoutes);
router.use('/ai', aiRoutes);
router.use('/admin', adminRoutes);

export default router;
