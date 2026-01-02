import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';

/**
 * Payload stored inside the JWT token
 * Contains user information that will be used to authenticate the user
 */
export interface TokenPayload {
    userId: number;
    email: string;
}

/**
 * Extended payload with JWT standard fields
 * iat = issued at (when the token was created
 * exp = expiration time)
 */
export interface DecodedToken extends JwtPayload, TokenPayload {
    iat: number;
    exp: number;
}

/**
 * Get the JWT secret from environment variables
 * Throw an error if the secret is not set
 */
const getJwtSecret = (): string => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET is not set');
    }
    return secret;
}

/**
 * Get token expiration time from env or use default (7 days)
 */
const getExpiresIn = (): string => {
    return process.env.JWT_EXPIRES_IN || '7d';
}

/**
 * Generates a JWT token for a user
 * @param payload - User data to encode in the token (userId, email)
 * @returns The signed JWT token as a string
 */
export const generateToken = (payload: TokenPayload): string => {
    const options: SignOptions = {
        expiresIn: Number(getExpiresIn()), // 'HS256' algorithm is the default one
    }

    // jwt.sign(data, secret, options) creates the token
    return jwt.sign(payload, getJwtSecret(), options);
};

/**
 * Verifies and decode a JWT token
 * @param token - The JWT token string to verify
 * @returns The decoded token payload if valid, null otherwise
 */
export const verifyToken = (token: string): DecodedToken | null => {
    try {
        // jwt.verify() throws an error if the token is invalid or expired
        const decoded = jwt.verify(token, getJwtSecret()) as DecodedToken;
        return decoded;
    } catch (error) {
        console.error('Error verifying token:', error);
        return null;
    }
}

/**
 * Extracts the token from the Authorization header
 * @param authHeader - The Authorization header value
 * @returns The token if it exists, null otherwise
 */
export const extractTokenFromHeader = (authheader: string | undefined): string | null => {
    if (!authheader) {
        return null;
    }

    const parts = authheader.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return null;
    }

    return parts[1];
}
