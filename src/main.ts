import './bootstrap-env';
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpLoggingInterceptor } from './common/interceptors/http-logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: true, credentials: true });
  app.useGlobalInterceptors(new HttpLoggingInterceptor());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Meet & Connect API')
    .setDescription('REST + Socket.IO for dating / call simulation (no WebRTC).')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument);
  SwaggerModule.setup('api-docs', app, swaggerDocument);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  Logger.log(
    `API http://localhost:${port}  Swagger /docs and /api-docs`,
    'Bootstrap',
  );
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
