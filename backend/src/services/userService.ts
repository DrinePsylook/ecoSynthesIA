import { pgPool, queryResultHasRows } from "../../database/database";
import { User, UserUpdatePayload } from "../models/userModel";
import { StorageService } from "./storageService";

export class UserService {

    /**
     * Creates a new user
     * @param user - The user to create
     * @returns The created user if successful, null otherwise
     */
    static async createUser(user: User): Promise<User | null> {
        if (!pgPool) {
            console.error('PostgreSQL pool is not initialized');
            return null;
        }

        const client = await pgPool.connect();
        try {
            await client.query('BEGIN');

            const result = await client.query(
                `INSERT INTO users (avatar_path, email, password_hash, preferred_language, username) 
                VALUES ($1, $2, $3, $4, $5) RETURNING *`, 
                [user.avatar_path, user.email, user.password_hash, user.preferred_language || 'en', user.username]);

            await client.query('COMMIT');

            return result.rows[0] || null;
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error creating user:', error);
            return null;
        } finally {
            client.release();
        }
    }

    /**
     * Delete a user account
     */
    static async deleteUser(id: number): Promise<boolean> {
        if (!pgPool) {
            console.error('PostgreSQL pool is not initialized');
            return false;
        }

        const client = await pgPool.connect();
        try {
            await client.query('BEGIN');

            const result = await client.query('DELETE FROM users WHERE id = $1', [id]);

            await client.query('COMMIT');

            return queryResultHasRows(result);
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error deleting user:', error);
            return false;
        } finally {
            client.release();
        }
    }

    /**
     * Finds a user by email
     * @param email - The email of the user to find
     * @returns The user if found, null otherwise
     */
    static async findUserByEmail(email: string): Promise<User | null> {
        if (!pgPool) {
            console.error('PostgreSQL pool is not initialized');
            return null;
        }

        const client = await pgPool.connect();
        try {
            const result = await client.query(
                'SELECT * FROM users WHERE LOWER(email) = LOWER($1)', 
                [email]
            );

            if (queryResultHasRows(result)) {
                return result.rows[0] as User;
            }

            return null;
        } catch (error) {
            console.error('Error finding user by email:', error);
            return null;
        } finally {
            client.release();
        }
    }

    static async findUserById(id: number): Promise<User | null> {
        if (!pgPool) {
            console.error('PostgreSQL pool is not initialized');
            return null;
        }

        const client = await pgPool.connect();
        try {
            const result = await client.query(
                'SELECT * FROM users WHERE id = $1', 
                [id]
            );

            if (queryResultHasRows(result)) {
                return result.rows[0] as User;
            }

            return null;
        } catch (error) {
            console.error('Error finding user by ID:', error);
            return null;
        } finally {
            client.release();
        }
    }

    /**
     * Finds a user by username
     * @param username - The username of the user to find
     * @returns The user if found, null otherwise
     */
    static async findUserByUsername(username: string): Promise<User | null> {
        if (!pgPool) {
            console.error('PostgreSQL pool is not initialized');
            return null;
        }

        const client = await pgPool.connect();
        try {
            const result = await client.query(
                'SELECT * FROM users WHERE LOWER(username) = LOWER($1)', 
                [username]
            );

            if (queryResultHasRows(result)) {
                return result.rows[0] as User;
            }

            return null;
        } catch (error) {
            console.error('Error finding user by username:', error);
            return null;
        } finally {
            client.release();
        }
    }

