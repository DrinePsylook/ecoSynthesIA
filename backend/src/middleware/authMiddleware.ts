import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader, DecodedToken } from '../utils/jwtUtils';

/**
 * Extend Express Request to include user information
 */
declare global {
    namespace Express {
        interface Request {
            user?: DecodedToken;
        }
    }
}

/**
 * Authentification middleware
 * Usage in routes:
 *  router.get('/protected', authMiddleware, controller.protectedAction);
 */
export const authMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    // Get the Authorization header
    const authHeader = req.headers.authorization;

    // Extract the token from the "Bearer <token>"
    const token = extractTokenFromHeader(authHeader);
    if (!token) {
        res.status(401).json({
            error: 'Authentification required',
            message: 'No token provided. Please include an Authorization header with format: Bearer <token>'
        });
        return;
    }

    // Verify the token
    const decoded = verifyToken(token);
    if (!decoded) {
        res.status(401).json({
            error: 'Invalid token',
            message: 'Your token is invalid or has expired. Please login again.'
        });
        return;
    }   
    // Token is valid, attach user data to request
    req.user = decoded;

    // Continue to the next middleware/controller
    next();
};

/**
 * Optional authentication middleware
 * 
 * Same as authMiddleware but doesn't block if no token is provided.
 * Useful for routes that work for both authenticated and anonymous users.
 * 
 * Example: A public document list that shows extra info for logged-in users
 * 
 * Usage in routes:
 *   router.get('/public', optionalAuthMiddleware, controller.publicAction);
 */
export const optionalAuthMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (token) {
        const decoded = verifyToken(token);
        if (decoded) {
            req.user = decoded;
        }
        // If token is invalid, we just don't set req.user
        // We don't return an error
    }

    // Always continue, even without a valid token
    next();
};
