import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log:
        process.env.NODE_ENV === 'development'
          ? ['warn', 'error']
          : ['warn', 'error'],
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Database connection established');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('Database connection closed');
  }

  /**
   * Truncates all tables — for use in tests ONLY.
   * Throws in production to prevent accidental data loss.
   */
  async cleanDatabase(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('cleanDatabase is not allowed in production');
    }

    const tableNames = [
      'audit_logs',
      'reports',
      'user_blocks',
      'notifications',
      'messages',
      'conversation_members',
      'conversations',
      'opportunity_bookmarks',
      'opportunities',
      'question_bookmarks',
      'answers',
      'questions',
      'resources',
      'calendar_items',
      'event_attendees',
      'events',
      'announcements',
      'bookmarks',
      'reactions',
      'comments',
      'posts',
      'organization_members',
      'organizations',
      'group_members',
      'groups',
      'course_enrollments',
      'courses',
      'programmes',
      'departments',
      'faculties',
      'fcm_tokens',
      'verification_requests',
      'password_resets',
      'email_verifications',
      'refresh_tokens',
      'sessions',
      'profiles',
      'users',
      'institutions',
    ];

    for (const table of tableNames) {
      await this.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
    }
  }
}
