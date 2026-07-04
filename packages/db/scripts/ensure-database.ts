/**
 * Creates the target database from DATABASE_URL if it doesn't exist yet.
 * Connects to the server's maintenance `postgres` database to issue
 * CREATE DATABASE, since you can't create a database while connected to it.
 */
import { Client } from 'pg';

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set');
  }

  const targetUrl = new URL(databaseUrl);
  const targetDb = targetUrl.pathname.replace(/^\//, '');
  if (!targetDb) {
    throw new Error('DATABASE_URL has no database name');
  }

  const adminUrl = new URL(databaseUrl);
  adminUrl.pathname = '/postgres';

  const client = new Client({ connectionString: adminUrl.toString() });
  await client.connect();
  try {
    const { rows } = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [targetDb]);
    if (rows.length === 0) {
      await client.query(`CREATE DATABASE "${targetDb}"`);
      console.log(`Created database "${targetDb}"`);
    } else {
      console.log(`Database "${targetDb}" already exists`);
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
