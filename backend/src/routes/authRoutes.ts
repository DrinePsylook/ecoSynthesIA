import express from 'express';
import multer from 'multer';
import * as authController from '../controller/authController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

// Configure multer for memory storage (we'll pass the buffer to our storage service)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max
    },
});

/**
 * Authentication routes
 * Base path: /auth
 * 
 * Public routes (no token required):
 *   POST   /auth/register  - Create new account
 *   POST   /auth/login     - Login and get token
 * 
 * Protected routes (token required):
 *   GET    /auth/me        - Get current user profile
 *   POST   /auth/logout    - Logout (client-side)
 *   PATCH  /auth/profile   - Update username or email
 *   PATCH  /auth/password  - Update password
 *   POST   /auth/avatar    - Upload avatar image
 *   DELETE /auth/avatar    - Delete avatar
 */

// Public routes - no authentication required
router.post('/register', authController.register);
router.post('/login', authController.login);

// Protected routes - require valid JWT token
router.get('/me', authMiddleware, authController.me);
router.post('/logout', authMiddleware, authController.logout);
router.patch('/profile', authMiddleware, authController.updateProfile);
router.patch('/password', authMiddleware, authController.updatePassword);

// Avatar routes - with file upload middleware
router.post('/avatar', authMiddleware, upload.single('avatar'), authController.uploadAvatar);
router.delete('/avatar', authMiddleware, authController.deleteAvatar);

// Account deletion routes
router.delete('/account', authMiddleware, authController.deleteAccount);

export default router;