import { Router } from 'express';
import * as authController from '../controller/auth.controller.js';
import { loginLimiter, forgotPasswordLimiter } from '../middleware/rate-limiters.js';
import { verifyToken } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/register', authController.register);
router.post('/login', loginLimiter, authController.login);
router.post('/refresh', authController.refreshToken);
router.post('/logout', verifyToken, authController.logout);
router.post('/forgot-password', forgotPasswordLimiter, authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.get('/me', verifyToken, authController.me);

export default router;
