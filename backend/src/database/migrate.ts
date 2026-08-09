import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Pool } from 'pg';

async function runMigration() {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    const migrationPath = join(
      process.cwd(),
      'src',
      'database',
      'migrations',
      '001_initial.sql',
    );

    const sql = await readFile(migrationPath, 'utf-8');

    await pool.query(sql);

    console.log('Database migration completed successfully.');
  } catch (error) {
    console.error('Database migration failed:', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

runMigration();