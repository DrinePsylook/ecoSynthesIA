import dotenv from 'dotenv';
import path from 'path';

import { connectToDatabase, pgPool } from '../../database/database';
import { processPendingDocuments } from '../services/documentProcessingService';
import logger from '../utils/logger';

// Load environment variables from backend .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Script to process all pending documents through the AI analysis pipeline.
 * Can be run directly with: npx ts-node src/scripts/runProcessPending.ts
 * Or with a specific document ID: npx ts-node src/scripts/runProcessPending.ts --doc=123
 * 
 * This script bypasses the API authentication, making it suitable for:
 * - Cron jobs
 * - Manual batch processing
 * - Development/testing
 */
async function main() {
    logger.info('Starting document processing script');

    // Parse command line arguments for optional document ID
    const args = process.argv.slice(2);
    let documentId: number | undefined;

    for (const arg of args) {
        if (arg.startsWith('--doc=')) {
            const value = parseInt(arg.split('=')[1], 10);
            if (!isNaN(value)) {
                documentId = value;
                logger.info({ documentId }, 'Processing specific document');
            }
        }
    }

    try {
        // Initialize database connection
        await connectToDatabase();
        logger.info('Database connected');

        // Run the processing
        const summary = await processPendingDocuments(documentId);

        // Log results
        logger.info({
            totalFound: summary.totalFound,
            alreadyProcessed: summary.alreadyProcessed,
            needsProcessing: summary.needsProcessing,
            processed: summary.processed,
            failed: summary.failed,
        }, 'Processing complete');

        // Log details for failed documents
        const failedDocs = summary.documents.filter(d => !d.success && d.needsProcessing);
        if (failedDocs.length > 0) {
            logger.warn({ failedDocuments: failedDocs.map(d => ({ id: d.documentId, error: d.error })) }, 'Some documents failed');
        }

        // Exit with appropriate code
        if (summary.failed > 0) {
            process.exit(1); // Partial failure
        }
        process.exit(0); // Success

    } catch (error) {
        logger.fatal({ err: error }, 'Script failed');
        process.exit(1);
    } finally {
        // Close database connection pool
        if (pgPool) {
            await pgPool.end();
            logger.info('Database pool closed');
        }
    }
}

// Execute the script
main();
