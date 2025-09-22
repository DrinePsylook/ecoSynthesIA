import { Pool, QueryResult } from 'pg';

export let pgPool: Pool | null = null;

export const connectToDatabase = async () => {
    let clientOptions: any = {};
    clientOptions = {
        host: process.env.POSTGRES_HOST || 'db_ecosynthesia',
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
        console.log('Database connected successfully');
    } catch (error) {
        console.error('Database connection failed', error);
    }
};

export const queryResultHasRows = (queryResult: QueryResult<any>) => {
    return queryResult.rowCount ? queryResult.rowCount > 0 : false;
};