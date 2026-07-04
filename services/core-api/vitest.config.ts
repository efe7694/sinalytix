import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Vitest's default esbuild transform doesn't support emitDecoratorMetadata,
  // which NestJS's constructor-injection DI relies on — swap in SWC (reads
  // .swcrc: legacyDecorator + decoratorMetadata) for real Nest apps under test.
  plugins: [swc.vite()],
  test: {
    environment: 'node',
    globals: false,
    testTimeout: 20_000,
    hookTimeout: 30_000,
    fileParallelism: false, // shared test Postgres/Redis — avoid cross-test truncate races
    include: ['test/**/*.test.ts'],
  },
});