    /**
     * Updates a user
     * @param id - The ID of the user to update
     * @param updates - The updates to apply to the user
     * @returns The updated user if successful, null otherwise
     */
    static async updateUser(id: number, updates: UserUpdatePayload): Promise<User | null> {
        if (Object.keys(updates).length === 0) {
            return this.findUserById(id);
        }

        if (!pgPool) {
            console.error('PostgreSQL pool is not initialized');
            return null;
        }

        const client = await pgPool.connect();
        try {
            const setClauses = [];
            const queryParams = [];
            let paramIndex = 1;

            if (updates.avatar_path) {
                setClauses.push(`avatar_path = $${paramIndex++}`);
                queryParams.push(updates.avatar_path);
            }

            if (updates.email) {
                setClauses.push(`email = $${paramIndex++}`);
                queryParams.push(updates.email);
            }

            if (updates.preferred_language) {
                setClauses.push(`preferred_language = $${paramIndex++}`);
                queryParams.push(updates.preferred_language);
            }

            if (updates.username) {
                setClauses.push(`username = $${paramIndex++}`);
                queryParams.push(updates.username);
            }

            setClauses.push(`updated_at = CURRENT_TIMESTAMP`);

            queryParams.push(id);

            const result = await client.query(
                `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
                queryParams
            );

            return result.rows[0] || null;
        } finally {
            client.release();
        }            
    }

    /**
     * Updates the password for a user
     * @param id - The ID of the user to update
     * @param hashedPassword - The hashed password to set
     * @returns True if the password was updated, false otherwise
     */
    static async updateUserPassword(id: number, hashedPassword: string): Promise<boolean> {
        if (!pgPool) {
            console.error('PostgreSQL pool is not initialized');
            return false;
        }

        const client = await pgPool.connect();
        try {
            const result = await client.query(
                `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
                [hashedPassword, id]
            );

            if (result.rowCount === 0) {
                throw new Error("Couldn't update password");
            }

            return true;
        } catch (error) {
            console.error(`Error while updating password for user ${id}:`, error);
            return false;
        } finally {
            client.release();
        }
    }

    // ==================== Avatar Management ====================

    /**
     * Uploads a new avatar for a user
     * Saves the file to bucket/user/{id}/ and updates avatar_path in the database
     * @param userId - The ID of the user
     * @param fileBuffer - The avatar file content as a Buffer
     * @param mimeType - The MIME type of the file (e.g., 'image/png')
     * @returns The updated user if successful, null otherwise
     */
    static async uploadAvatar(
        userId: number,
        fileBuffer: Buffer,
        mimeType: string
    ): Promise<User | null> {
        try {
            // Save the avatar file to the bucket
            const avatarPath = await StorageService.saveAvatar(
                userId,
                fileBuffer,
                mimeType
            );

            // Update the user's avatar_path in the database
            return await this.updateUser(userId, { avatar_path: avatarPath });
        } catch (error) {
            console.error(`Error uploading avatar for user ${userId}:`, error);
            return null;
        }
    }

    /**
     * Gets the avatar file content for a user
     * @param userId - The ID of the user
     * @returns Object with buffer and mimeType if avatar exists, null otherwise
     */
    static async getAvatar(userId: number): Promise<{
        buffer: Buffer;
        mimeType: string;
        path: string;
    } | null> {
        const metadata = await StorageService.getAvatarMetadata(userId);

        if (!metadata) {
            return null;
        }

        const buffer = await StorageService.getAvatarBuffer(userId);

        if (!buffer) {
            return null;
        }

        return {
            buffer,
            mimeType: metadata.mimeType,
            path: metadata.path,
        };
    }

    /**
     * Removes the avatar for a user
     * Deletes the file from the bucket and clears avatar_path in the database
     * @param userId - The ID of the user
     * @returns The updated user if successful, null otherwise
     */
    static async removeAvatar(userId: number): Promise<User | null> {
        try {
            // Delete the avatar file from the bucket
            await StorageService.deleteAvatar(userId);

            // Clear the avatar_path in the database
            if (!pgPool) {
                console.error('PostgreSQL pool is not initialized');
                return null;
            }

            const client = await pgPool.connect();
            try {
                const result = await client.query(
                    `UPDATE users SET avatar_path = NULL, updated_at = CURRENT_TIMESTAMP 
                     WHERE id = $1 RETURNING *`,
                    [userId]
                );

                return result.rows[0] || null;
            } finally {
                client.release();
            }
        } catch (error) {
            console.error(`Error removing avatar for user ${userId}:`, error);
            return null;
        }
    }

    /**
     * Checks if a user has an avatar
     * @param userId - The ID of the user
     * @returns True if the user has an avatar, false otherwise
     */
    static async hasAvatar(userId: number): Promise<boolean> {
        return await StorageService.hasAvatar(userId);
    }

    /**
     * Deletes a user and all their associated files (including avatar)
     * Use this instead of deleteUser when you want to clean up the bucket too
     * @param userId - The ID of the user to delete
     * @returns True if successful, false otherwise
     */
    static async deleteUserWithFiles(userId: number): Promise<boolean> {
        try {
            // First delete all user files from the bucket
            await StorageService.deleteUserDirectory(userId);

            // Then delete the user from the database
            return await this.deleteUser(userId);
        } catch (error) {
            console.error(`Error deleting user ${userId} with files:`, error);
            return false;
        }
    }
}