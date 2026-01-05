import { Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { UserService } from '../services/userService';

/**
 * Auth Controller
 * Hendles HTTP request for authentication endpoionts
 * 
 * Resonsabilities:
 * - Validate request body
 * - Call the appropriate service method
 * - Format and return the HTTP response
 */

/**
 * Creates a new user account
 */
export const register = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password, username } = req.body;

        // Basic validation
        if (!email || !password || !username) {
            res.status(400).json({
                success: false,
                message: 'Email, password, and username are required'
            });
            return;
        }

        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            res.status(400).json({
                success: false,
                message: 'Invalid email address'
            });
            return;
        }

        // Password strength validation
        if (password.length < 8) {
            res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters long'
            });
            return;
        }

        // Username validation
        if (username.length < 3 || username.length > 50) {
            res.status(400).json({
                success: false,
                message: 'Username must be between 3 and 50 characters'
            });
            return;
        }

        // Call the service
        const result = await AuthService.register({ email, password, username });

        // Return the appropriate status code
        const statusCode = result.success ? 201 : 400;
        res.status(statusCode).json(result);

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred during registration'
        });
    }
};

/**
 * Anthenticates a user and return a JWT token
 */
export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;

        // Basic validation
        if (!email || !password) {
            res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
            return;
        }

        // Call the service
        const result = await AuthService.login({ email, password });

        // Return appropriate status code
        // 401 for invalid credentials, 200 for success
        const statusCode = result.success ? 200 : 401;
        res.status(statusCode).json(result);

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred during login'
        });
    }
};

/**
 * Get the current authenticated user's profile
 */
export const me = async (req: Request, res: Response): Promise<void> => {
    try {
        // req.user is set by authMiddleware
        // TypeScript knows it exists because this route uses the middleware
        const userId = req.user?.userId;

        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'Not authenticated'
            });
            return;
        }

        const user = await AuthService.getCurrentUser(userId);

        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found'
            });
            return;
        }

        res.status(200).json({
            success: true,
            user
        });

    } catch (error) {
        console.error('Get current user error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while fetching user profile'
        });
    }
};

/**
 * Logs out the user
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
    res.status(200).json({
        success: true,
        message: 'Logged out successfully. Please delete your token.'
    });
};

/**
 * Updates the current user's profile
 * 
 * PATH: /auth/profile
 */
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.userId;

        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'Not authenticated'
            });
            return;
        }

        const { username, email } = req.body;

        if (!username && !email) {
            res.status(400).json({
                success: false,
                message: 'At least one field (username or email) must be provided'
            });
            return;
        }

        if (username) {
            if (username.length < 3 || username.length > 50) {
                res.status(400).json({
                    success: false,
                    message: 'Username must be between 3 and 50 characters'
                });
                return;
            }

            const existingUser = await UserService.findUserByUsername(username);
            if (existingUser && existingUser.id !== userId) {
                res.status(409).json({
                    success: false,
                    message: 'This username is already taken'
                });
                return;
            }
        }

        if (email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid email format'
                });
                return;
            }

            const existingUser = await UserService.findUserByEmail(email);
            if (existingUser && existingUser.id !== userId) {
                res.status(409).json({
                    success: false,
                    message: 'This email is already in use'
                });
                return;
            }
        }

        const updates: { username?: string; email?: string } = {};
        if (username) {
            updates.username = username;
        }
        if (email) {
            updates.email = email;
        }

        const updatedUser = await UserService.updateUser(userId, updates);

        if (!updatedUser) {
            res.status(500).json({
                success: false,
                message: 'Failed to update profile'
            });
            return;
        }

        const { password_hash, ...userWithoutPassword } = updatedUser;

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            user: userWithoutPassword
        });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while updating profile'
        });
    }
};

/**
 * Updates the current user's password
 * 
 * PATCH /auth/password
 */
export const updatePassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.userId;

        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'Not authenticated'
            });
            return;
        }

        const { currentPassword, newPassword } = req.body;

        // Validate required fields
        if (!currentPassword || !newPassword) {
            res.status(400).json({
                success: false,
                message: 'Current password and new password are required'
            });
            return;
        }

        // Validate new password strength
        if (newPassword.length < 8) {
            res.status(400).json({
                success: false,
                message: 'New password must be at least 8 characters long'
            });
            return;
        }

        // Get the user to verify current password
        const user = await UserService.findUserById(userId);
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found'
            });
            return;
        }

        // Verify current password is correct
        const isPasswordValid = await AuthService.verifyPassword(currentPassword, user.password_hash);
        if (!isPasswordValid) {
            res.status(401).json({
                success: false,
                message: 'Current password is incorrect'
            });
            return;
        }

        // Hash the new password
        const hashedPassword = await AuthService.hashPassword(newPassword);

        // Update the password in database
        const success = await UserService.updateUserPassword(userId, hashedPassword);

        if (!success) {
            res.status(500).json({
                success: false,
                message: 'Failed to update password'
            });
            return;
        }

        res.status(200).json({
            success: true,
            message: 'Password updated successfully'
        });

    } catch (error) {
        console.error('Update password error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while updating password'
        });
    }
};

/**
 * Uploads a new avatar for the current user
 * 
 * POST /auth/avatar
 * Content-Type: multipart/form-data
 * Body: avatar (file)
 */
export const uploadAvatar = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.userId;

        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'Not authenticated'
            });
            return;
        }

        // Check if file was uploaded (multer adds it to req.file)
        if (!req.file) {
            res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
            return;
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(req.file.mimetype)) {
            res.status(400).json({
                success: false,
                message: 'Invalid file type. Allowed: JPEG, PNG, GIF, WebP'
            });
            return;
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (req.file.size > maxSize) {
            res.status(400).json({
                success: false,
                message: 'File too large. Maximum size is 5MB'
            });
            return;
        }

        // Upload the avatar
        const updatedUser = await UserService.uploadAvatar(
            userId,
            req.file.buffer,
            req.file.mimetype
        );

        if (!updatedUser) {
            res.status(500).json({
                success: false,
                message: 'Failed to upload avatar'
            });
            return;
        }

        // Return user without password
        const { password_hash, ...userWithoutPassword } = updatedUser;

        res.status(200).json({
            success: true,
            message: 'Avatar uploaded successfully',
            user: userWithoutPassword
        });

    } catch (error) {
        console.error('Upload avatar error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while uploading avatar'
        });
    }
};

/**
 * Deletes the current user's avatar
 * 
 * DELETE /auth/avatar
 */
export const deleteAvatar = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.userId;

        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'Not authenticated'
            });
            return;
        }

        // Remove the avatar
        const updatedUser = await UserService.removeAvatar(userId);

        if (!updatedUser) {
            res.status(500).json({
                success: false,
                message: 'Failed to delete avatar'
            });
            return;
        }

        // Return user without password
        const { password_hash, ...userWithoutPassword } = updatedUser;

        res.status(200).json({
            success: true,
            message: 'Avatar deleted successfully',
            user: userWithoutPassword
        });

    } catch (error) {
        console.error('Delete avatar error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while deleting avatar'
        });
    }
};
