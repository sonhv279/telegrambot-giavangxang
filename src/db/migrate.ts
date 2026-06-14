import { getPool } from './connection.js';
import { migrate } from './schema.js';
import { logger } from '../logger/index.js';

const pool = getPool();
await migrate(pool);
logger.info('database migrated');
await pool.end();
