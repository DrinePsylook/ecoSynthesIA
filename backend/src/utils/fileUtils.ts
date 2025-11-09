import axios from 'axios';
import * as fs from 'fs/promises';
import { createWriteStream } from 'fs';
import * as path from 'path';
import { BUCKET_PATH, ROOT_DIR } from '../constants';

/** 
 * Downloads a file from a URL to a local file path.
 * @param fileUrl The URL of the file to download (document storage_path)
 * @param localFilePath The local path where the file should be stored.
 */
export const downloadFile = async (
    fileUrl: string,
    localFilePath: string
): Promise<void> => {
    try {
        await fs.mkdir(path.dirname(localFilePath), {recursive: true});

        const response = await axios({
            method: 'GET',
            url: fileUrl,
            responseType: 'stream' // manage big files
        });

        const writer = createWriteStream(localFilePath)
        response.data.pipe(writer)

        await new Promise<void>((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Error downloading file from ${fileUrl}:`, error);
        throw new Error(`Download failed: ${errorMessage}`);
    }
};

/**
 * Deletes a file from the local file system.
 * @param filePath The path of the file to delete.
 */
export const deleteLocalFile = async (
    localFilePath: string
): Promise<void> => {
    try {
        await fs.unlink(localFilePath);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn(`Warning: Could not delete file ${localFilePath}: ${errorMessage}`);
    }
};

/**
 * Downloads a document to the bucket/reportAPI directory
 * @param fileUrl The URL of the file to download (document storage_path)
 * @param documentId The document ID to use for the filename
 * @returns The local file path where the file was saved
 */
export const downloadDocumentToBucket = async (
    fileUrl: string,
    documentId: number
): Promise<string> => {
    // Get the file extension from the URL or default to .pdf
    const urlPath = new URL(fileUrl).pathname;
    const fileExtension = path.extname(urlPath) || '.pdf';
    
    // Construct the path: bucket/reportAPI/document_{id}.pdf
    // Uses BUCKET_PATH constant from constants.ts
    const bucketPath = path.join(BUCKET_PATH, 'reportAPI');
    const fileName = `document_${documentId}${fileExtension}`;
    const localFilePath = path.join(bucketPath, fileName);

    // Download the file
    await downloadFile(fileUrl, localFilePath);
    
    return localFilePath;
};

/**
 * Gets the URL or path that can be used to access the file in the bucket
 * This will be sent to the IA service
 * @param localFilePath The local file path in the bucket
 * @returns A path or URL that the IA service can use to access the file
 */
export const getBucketFilePath = (localFilePath: string): string => {
    // Return the relative path from project root
    // Uses ROOT_DIR constant from constants.ts
    return path.relative(ROOT_DIR, localFilePath);
};