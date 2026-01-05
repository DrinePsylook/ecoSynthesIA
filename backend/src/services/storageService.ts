import * as fs from 'fs/promises';
import * as path from 'path';
import { BUCKET_PATH } from '../constants';

/**
 * Supported avatar MIME types and their extensions
 */
const MIME_TO_EXTENSION: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
};

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

/**
 * Service for managing user files in the bucket storage
 * User files are stored in: bucket/user/{userId}/
 */
export class StorageService {

    /**
     * Gets the directory path for a user's files
     * @param userId - The user ID
     * @returns The full path to the user's directory in the bucket
     */
    private static getUserDirectory(userId: number): string {
        return path.join(BUCKET_PATH, 'user', String(userId));
    }

    /**
     * Ensures the user directory exists, creating it if necessary
     * @param userId - The user ID
     */
    private static async ensureUserDirectory(userId: number): Promise<void> {
        const userDir = this.getUserDirectory(userId);
        await fs.mkdir(userDir, { recursive: true });
    }

    /**
     * Deletes all files in a user's directory (useful when deleting a user account)
     * @param userId - The user ID
     * @returns True if the directory was deleted, false otherwise
     */
    static async deleteUserDirectory(userId: number): Promise<boolean> {
        const userDir = this.getUserDirectory(userId);

        try {
            await fs.rm(userDir, { recursive: true, force: true });
            console.log(`User directory deleted: ${userDir}`);
            return true;
        } catch (error) {
            console.error(`Error deleting user directory for user ${userId}:`, error);
            return false;
        }
    }

    // ==================== Avatar Management ====================

    /**
     * Finds existing avatar file for a user (any supported extension)
     * @param userId - The user ID
     * @returns The full path to the avatar file if it exists, null otherwise
     */
    static async findExistingAvatar(userId: number): Promise<string | null> {
        const userDir = this.getUserDirectory(userId);

        try {
            const files = await fs.readdir(userDir);
            const avatarFile = files.find(file => {
                const ext = path.extname(file).toLowerCase();
                return file.startsWith('avatar') && ALLOWED_EXTENSIONS.includes(ext);
            });

            return avatarFile ? path.join(userDir, avatarFile) : null;
        } catch (error) {
            // Directory doesn't exist or can't be read
            return null;
        }
    }

    /**
     * Saves an avatar file for a user
     * Replaces any existing avatar file
     * @param userId - The user ID
     * @param fileBuffer - The file content as a Buffer
     * @param mimeType - The MIME type of the file (e.g., 'image/png')
     * @returns The relative path to the saved avatar (for storing in DB)
     * @throws Error if the MIME type is not supported
     */
    static async saveAvatar(
        userId: number,
        fileBuffer: Buffer,
        mimeType: string
    ): Promise<string> {
        // Validate MIME type
        const extension = MIME_TO_EXTENSION[mimeType.toLowerCase()];
        if (!extension) {
            throw new Error(
                `Unsupported image type: ${mimeType}. ` +
                `Allowed types: ${Object.keys(MIME_TO_EXTENSION).join(', ')}`
            );
        }

        // Delete existing avatar if any
        await this.deleteAvatar(userId);

        // Ensure user directory exists
        await this.ensureUserDirectory(userId);

        // Build file path
        const fileName = `avatar${extension}`;
        const fullPath = path.join(this.getUserDirectory(userId), fileName);
        const relativePath = path.join('bucket', 'user', String(userId), fileName);

        // Write the file
        await fs.writeFile(fullPath, fileBuffer);

        console.log(`Avatar saved for user ${userId}: ${relativePath}`);

        return relativePath;
    }

    /**
     * Gets the avatar file path for a user
     * @param userId - The user ID
     * @returns The relative path to the avatar if it exists, null otherwise
     */
    static async getAvatarPath(userId: number): Promise<string | null> {
        const fullPath = await this.findExistingAvatar(userId);

        if (!fullPath) {
            return null;
        }

        // Convert full path to relative path from project root
        const relativePath = path.relative(path.dirname(BUCKET_PATH), fullPath);
        return relativePath;
    }

    /**
     * Gets the avatar file content as a Buffer
     * @param userId - The user ID
     * @returns The file content as a Buffer if it exists, null otherwise
     */
    static async getAvatarBuffer(userId: number): Promise<Buffer | null> {
        const fullPath = await this.findExistingAvatar(userId);

        if (!fullPath) {
            return null;
        }

        try {
            return await fs.readFile(fullPath);
        } catch (error) {
            console.error(`Error reading avatar for user ${userId}:`, error);
            return null;
        }
    }

