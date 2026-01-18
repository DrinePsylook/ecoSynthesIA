import { Pool, QueryResult } from 'pg';
import logger from '../src/utils/logger';

export let pgPool: Pool | null = null;

export const connectToDatabase = async () => {
    let clientOptions: any = {};
    clientOptions = {
        host: process.env.POSTGRES_HOST || (process.env.APP_ENV === 'local' ? 'localhost' : 'db_ecosynthesia'),        
        password: process.env.POSTGRES_PASSWORD,
        port: 5432,
        user: process.env.POSTGRES_USER,
    }
    pgPool = new Pool({
        ...clientOptions,
        database: process.env.POSTGRES_DB,
        max: parseInt(process.env.PG_POOL_SIZE || '10'),
    });

    try {
        const client = await pgPool.connect();
        await client.query('SELECT 1');
        client.release();
        logger.info('Database connected successfully');
    } catch (error) {
        logger.error({ err: error }, 'Database connection failed');
    }
};

export const queryResultHasRows = (queryResult: QueryResult<any>) => {
    return queryResult.rowCount ? queryResult.rowCount > 0 : false;
};