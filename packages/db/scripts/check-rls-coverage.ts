/**
 * CI guard for Module 3 §9.2: "RLS policy'leri migration'ın parçasıdır...
 * yeni tablo RLS'siz merge edilemez." Every `CREATE TABLE` in a migration
 * file must have a matching `ENABLE ROW LEVEL SECURITY` for the same table
 * in the same file. Doesn't validate policy *correctness* (the RLS-leak
 * test suite in services/core-api/test does that) — just that no one merges
 * a new table and forgets RLS entirely.
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const MIGRATIONS_DIR = path.resolve(__dirname, '../migrations');

function main(): void {
  const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.js'));
  const violations: string[] = [];

  for (const file of files) {
    const content = readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    const createdTables = [...content.matchAll(/CREATE TABLE\s+(\w+)/gi)].map((m) => m[1]);
    for (const table of createdTables) {
      const rlsPattern = new RegExp(`ALTER TABLE\\s+${table}\\s+ENABLE ROW LEVEL SECURITY`, 'i');
      if (!rlsPattern.test(content)) {
        violations.push(`${file}: table "${table}" created without ENABLE ROW LEVEL SECURITY in the same file`);
      }
    }
  }

  if (violations.length > 0) {
    console.error('RLS coverage check failed:\n' + violations.map((v) => `  - ${v}`).join('\n'));
    process.exitCode = 1;
    return;
  }
  console.log(`RLS coverage check passed (${files.length} migration files scanned).`);
}

main();
