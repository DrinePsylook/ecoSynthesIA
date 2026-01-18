import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import { fileURLToPath } from 'url';
import logger from '../../src/utils/logger';

/**
 * Create database if it doesn't exist
 */
async function createDatabaseIfNotExists() {
    // Connection to the 'postgres' database to create our BDD
    const adminPool = new Pool({
        host: process.env.POSTGRES_HOST || 'localhost',
        port: parseInt(process.env.POSTGRES_PORT || '5432'),
        user: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD,
        database: 'postgres', // Connection to postgres to create our BDD
    });

    try {
        // Check if the database exists
        const result = await adminPool.query(
            "SELECT 1 FROM pg_database WHERE datname = $1",
            [process.env.POSTGRES_DB]
        );

        if (result.rows.length === 0) {
            logger.info({ database: process.env.POSTGRES_DB }, 'Creating database');
            await adminPool.query(`CREATE DATABASE "${process.env.POSTGRES_DB}"`);
            logger.info('Database created successfully');
        } else {
            logger.debug('Database already exists');
        }
    } finally {
        await adminPool.end();
    }
}

/**
 * Create migrations table if it doesn't exist
 */
async function createMigrationsTable(pool: Pool) {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS migrations (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `);
}

/**
 * Get list of already applied migrations
 */
async function getAppliedMigrations(pool: Pool): Promise<string[]> {
    const result = await pool.query(`
        SELECT name
        FROM migrations
        ORDER BY id
    `);
    return result.rows.map(row => row.name);
}

/**
 * Simple migration runner that executes sql files in order
 */
export const runMigrations = async (pool: Pool | null = null) => {
    try {
        logger.info('Running migrations...');

        // 1. Create the database if it doesn't exist
        await createDatabaseIfNotExists();

        // 2. If no pool provided, create one
        if (!pool) {
            const { connectToDatabase } = await import('../database');
            await connectToDatabase();
            pool = (await import('../database')).pgPool;
        }

        if (!pool) {
            throw new Error('Could not establish database connection');
        }

        // 3. Create the migrations table
        await createMigrationsTable(pool);

        // 3. Create the vector extension if necessary
        if (process.env.APP_ENV === 'cicd' || process.env.APP_ENV === 'local') {
            logger.debug('Creating vector extension...');
            await pool.query(`CREATE EXTENSION IF NOT EXISTS vector;`);
            logger.debug('Vector extension created or already exists.');
        }

        // 4. Execute the SQL migrations
        const migrationsDir = path.join(__dirname);
        const migrationFiles = fs.readdirSync(migrationsDir)
            .filter(file => file.endsWith('.sql'))
            .sort(); // sort to ensure migrations run in order (001_, 002_, etc.)

        logger.info({ files: migrationFiles }, 'Running migration files');

        // Get already applied migrations
        const appliedMigrations = await getAppliedMigrations(pool);

        for (const file of migrationFiles) {
            if (!appliedMigrations.includes(file)) {
                logger.info({ file }, 'Applying migration');

                const filePath = path.join(migrationsDir, file);
                const sql = fs.readFileSync(filePath, 'utf-8');

                const client = await pool.connect();
                try {
                    await client.query('BEGIN');
                    await client.query(sql);
                    await client.query(`
                        INSERT INTO migrations (name)
                        VALUES ($1)
                        `, [file]);
                    await client.query('COMMIT');
                    logger.info({ file }, 'Migration applied successfully');
                } catch (error) {
                    await client.query('ROLLBACK');
                    logger.error({ err: error, file }, 'Error applying migration');
                    throw error; // rethrow to stop further migrations
                } finally {
                    client.release();
                }
            }
        }
        logger.info('All migrations applied successfully.');
    } catch (error) {
        logger.error({ err: error }, 'Migration process failed');
        throw error;
    }
};
