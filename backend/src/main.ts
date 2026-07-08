import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import * as express from 'express';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Prefijo global de API
  app.setGlobalPrefix('api/v1');

  // Validaciones globales
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Aumentar límite de payload para imágenes base64 grandes (ej. 15MB)
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ limit: '15mb', extended: true }));

  // Filtro de excepciones global
  app.useGlobalFilters(new HttpExceptionFilter());

  // Interceptor de logs global
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Habilitar CORS
  app.enableCors({
    origin: true, // En desarrollo permitimos cualquier origen con credenciales
    credentials: true,
  });

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
  await app.listen(port);
  logger.log(`🚀 Servidor ejecutándose en: http://localhost:${port}/api/v1`);
}
bootstrap();
