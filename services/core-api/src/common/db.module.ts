import { Global, Module } from '@nestjs/common';
import { createDb, createPool } from '@sinalytix/db';
import type { Database } from '@sinalytix/db';
import type { Kysely } from 'kysely';
import type { Pool } from 'pg';

export const KYSELY = Symbol('KYSELY');
export const PG_POOL = Symbol('PG_POOL');

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      useFactory: (): Pool => {
        // Non-owner role — RLS policies don't apply to a table's owner
        // (DATABASE_URL, migrations-only). See DEVIATIONS.md D7.
        const connectionString = process.env.APP_DATABASE_URL;
        if (!connectionString) {
          throw new Error('APP_DATABASE_URL is not set');
        }
        return createPool(connectionString);
      },
    },
    {
      provide: KYSELY,
      useFactory: (pool: Pool): Kysely<Database> => createDb(pool),
      inject: [PG_POOL],
    },
  ],
  exports: [KYSELY, PG_POOL],
})
export class DbModule {}
