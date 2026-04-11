import { Router } from 'express';
import { verifyToken } from '../middleware/auth.middleware.js';
import * as guestController from '../constroller/guest.controller.js';

const router = Router();

router.get('/', verifyToken, guestController.getGuests);
router.post('/', verifyToken, guestController.createGuest);
router.patch('/:id/checkout', verifyToken, guestController.checkOutGuest);

export default router;
