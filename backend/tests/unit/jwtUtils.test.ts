/**
 * Unit tests for JWT utilities
 * 
 * These tests verify the core authentication token functionality:
 * - Token generation
 * - Token verification
 * - Header extraction
 * 
 * Pattern: AAA (Arrange, Act, Assert)
 */

// Mock the logger to avoid warning logs during tests
// We're testing our logic, not the logging functionality
jest.mock('../../src/utils/logger', () => ({
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    fatal: jest.fn(),
}));

import { generateToken, verifyToken, extractTokenFromHeader, TokenPayload } from '../../src/utils/jwtUtils';

describe('JWT Utils', () => {
    // Sample payload used across tests
    const testPayload: TokenPayload = {
        userId: 42,
        email: 'test@example.com'
    };

    // Set up environment before all tests
    beforeAll(() => {
        // Set a test secret - required for JWT operations
        process.env.JWT_SECRET = 'test-secret-key-for-unit-tests';
        process.env.JWT_EXPIRES_IN = '1h';
    });

    // Clean up after all tests
    afterAll(() => {
        delete process.env.JWT_SECRET;
        delete process.env.JWT_EXPIRES_IN;
    });

    // =========================================================
    // extractTokenFromHeader tests
    // =========================================================
    describe('extractTokenFromHeader', () => {
        it('should return null when header is undefined', () => {
            // Arrange
            const header = undefined;

            // Act
            const result = extractTokenFromHeader(header);

            // Assert
            expect(result).toBeNull();
        });

        it('should return null when header is empty string', () => {
            const result = extractTokenFromHeader('');
            expect(result).toBeNull();
        });

        it('should return null when header does not start with Bearer', () => {
            // Test various invalid formats
            expect(extractTokenFromHeader('Basic abc123')).toBeNull();
            expect(extractTokenFromHeader('Token abc123')).toBeNull();
            expect(extractTokenFromHeader('bearer abc123')).toBeNull(); // case sensitive
        });

        it('should return null when Bearer has no token', () => {
            expect(extractTokenFromHeader('Bearer')).toBeNull();
        });

        it('should return null when format has extra parts', () => {
            expect(extractTokenFromHeader('Bearer token extra')).toBeNull();
        });

        it('should extract token from valid Bearer header', () => {
            // Arrange
            const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test';
            const header = `Bearer ${token}`;

            // Act
            const result = extractTokenFromHeader(header);

            // Assert
            expect(result).toBe(token);
        });
    });

    // =========================================================
    // generateToken tests
    // =========================================================
    describe('generateToken', () => {
        it('should generate a valid JWT string', () => {
            // Act
            const token = generateToken(testPayload);

            // Assert - JWT format: header.payload.signature
            expect(typeof token).toBe('string');
            expect(token.split('.')).toHaveLength(3);
        });

        it('should generate different tokens for different payloads', () => {
            // Arrange
            const payload1: TokenPayload = { userId: 1, email: 'user1@test.com' };
            const payload2: TokenPayload = { userId: 2, email: 'user2@test.com' };

            // Act
            const token1 = generateToken(payload1);
            const token2 = generateToken(payload2);

            // Assert
            expect(token1).not.toBe(token2);
        });

        it('should throw error when JWT_SECRET is not set', () => {
            // Arrange - temporarily remove the secret
            const originalSecret = process.env.JWT_SECRET;
            delete process.env.JWT_SECRET;

            // Act & Assert
            expect(() => generateToken(testPayload)).toThrow('JWT_SECRET is not set');

            // Cleanup - restore the secret
            process.env.JWT_SECRET = originalSecret;
        });
    });

    // =========================================================
    // verifyToken tests
    // =========================================================
    describe('verifyToken', () => {
        it('should return decoded payload for valid token', () => {
            // Arrange
            const token = generateToken(testPayload);

            // Act
            const decoded = verifyToken(token);

            // Assert
            expect(decoded).not.toBeNull();
            expect(decoded?.userId).toBe(testPayload.userId);
            expect(decoded?.email).toBe(testPayload.email);
        });

        it('should include iat (issued at) in decoded token', () => {
            // Arrange
            const token = generateToken(testPayload);

            // Act
            const decoded = verifyToken(token);

            // Assert
            expect(decoded?.iat).toBeDefined();
            expect(typeof decoded?.iat).toBe('number');
        });

        it('should include exp (expiration) in decoded token', () => {
            // Arrange
            const token = generateToken(testPayload);

            // Act
            const decoded = verifyToken(token);

            // Assert
            expect(decoded?.exp).toBeDefined();
            expect(decoded?.exp).toBeGreaterThan(decoded?.iat ?? 0);
        });

        it('should return null for invalid token format', () => {
            const result = verifyToken('not-a-valid-jwt');
            expect(result).toBeNull();
        });

        it('should return null for tampered token', () => {
            // Arrange - create valid token then modify it
            const token = generateToken(testPayload);
            const tamperedToken = token.slice(0, -5) + 'XXXXX';

            // Act
            const result = verifyToken(tamperedToken);

            // Assert
            expect(result).toBeNull();
        });

        it('should return null for token signed with different secret', () => {
            // Arrange - generate token with current secret
            const token = generateToken(testPayload);

            // Change the secret
            const originalSecret = process.env.JWT_SECRET;
            process.env.JWT_SECRET = 'different-secret';

            // Act - try to verify with new secret
            const result = verifyToken(token);

            // Assert
            expect(result).toBeNull();

            // Cleanup
            process.env.JWT_SECRET = originalSecret;
        });

        it('should return null for empty string', () => {
            expect(verifyToken('')).toBeNull();
        });
    });

    // =========================================================
    // Integration: generateToken + verifyToken roundtrip
    // =========================================================
    describe('generateToken and verifyToken integration', () => {
        it('should successfully roundtrip: generate -> verify', () => {
            // Arrange
            const payload: TokenPayload = {
                userId: 123,
                email: 'roundtrip@test.com'
            };

            // Act
            const token = generateToken(payload);
            const decoded = verifyToken(token);

            // Assert
            expect(decoded).not.toBeNull();
            expect(decoded?.userId).toBe(payload.userId);
            expect(decoded?.email).toBe(payload.email);
        });
    });
});
