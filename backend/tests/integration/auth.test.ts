/**
 * Integration tests for authentication API
 * 
 * These tests verify the complete authentication flow:
 * - User registration via POST /api/auth/register
 * - User login via POST /api/auth/login
 * - Protected route access via GET /api/auth/me
 * 
 * These tests use a real database and test the full stack:
 * Route → Controller → Service → Database
 * 
 * Pattern: AAA (Arrange, Act, Assert)
 */

import request from 'supertest';
import { connectToDatabase, pgPool } from '../../database/database';
import { runMigrations } from '../../database/migrations/migrationRunner';

// Set test environment before importing app
process.env.NODE_ENV = 'test';

// Import app after setting environment
import app from '../../index';

describe('Auth API Integration Tests', () => {
    // Test user data - unique for each test run
    const testUser = {
        email: `test-${Date.now()}@example.com`,
        password: 'TestPassword123',
        username: `testuser-${Date.now()}`,
    };

    let authToken: string;

    // Setup: Initialize database before all tests
    beforeAll(async () => {
        // Run migrations to ensure database schema is up to date
        await runMigrations(null);

        // Connect to database
        await connectToDatabase();

        // Wait a bit to ensure connection is established
        if (pgPool) {
            await pgPool.query('SELECT 1');
        }
    }, 30000); // 30 second timeout for DB setup

    // Clean up test data after all tests
    afterAll(async () => {
        if (pgPool) {
            try {
                // Delete test user from database
                await pgPool.query('DELETE FROM users WHERE email = $1', [testUser.email]);
            } catch (error) {
                // Ignore errors during cleanup
            }
            
            // Close the pool to allow Jest to exit cleanly
            try {
                await pgPool.end();
            } catch (error) {
                // Ignore errors if pool is already closed
            }
        }
    }, 15000);

    // =========================================================
    // POST /api/auth/register tests
    // =========================================================
    describe('POST /api/auth/register', () => {
        it('should register a new user successfully', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send(testUser)
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Registration successful');
            expect(response.body.token).toBeDefined();
            expect(typeof response.body.token).toBe('string');
            expect(response.body.user).toBeDefined();
            expect(response.body.user.email).toBe(testUser.email);
            expect(response.body.user.username).toBe(testUser.username);
        });

        it('should reject duplicate email', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    email: testUser.email,
                    password: 'DifferentPassword123',
                    username: 'different-username',
                })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('email already exists');
        });

        it('should reject invalid email format', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    email: 'invalid-email-format',
                    password: 'TestPassword123',
                    username: 'testuser',
                })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Invalid email');
        });

        it('should reject weak password', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    email: 'newuser@example.com',
                    password: '123',
                    username: 'testuser',
                })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('8 characters');
        });

        it('should reject missing required fields', async () => {
            const response1 = await request(app)
                .post('/api/auth/register')
                .send({
                    password: 'TestPassword123',
                    username: 'testuser',
                })
                .expect(400);

            expect(response1.body.success).toBe(false);
            expect(response1.body.message).toContain('required');

            const response2 = await request(app)
                .post('/api/auth/register')
                .send({
                    email: 'test@example.com',
                    username: 'testuser',
                })
                .expect(400);

            expect(response2.body.success).toBe(false);
        });
    });

    // =========================================================
    // POST /api/auth/login tests
    // =========================================================
    describe('POST /api/auth/login', () => {
        it('should login successfully with valid credentials', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: testUser.email,
                    password: testUser.password,
                })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Login successful');
            expect(response.body.token).toBeDefined();
            expect(typeof response.body.token).toBe('string');
            expect(response.body.user).toBeDefined();
            expect(response.body.user.email).toBe(testUser.email);

            // Save token for protected route tests
            authToken = response.body.token;
        });

        it('should reject invalid email', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'nonexistent@example.com',
                    password: 'TestPassword123',
                })
                .expect(401);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Invalid email or password');
        });

        it('should reject incorrect password', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: testUser.email,
                    password: 'WrongPassword123',
                })
                .expect(401);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Invalid email or password');
        });

        it('should reject missing credentials', async () => {
            const response1 = await request(app)
                .post('/api/auth/login')
                .send({
                    password: 'TestPassword123',
                })
                .expect(400);

            expect(response1.body.success).toBe(false);
            expect(response1.body.message).toContain('required');
        });
    });

    // =========================================================
    // GET /api/auth/me (Protected Route) tests
    // =========================================================
    describe('GET /api/auth/me', () => {
        it('should return 401 without token', async () => {
            const response = await request(app)
                .get('/api/auth/me')
                .expect(401);

            expect(response.body.error).toBeDefined();
            expect(response.body.message).toContain('token');
        });

        it('should return 401 with invalid token', async () => {
            const response = await request(app)
                .get('/api/auth/me')
                .set('Authorization', 'Bearer invalid-token-12345')
                .expect(401);

            expect(response.body.error).toBeDefined();
            expect(response.body.message).toContain('invalid');
        });

        it('should return 401 with malformed Authorization header', async () => {
            const response = await request(app)
                .get('/api/auth/me')
                .set('Authorization', 'invalid-token-12345')
                .expect(401);

            expect(response.body.error).toBeDefined();
        });

        it('should return user profile with valid token', async () => {
            const response = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.user).toBeDefined();
            expect(response.body.user.email).toBe(testUser.email);
            expect(response.body.user.username).toBe(testUser.username);
        });
    });
});
