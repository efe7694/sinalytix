import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { ApiErrorFilter } from './common/api-error.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ trustProxy: true, genReqId: () => randomUUID() }),
  );
  app.useGlobalFilters(new ApiErrorFilter());
  app.setGlobalPrefix('v1');

  const port = Number(process.env.PORT ?? 8080);
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`core-api listening on :${port}`);
}

bootstrap();
