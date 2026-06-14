import { pool } from './connection.js';
import { migrate } from './schema.js';
import { logger } from '../logger/index.js';

await migrate(pool);
logger.info('database migrated');
await pool.end();
