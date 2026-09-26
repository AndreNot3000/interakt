import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import storageConfig from './config/storage.config';
import emailConfig from './config/email.config';
import { DatabaseModule } from './database/database.module';
import { StorageModule } from './modules/storage/storage.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { InstitutionsModule } from './modules/institutions/institutions.module';
import { FacultiesModule } from './modules/faculties/faculties.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { ProgrammesModule } from './modules/programmes/programmes.module';
import { CoursesModule } from './modules/courses/courses.module';
import { GroupsModule } from './modules/groups/groups.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { PostsModule } from './modules/posts/posts.module';
import { CommentsModule } from './modules/comments/comments.module';
import { ReactionsModule } from './modules/reactions/reactions.module';
import { EventsModule } from './modules/events/events.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { MessagesModule } from './modules/messages/messages.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ResourcesModule } from './modules/resources/resources.module';
import { OpportunitiesModule } from './modules/opportunities/opportunities.module';
import { QuestionsModule } from './modules/questions/questions.module';
import { SearchModule } from './modules/search/search.module';
import { ReportsModule } from './modules/reports/reports.module';
import { AnnouncementsModule } from './modules/announcements/announcements.module';
import { AdminModule } from './modules/admin/admin.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

@Module({
  imports: [
    // Global configuration with validation
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig, storageConfig, emailConfig],
      envFilePath: ['.env.local', '.env'],
      expandVariables: true,
    }),

    // Rate limiting — tiered to allow normal use while blocking abuse
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 15 },    // 15 req/sec burst
      { name: 'medium', ttl: 60000, limit: 200 },  // 200 req/min
      { name: 'long', ttl: 900000, limit: 1000 },  // 1000 req/15min
    ]),

    // Infrastructure
    DatabaseModule,
    StorageModule,

    // Feature modules
    AuthModule,
    UsersModule,
    InstitutionsModule,
    FacultiesModule,
    DepartmentsModule,
    ProgrammesModule,
    CoursesModule,
    GroupsModule,
    OrganizationsModule,
    PostsModule,
    CommentsModule,
    ReactionsModule,
    EventsModule,
    CalendarModule,
    MessagesModule,
    NotificationsModule,
    ResourcesModule,
    OpportunitiesModule,
    QuestionsModule,
    SearchModule,
    ReportsModule,
    AnnouncementsModule,
    AdminModule,
  ],
  providers: [
    // Apply JWT auth globally — use @Public() decorator to opt out
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Apply roles guard globally — use @Roles() decorator to require specific roles
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
