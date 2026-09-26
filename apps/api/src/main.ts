import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AppValidationPipe } from './common/pipes/validation.pipe';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: process.env.NODE_ENV === 'development',
    }),
  );

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port', 3001);
  const clientUrl = configService.get<string>('app.clientUrl', 'http://localhost:3000');

  // Security headers
  await app.register(require('@fastify/helmet'), {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"], // Allow Swagger UI
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  });

  // CORS
  await app.register(require('@fastify/cors'), {
    origin: [clientUrl, /\.interakt\.app$/],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // Global API prefix
  app.setGlobalPrefix('api/v1');

  // Global exception filter — standardized error responses
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global response transformer — wraps all responses in { success, data, message }
  app.useGlobalInterceptors(new TransformInterceptor());

  // Global validation pipe
  app.useGlobalPipes(new AppValidationPipe());

  // OpenAPI documentation (development + staging only)
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Interakt API')
      .setDescription(
        'University Campus Platform API — connecting students, academics, events, and opportunities.',
      )
      .setVersion('1.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
      .addTag('auth', 'Authentication & Session Management')
      .addTag('users', 'User Profiles & Management')
      .addTag('institutions', 'Institution Management')
      .addTag('faculties', 'Faculty Management')
      .addTag('departments', 'Department Management')
      .addTag('programmes', 'Programme Management')
      .addTag('courses', 'Course Communities')
      .addTag('groups', 'Student Groups')
      .addTag('organizations', 'Clubs & Organizations')
      .addTag('posts', 'Posts & Feed')
      .addTag('comments', 'Comments & Replies')
      .addTag('events', 'Campus Events')
      .addTag('calendar', 'Campus Calendar')
      .addTag('messages', 'Direct Messaging')
      .addTag('notifications', 'Notifications')
      .addTag('search', 'Global Search')
      .addTag('resources', 'Academic Resources')
      .addTag('opportunities', 'Internships & Opportunities')
      .addTag('questions', 'Academic Q&A')
      .addTag('reports', 'Content Moderation')
      .addTag('announcements', 'Campus Announcements')
      .addTag('admin', 'University Administration')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
      },
    });

    logger.log(`📖 API Docs: http://localhost:${port}/api/docs`);
  }

  await app.listen(port, '0.0.0.0');
  logger.log(`🚀 Interakt API running on port ${port}`);
  logger.log(`🌍 Environment: ${process.env.NODE_ENV ?? 'development'}`);
}

bootstrap();
