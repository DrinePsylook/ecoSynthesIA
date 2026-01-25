/**
 * Unit tests for authentication middleware
 * 
 * These tests verify the access control functionality:
 * - authMiddleware: blocks requests without valid token
 * - optionalAuthMiddleware: allows requests but attaches user if token is valid
 * 
 * Pattern: AAA (Arrange, Act, Assert)
 */

import { Request, Response, NextFunction } from "express";
import { authMiddleware, optionalAuthMiddleware } from "../../src/middleware/authMiddleware";
import * as jwtUtils from "../../src/utils/jwtUtils";

// Mock jwUtils to control token extraction and verification
jest.mock("../../src/utils/jwtUtils", () => ({
    extractTokenFromHeader: jest.fn(),
    verifyToken: jest.fn(),
}));

// Mock the logger to avoid warning logs
jest.mock('../../src/utils/logger', () => ({
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    fatal: jest.fn(),
}));

describe('Auth Middleware', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let nextFunction: NextFunction;

    // Sample decoded token for valid authentication
    const mockDecodedToken = {
        userId: 42,
        email: 'test@example.com',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    };

    beforeEach(() => {
        // Reset mocks before each test
        jest.clearAllMocks();

        // Create fresh mock objects for each test
        mockRequest = {
            headers: {}
        };

        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };

        nextFunction = jest.fn();
    });

    // =========================================================
    // authMiddleware tests
    // =========================================================
    describe('authMiddleware', () => {
        it('should returns 401 when no Authorization header is provided', () => {
            // Arrange 
            mockRequest.headers = {};
            (jwtUtils.extractTokenFromHeader as jest.Mock).mockReturnValue(null);

            // Act
            authMiddleware(
                mockRequest as Request,
                mockResponse as Response,
                nextFunction
            );

            // Assert
            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Authentification required',
                message: 'No token provided. Please include an Authorization header with format: Bearer <token>'
            });
            expect(nextFunction).not.toHaveBeenCalled();
            expect(mockRequest.user).toBeUndefined();
        });

        it('should returns 41 when Authorization header is malformed', () => {
            // Arrange
            mockRequest.headers = { authorization: 'InvalidFormat' };
            (jwtUtils.extractTokenFromHeader as jest.Mock).mockReturnValue(null);

            // Act
            authMiddleware(
                mockRequest as Request,
                mockResponse as Response,
                nextFunction
            );

            // Assert
            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(nextFunction).not.toHaveBeenCalled();
        });

        it('should returns 401 when token is invalid', () => {
            // Arrange
            mockRequest.headers = { authorization: 'Bearer invalid-token' };
            (jwtUtils.extractTokenFromHeader as jest.Mock).mockReturnValue('invalid-token');
            (jwtUtils.verifyToken as jest.Mock).mockReturnValue(null);

            // Act
            authMiddleware(
                mockRequest as Request,
                mockResponse as Response,
                nextFunction
            );

            // Assert
            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Invalid token',
                message: 'Your token is invalid or has expired. Please login again.'
            });
            expect(nextFunction).not.toHaveBeenCalled();
            expect(mockRequest.user).toBeUndefined();
        });

        it('should call next() and attach user when token is valid', () => {
            // Arrange
            mockRequest.headers = { authorization: 'Bearer valid-token' };
            (jwtUtils.extractTokenFromHeader as jest.Mock).mockReturnValue('valid-token');
            (jwtUtils.verifyToken as jest.Mock).mockReturnValue(mockDecodedToken);

            // Act
            authMiddleware(
                mockRequest as Request,
                mockResponse as Response,
                nextFunction
            );

            // Assert
            expect(mockRequest.user).toEqual(mockDecodedToken);
            expect(nextFunction).toHaveBeenCalledTimes(1);
            expect(mockResponse.status).not.toHaveBeenCalled();
            expect(mockResponse.json).not.toHaveBeenCalled();
        });

        it('should extract token from header correctly', () => {
            // Arrange
            const token = 'my-jwt-token';
            mockRequest.headers = { authorization: `Bearer ${token}` };
            (jwtUtils.extractTokenFromHeader as jest.Mock).mockReturnValue(token);
            (jwtUtils.verifyToken as jest.Mock).mockReturnValue(mockDecodedToken);

            // Act
            authMiddleware(
                mockRequest as Request,
                mockResponse as Response,
                nextFunction
            );

            // Assert
            expect(jwtUtils.extractTokenFromHeader).toHaveBeenCalledWith(`Bearer ${token}`);
            expect(jwtUtils.verifyToken).toHaveBeenCalledWith(token);
        });
    });

    // =========================================================
    // optionalAuthMiddleware tests
    // =========================================================
    describe('optionalAuthMiddleware', () => {
        it('should call next() without user when no Authorization header', () => {
            // Arrange
            mockRequest.headers = {};
            (jwtUtils.extractTokenFromHeader as jest.Mock).mockReturnValue(null);

            // Act
            optionalAuthMiddleware(
                mockRequest as Request,
                mockResponse as Response,
                nextFunction
            );

            // Assert
            expect(nextFunction).toHaveBeenCalledTimes(1);
            expect(mockRequest.user).toBeUndefined();
            expect(mockResponse.status).not.toHaveBeenCalled();
        });

        it('should call next() without user when header is malformed', () => {
            // Arrange
            mockRequest.headers = { authorization: 'InvalidFormat' };
            (jwtUtils.extractTokenFromHeader as jest.Mock).mockReturnValue(null);

            // Act
            optionalAuthMiddleware(
                mockRequest as Request,
                mockResponse as Response,
                nextFunction
            );

            // Assert
            expect(nextFunction).toHaveBeenCalledTimes(1);
            expect(mockRequest.user).toBeUndefined();
            expect(mockResponse.status).not.toHaveBeenCalled();
        });

        it('should call next() without user when token is invalid', () => {
            // Arrange
            mockRequest.headers = { authorization: 'Bearer invalid-token' };
            (jwtUtils.extractTokenFromHeader as jest.Mock).mockReturnValue('invalid-token');
            (jwtUtils.verifyToken as jest.Mock).mockReturnValue(null);

            // Act
            optionalAuthMiddleware(
                mockRequest as Request,
                mockResponse as Response,
                nextFunction
            );

            // Assert
            expect(nextFunction).toHaveBeenCalledTimes(1);
            expect(mockRequest.user).toBeUndefined();
            expect(mockResponse.status).not.toHaveBeenCalled();
        });

        it('should call next() and attach user when token is valid', () => {
            // Arrange
            mockRequest.headers = { authorization: 'Bearer valid-token' };
            (jwtUtils.extractTokenFromHeader as jest.Mock).mockReturnValue('valid-token');
            (jwtUtils.verifyToken as jest.Mock).mockReturnValue(mockDecodedToken);

            // Act
            optionalAuthMiddleware(
                mockRequest as Request,
                mockResponse as Response,
                nextFunction
            );

            // Assert
            expect(mockRequest.user).toEqual(mockDecodedToken);
            expect(nextFunction).toHaveBeenCalledTimes(1);
            expect(mockResponse.status).not.toHaveBeenCalled();
        });

        it('should never return an error response', () => {
            // Arrange - test with various invalid scenarios
            const scenarios = [
                { headers: {}, token: null, decoded: null },
                { headers: { authorization: 'Invalid' }, token: null, decoded: null },
                { headers: { authorization: 'Bearer bad' }, token: 'bad', decoded: null },
            ];

            scenarios.forEach((scenario) => {
                jest.clearAllMocks();
                mockRequest = { headers: scenario.headers };
                (jwtUtils.extractTokenFromHeader as jest.Mock).mockReturnValue(scenario.token);
                (jwtUtils.verifyToken as jest.Mock).mockReturnValue(scenario.decoded);

                // Act
                optionalAuthMiddleware(
                    mockRequest as Request,
                    mockResponse as Response,
                    nextFunction
                );

                // Assert - should never call status or json
                expect(mockResponse.status).not.toHaveBeenCalled();
                expect(mockResponse.json).not.toHaveBeenCalled();
            });
        });
    });
});