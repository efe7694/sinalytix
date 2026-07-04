/**
 * Sets sinalytix_app's password (idempotent) to match APP_DATABASE_URL's
 * credentials. The role itself is created by migration 0007_app-role.js;
 * this script only sets the password, kept out of committed SQL.
 */
import { Client } from 'pg';

async function main() {
  const ownerUrl = process.env.DATABASE_URL;
  const appUrl = process.env.APP_DATABASE_URL;
  if (!ownerUrl) throw new Error('DATABASE_URL is not set');
  if (!appUrl) throw new Error('APP_DATABASE_URL is not set');

  const appPassword = new URL(appUrl).password;
  if (!appPassword) throw new Error('APP_DATABASE_URL has no password');

  const client = new Client({ connectionString: ownerUrl });
  await client.connect();
  try {
    await client.query(`ALTER ROLE sinalytix_app WITH LOGIN PASSWORD '${appPassword.replace(/'/g, "''")}'`);
    console.log('sinalytix_app password set');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