    /**
     * Gets avatar metadata (path, size, mime type)
     * @param userId - The user ID
     * @returns Avatar metadata if it exists, null otherwise
     */
    static async getAvatarMetadata(userId: number): Promise<{
        path: string;
        fullPath: string;
        size: number;
        mimeType: string;
    } | null> {
        const fullPath = await this.findExistingAvatar(userId);

        if (!fullPath) {
            return null;
        }

        try {
            const stats = await fs.stat(fullPath);
            const ext = path.extname(fullPath).toLowerCase();

            // Reverse lookup MIME type from extension
            const mimeType = Object.entries(MIME_TO_EXTENSION)
                .find(([, e]) => e === ext)?.[0] || 'application/octet-stream';

            return {
                path: path.relative(path.dirname(BUCKET_PATH), fullPath),
                fullPath,
                size: stats.size,
                mimeType,
            };
        } catch (error) {
            console.error(`Error getting avatar metadata for user ${userId}:`, error);
            return null;
        }
    }

    /**
     * Deletes the avatar file for a user
     * @param userId - The user ID
     * @returns True if an avatar was deleted, false if no avatar existed
     */
    static async deleteAvatar(userId: number): Promise<boolean> {
        const fullPath = await this.findExistingAvatar(userId);

        if (!fullPath) {
            return false;
        }

        try {
            await fs.unlink(fullPath);
            console.log(`Avatar deleted for user ${userId}: ${fullPath}`);
            return true;
        } catch (error) {
            console.error(`Error deleting avatar for user ${userId}:`, error);
            return false;
        }
    }

    /**
     * Checks if a user has an avatar
     * @param userId - The user ID
     * @returns True if the user has an avatar, false otherwise
     */
    static async hasAvatar(userId: number): Promise<boolean> {
        const avatarPath = await this.findExistingAvatar(userId);
        return avatarPath !== null;
    }

    // ==================== DOCUMENT STORAGE ====================

    /**
     * Gets the documents directory path for a user
     * @param userId - The user ID
     * @returns The full path to the user's documents directory
     */
    private static getUserDocumentsDirectory(userId: number): string {
        return path.join(BUCKET_PATH, 'user', String(userId), 'documents');
    }

    /**
     * Ensures the user's documents directory exists
     * @param userId - The user ID
     */
    private static async ensureUserDocumentsDirectory(userId: number): Promise<void> {
        const docsDir = this.getUserDocumentsDirectory(userId);
        await fs.mkdir(docsDir, { recursive: true });
    }

    /**
     * Saves a document file for a user
     * @param userId - The user ID
     * @param fileBuffer - The file content as a Buffer
     * @param originalFileName - The original file name (to preserve extension)
     * @returns The relative path to the saved document (for storing in DB)
     */
    static async saveDocument(
        userId: number,
        fileBuffer: Buffer,
        originalFileName: string
    ): Promise<string> {
        // Ensure documents directory exists
        await this.ensureUserDocumentsDirectory(userId);

        // Generate unique filename: timestamp_originalname
        const timestamp = Date.now();
        const sanitizedFilename = originalFileName
            .replace(/[^a-z0-9._-]/gi, '_')
            .substring(0, 100);
        const fileName = `${timestamp}_${sanitizedFilename}`;

        const fullPath = path.join(this.getUserDocumentsDirectory(userId), fileName);
        const relativePath = path.join('bucket', 'user', String(userId), 'documents', fileName);

        await fs.writeFile(fullPath, fileBuffer);
        console.log(`Document saved for user ${userId}: ${relativePath}`);

        return relativePath;
    }

    /**
     * Deletes a document file
     * @param relativePath - The relative path stored in the database
     * @returns True if the file was deleted, false otherwise
     */
    static async deleteDocument(relativePath: string): Promise<boolean> {
        try {
            const fullPath = path.join(path.dirname(BUCKET_PATH), relativePath);
            await fs.unlink(fullPath);
            console.log(`Document deleted: ${relativePath}`);
            return true;
        } catch (error) {
            console.error(`Error deleting document ${relativePath}:`, error);
            return false;
        }
    }
}