import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { UnprocessableEntityException, ValidationPipe, VersioningType } from '@nestjs/common';
import { HttpResponseInterceptor } from './libs/http/response.interceptor';
import { setupSwagger } from './swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix(process.env.API_PREFIX ?? 'api');
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      exceptionFactory: (errors) => {
        const formattedErrors = errors.map((err) => ({
          field: err.property,
          errors: Object.values(err.constraints ?? {}),
        }));

        return new UnprocessableEntityException({
          message: 'Unexceptable Entity',
          statusCode: 422,
          errors: formattedErrors,
        });
      },
    }),
  );
  app.enableVersioning({
    type: VersioningType.URI,
  });
  app.useGlobalInterceptors(new HttpResponseInterceptor());
  setupSwagger(app);
  await app.listen(process.env.API_PORT ?? 8000);
}
bootstrap();
