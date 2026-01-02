import express from 'express';
import * as authController from '../controller/authController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

/**
 * Authentication routes
 * Base path: /auth
 * 
 * Public routes (no token required):
 *   POST /auth/register - Create new account
 *   POST /auth/login    - Login and get token
 * 
 * Protected routes (token required):
 *   GET  /auth/me       - Get current user profile
 *   POST /auth/logout   - Logout (client-side)
 */

// Public routes - no authentication required
router.post('/register', authController.register);
router.post('/login', authController.login);

// Protected routes - require valid JWT token
router.get('/me', authMiddleware, authController.me);
router.post('/logout', authMiddleware, authController.logout);

export default router;