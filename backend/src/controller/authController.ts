import { Request, Response } from 'express';
import { AuthService } from '../services/authService';

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
