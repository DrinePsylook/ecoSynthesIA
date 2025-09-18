import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import { fileURLToPath } from 'url';

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
export const runMigrations = async (pool: Pool) => {
    try {
        console.log('Running migrations...');

        // First, ensure migrations table exists to track applied migrations
        await createMigrationsTable(pool);

        // Create vector extension if APP_ENV is cicd
        if (process.env.APP_ENV === 'cicd' || process.env.APP_ENV === 'local') {
            console.log('Creating vector extension for cicd environment...');
            await pool.query(`CREATE EXTENSION IF NOT EXISTS vector;`);
            console.log('Vector extension created or already exists.');
        }

        // Get all sql migration files
        const migrationsDir = path.join(__dirname);
        const migrationFiles = fs.readdirSync(migrationsDir)
            .filter(file => file.endsWith('.sql'))
            .sort(); // sort to ensure migrations run in order (001_, 002_, etc.)

        console.info('running migration files', migrationFiles);

        // Get already applied migrations
        const appliedMigrations = await getAppliedMigrations(pool);

        // run migrations that haven't been applied yet
        for (const file of migrationFiles) {
            if (!appliedMigrations.includes(file)) {
                console.log(`Applying migration: ${file}`);

                const filePath = path.join(migrationsDir, file);
                const sql = fs.readFileSync(filePath, 'utf-8');

                // run migration inside a transaction
                const client = await pool.connect();
                try {
                    await client.query('BEGIN');
                    await client.query(sql);
                    await client.query(`
                        INSERT INTO migrations (name)
                        VALUES ($1)
                        `, [file]);
                    await client.query('COMMIT');
                    console.log(`Migration ${file} applied successfully`);
                } catch (error) {
                    await client.query('ROLLBACK');
                    console.error(`Error applying migration ${file}:`, error);
                    throw error; // rethrow to stop further migrations
                } finally {
                    client.release();
                }
            }
        }
        console.log('All migrations applied successfully.');
    } catch (error) {
        console.error('Migration process failed:', error);
        throw error;
    }
};
