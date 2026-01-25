/**
 * Unit tests for authentication service
 * 
 * These tests verify the business logic for user authentication:
 * - User registration (with validation)
 * - User login (with password verification)
 * - Get current user
 * - Password hashing and verification utilities
 * 
 * Pattern: AAA (Arrange, Act, Assert)
 */

import { AuthService } from '../../src/services/authService';
import { UserService } from '../../src/services/userService';
import * as jwtUtils from '../../src/utils/jwtUtils';
import bcrypt from 'bcryptjs';
import { User } from '../../src/models/userModel';

// Mock dependencies
jest.mock('../../src/services/userService');
jest.mock('../../src/utils/jwtUtils');
jest.mock('bcryptjs');

// Mock the logger to avoid warning logs
jest.mock('../../src/utils/logger', () => ({
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    fatal: jest.fn(),
}));

describe('AuthService', () => {
    // Sample user data for tests
    const mockUser: User = {
        id: 1,
        email: 'test@example.com',
        username: 'testuser',
        password_hash: 'hashed_password_123',
        avatar_path: '',
        preferred_language: 'en',
        created_at: new Date(),
        updated_at: new Date(),
    };

    const mockUserWithoutPassword = {
        id: mockUser.id,
        email: mockUser.email,
        username: mockUser.username,
        avatar_path: mockUser.avatar_path,
        preferred_language: mockUser.preferred_language,
        created_at: mockUser.created_at,
        updated_at: mockUser.updated_at,
    };

    beforeEach(() => {
        // Reset all mocks before each test
        jest.clearAllMocks();
    });

    // =========================================================
    // register tests
    // =========================================================
    describe('register', () => {
        const registerData = {
            email: 'newuser@example.com',
            password: 'SecurePassword123',
            username: 'newuser',
        };

        it('should return error if email already exists', async () => {
            // Arrange
            (UserService.findUserByEmail as jest.Mock).mockResolvedValue(mockUser);

            // Act
            const result = await AuthService.register(registerData);

            // Assert
            expect(result.success).toBe(false);
            expect(result.message).toBe('An account with this email already exists');
            expect(result.token).toBeUndefined();
            expect(UserService.findUserByEmail).toHaveBeenCalledWith(registerData.email);
            expect(UserService.findUserByUsername).not.toHaveBeenCalled();
            expect(bcrypt.hash).not.toHaveBeenCalled();
        });

        it('should return error if username already exists', async () => {
            // Arrange
            (UserService.findUserByEmail as jest.Mock).mockResolvedValue(null);
            (UserService.findUserByUsername as jest.Mock).mockResolvedValue(mockUser);

            // Act
            const result = await AuthService.register(registerData);

            // Assert
            expect(result.success).toBe(false);
            expect(result.message).toBe('This username is already taken');
            expect(result.token).toBeUndefined();
            expect(UserService.findUserByEmail).toHaveBeenCalledWith(registerData.email);
            expect(UserService.findUserByUsername).toHaveBeenCalledWith(registerData.username);
            expect(bcrypt.hash).not.toHaveBeenCalled();
        });

        it('should successfully register a new user', async () => {
            // Arrange
            const hashedPassword = 'hashed_password_abc';
            const newUser: User = {
                ...mockUser,
                id: 2,
                email: registerData.email,
                username: registerData.username,
                password_hash: hashedPassword,
            };
            const mockToken = 'jwt-token-123';

            (UserService.findUserByEmail as jest.Mock).mockResolvedValue(null);
            (UserService.findUserByUsername as jest.Mock).mockResolvedValue(null);
            (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
            (UserService.createUser as jest.Mock).mockResolvedValue(newUser);
            (jwtUtils.generateToken as jest.Mock).mockReturnValue(mockToken);

            // Act
            const result = await AuthService.register(registerData);

            // Assert
            expect(result.success).toBe(true);
            expect(result.message).toBe('Registration successful');
            expect(result.token).toBe(mockToken);
            expect(result.user).toEqual({
                id: newUser.id,
                email: newUser.email,
                username: newUser.username,
                avatar_path: newUser.avatar_path,
                preferred_language: newUser.preferred_language,
                created_at: newUser.created_at,
                updated_at: newUser.updated_at,
            });

            // Verify calls
            expect(UserService.findUserByEmail).toHaveBeenCalledWith(registerData.email);
            expect(UserService.findUserByUsername).toHaveBeenCalledWith(registerData.username);
            expect(bcrypt.hash).toHaveBeenCalledWith(registerData.password, 10);
            expect(UserService.createUser).toHaveBeenCalledWith({
                email: registerData.email,
                password_hash: hashedPassword,
                username: registerData.username,
                avatar_path: '',
            });
            expect(jwtUtils.generateToken).toHaveBeenCalledWith({
                userId: newUser.id,
                email: newUser.email,
            });
        });

        it('should return error if user creation fails', async () => {
            // Arrange
            const hashedPassword = 'hashed_password_abc';

            (UserService.findUserByEmail as jest.Mock).mockResolvedValue(null);
            (UserService.findUserByUsername as jest.Mock).mockResolvedValue(null);
            (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
            (UserService.createUser as jest.Mock).mockResolvedValue(null);

            // Act
            const result = await AuthService.register(registerData);

            // Assert
            expect(result.success).toBe(false);
            expect(result.message).toBe('Failed to create user. Please try again.');
            expect(result.token).toBeUndefined();
            expect(jwtUtils.generateToken).not.toHaveBeenCalled();
        });
    });

    // =========================================================
    // login tests
    // =========================================================
    describe('login', () => {
        const loginData = {
            email: 'test@example.com',
            password: 'SecurePassword123',
        };

        it('should return error if user does not exist', async () => {
            // Arrange
            (UserService.findUserByEmail as jest.Mock).mockResolvedValue(null);

            // Act
            const result = await AuthService.login(loginData);

            // Assert
            expect(result.success).toBe(false);
            expect(result.message).toBe('Invalid email or password');
            expect(result.token).toBeUndefined();
            expect(UserService.findUserByEmail).toHaveBeenCalledWith(loginData.email);
            expect(bcrypt.compare).not.toHaveBeenCalled();
        });

        it('should return error if password is incorrect', async () => {
            // Arrange
            (UserService.findUserByEmail as jest.Mock).mockResolvedValue(mockUser);
            (bcrypt.compare as jest.Mock).mockResolvedValue(false);

            // Act
            const result = await AuthService.login(loginData);

            // Assert
            expect(result.success).toBe(false);
            expect(result.message).toBe('Invalid email or password');
            expect(result.token).toBeUndefined();
            expect(bcrypt.compare).toHaveBeenCalledWith(loginData.password, mockUser.password_hash);
            expect(jwtUtils.generateToken).not.toHaveBeenCalled();
        });

        it('should successfully login with valid credentials', async () => {
            // Arrange
            const mockToken = 'jwt-token-456';

            (UserService.findUserByEmail as jest.Mock).mockResolvedValue(mockUser);
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);
            (jwtUtils.generateToken as jest.Mock).mockReturnValue(mockToken);

            // Act
            const result = await AuthService.login(loginData);

            // Assert
            expect(result.success).toBe(true);
            expect(result.message).toBe('Login successful');
            expect(result.token).toBe(mockToken);
            expect(result.user).toEqual(mockUserWithoutPassword);

            // Verify calls
            expect(UserService.findUserByEmail).toHaveBeenCalledWith(loginData.email);
            expect(bcrypt.compare).toHaveBeenCalledWith(loginData.password, mockUser.password_hash);
            expect(jwtUtils.generateToken).toHaveBeenCalledWith({
                userId: mockUser.id,
                email: mockUser.email,
            });
        });
    });

    // =========================================================
    // getCurrentUser tests
    // =========================================================
    describe('getCurrentUser', () => {
        it('should return null if user does not exist', async () => {
            // Arrange
            (UserService.findUserById as jest.Mock).mockResolvedValue(null);

            // Act
            const result = await AuthService.getCurrentUser(999);

            // Assert
            expect(result).toBeNull();
            expect(UserService.findUserById).toHaveBeenCalledWith(999);
        });

        it('should return user without password if user exists', async () => {
            // Arrange
            (UserService.findUserById as jest.Mock).mockResolvedValue(mockUser);

            // Act
            const result = await AuthService.getCurrentUser(mockUser.id);

            // Assert
            expect(result).toEqual(mockUserWithoutPassword);
            expect(UserService.findUserById).toHaveBeenCalledWith(mockUser.id);
        });
    });

    // =========================================================
    // hashPassword tests
    // =========================================================
    describe('hashPassword', () => {
        it('should hash a password using bcrypt', async () => {
            // Arrange
            const plainPassword = 'MySecurePassword123';
            const hashedPassword = 'bcrypt_hashed_password';

            (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

            // Act
            const result = await AuthService.hashPassword(plainPassword);

            // Assert
            expect(result).toBe(hashedPassword);
            expect(bcrypt.hash).toHaveBeenCalledWith(plainPassword, 10);
        });
    });

    // =========================================================
    // verifyPassword tests
    // =========================================================
    describe('verifyPassword', () => {
        it('should return true when password matches hash', async () => {
            // Arrange
            const plainPassword = 'MySecurePassword123';
            const hash = 'bcrypt_hashed_password';

            (bcrypt.compare as jest.Mock).mockResolvedValue(true);

            // Act
            const result = await AuthService.verifyPassword(plainPassword, hash);

            // Assert
            expect(result).toBe(true);
            expect(bcrypt.compare).toHaveBeenCalledWith(plainPassword, hash);
        });

        it('should return false when password does not match hash', async () => {
            // Arrange
            const plainPassword = 'WrongPassword';
            const hash = 'bcrypt_hashed_password';

            (bcrypt.compare as jest.Mock).mockResolvedValue(false);

            // Act
            const result = await AuthService.verifyPassword(plainPassword, hash);

            // Assert
            expect(result).toBe(false);
            expect(bcrypt.compare).toHaveBeenCalledWith(plainPassword, hash);
        });
    });
});