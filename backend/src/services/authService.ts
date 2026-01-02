import bcrypt from 'bcryptjs';
import { UserService } from './userService';
import { generateToken, TokenPayload } from '../utils/jwtUtils';
import { User } from '../models/userModel';

/**
 * Response types for auth operations
 */
export interface AuthResponse {
    success: boolean;
    message: string;
    token?: string;
    user?: Omit<User, 'password_hash'>;
}

export interface RegisterData {
    email: string;
    password: string;
    username: string;
}

export interface LoginData {
    email: string;
    password: string;
}

/**
 * Number of salt round for bcrypt
 */
const SALT_ROUNDS = 10;

export class AuthService {
    /**
     * Register a new user
     * @param data - Registration data (email, password, username)
     * @returns AuthResponse with token if successful
     */
    static async register(data: RegisterData): Promise<AuthResponse> {
        const { email, password, username } = data;

        const existingEmail = await UserService.findUserByEmail(email);
        if (existingEmail){
            return {
                success: false,
                message: 'An account with this email already exists'
            };
        }

        // Validation check if username is already taken
        const existingUserName = await UserService.findUserByUsername(username);
        if (existingUserName){
            return {
                success: false,
                message: 'This username is already taken'
            };
        }

        // Hash the password
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        // Create the user
        const newUser = await UserService.createUser({
            email,
            password_hash: passwordHash,
            username,
            avatar_path: '',
        } as User);

        if (!newUser){
            return {
                success: false,
                message: 'Failed to create user. Please try again.'
            };
        }

        // Generate JWT token
        const tokenPayload: TokenPayload = {
            userId: newUser.id,
            email: newUser.email,
        };
        const token = generateToken(tokenPayload);

        // Return success response with token and user (without password)
        const { password_hash, ...userWithoutPassword } = newUser;
        return {
            success: true,
            message: 'Registration successful',
            token,
            user: userWithoutPassword
        };

    }

    /** 
     * Authenticates a user and returns a JWT token
     * @param data - login credentials (email, password)
     * @returns - AuthResponse with token if successful
     */
    static async login(data: LoginData): Promise<AuthResponse> {
        const { email, password } = data;

        // Find the user by email
        const user = await UserService.findUserByEmail(email);
        if (!user){
            return {
                success: false,
                message: 'Invalid email or password'
            };
        }

        // Compare the password using bcrypt 
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid){
            return {
                success: false,
                message: 'Invalid email or password'
            };
        }

        // Generate JWT token
        const tokenPayload: TokenPayload = {
            userId: user.id,
            email: user.email,
        };
        const token = generateToken(tokenPayload);

        // Return user without password
        const { password_hash, ...userWithoutPassword } = user;

        return {
            success: true,
            message: 'Login successful',
            token,
            user: userWithoutPassword
        };
    }

    /**
     * Gets the current user from a valid token
     * @param userId - User ID from the decoded token
     * @returns User without password or null
     */
    static async getCurrentUser(userId: number): Promise<Omit<User, 'password_hash'> | null> {
        const user = await UserService.findUserById(userId);
        if (!user){
            return null;
        }

        const { password_hash, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }

    /**
     * Hashes a password (useful for password change feature)
     * 
     * @param password - Plain text password
     * @returns Hashed password
     */
    static async hashPassword(password: string): Promise<string> {
        return bcrypt.hash(password, SALT_ROUNDS);
    }

    /**
     * Verifies a password against a hash
     * 
     * @param password - Plain text password
     * @param hash - Stored password hash
     * @returns True if password matches
     */
    static async verifyPassword(password: string, hash: string): Promise<boolean> {
        return bcrypt.compare(password, hash);
    }
}

