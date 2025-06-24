import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://transcendence:imthebest@database_service:5432/db',
});

export default pool;