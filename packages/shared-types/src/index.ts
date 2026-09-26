export enum UserRole {
  STUDENT = 'STUDENT',
  UNIVERSITY_ADMIN = 'UNIVERSITY_ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export enum VerificationStatus {
  UNVERIFIED = 'UNVERIFIED',
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

export enum InstitutionStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export enum VerificationMethod {
  EMAIL_DOMAIN = 'EMAIL_DOMAIN',
  STUDENT_ID = 'STUDENT_ID',
  ADMISSION_NUMBER = 'ADMISSION_NUMBER',
  ADMIN_APPROVAL = 'ADMIN_APPROVAL',
  API_INTEGRATION = 'API_INTEGRATION',
}

export enum GroupType {
  ACADEMIC = 'ACADEMIC',
  SOCIAL = 'SOCIAL',
  SPORTS = 'SPORTS',
  PROFESSIONAL = 'PROFESSIONAL',
  RELIGIOUS = 'RELIGIOUS',
  CULTURAL = 'CULTURAL',
  HOBBY = 'HOBBY',
  OTHER = 'OTHER',
}

export enum PostType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  POLL = 'POLL',
  QUESTION = 'QUESTION',
  EVENT = 'EVENT',
  RESOURCE = 'RESOURCE',
  ANNOUNCEMENT = 'ANNOUNCEMENT',
}

export enum ReactionType {
  LIKE = 'LIKE',
  LOVE = 'LOVE',
  INSIGHTFUL = 'INSIGHTFUL',
  CELEBRATE = 'CELEBRATE',
  CURIOUS = 'CURIOUS',
}

export enum EventCategory {
  ACADEMIC = 'ACADEMIC',
  SOCIAL = 'SOCIAL',
  SPORTS = 'SPORTS',
  CAREER = 'CAREER',
  TECHNOLOGY = 'TECHNOLOGY',
  CULTURAL = 'CULTURAL',
  RELIGIOUS = 'RELIGIOUS',
  PROFESSIONAL = 'PROFESSIONAL',
  OTHER = 'OTHER',
}

export enum AttendanceStatus {
  REGISTERED = 'REGISTERED',
  INTERESTED = 'INTERESTED',
  ATTENDED = 'ATTENDED',
  CANCELLED = 'CANCELLED',
}

export enum ConversationType {
  DIRECT = 'DIRECT',
  GROUP = 'GROUP',
}

export enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  FILE = 'FILE',
  SYSTEM = 'SYSTEM',
}

export enum NotificationType {
  LIKE = 'LIKE',
  COMMENT = 'COMMENT',
  REPLY = 'REPLY',
  MENTION = 'MENTION',
  GROUP_INVITE = 'GROUP_INVITE',
  GROUP_ANNOUNCEMENT = 'GROUP_ANNOUNCEMENT',
  EVENT_REMINDER = 'EVENT_REMINDER',
  NEW_MESSAGE = 'NEW_MESSAGE',
  COURSE_ANNOUNCEMENT = 'COURSE_ANNOUNCEMENT',
  UNIVERSITY_ANNOUNCEMENT = 'UNIVERSITY_ANNOUNCEMENT',
  OPPORTUNITY_ALERT = 'OPPORTUNITY_ALERT',
  VERIFICATION_UPDATE = 'VERIFICATION_UPDATE',
  FOLLOW = 'FOLLOW',
  ANSWER_MARKED_HELPFUL = 'ANSWER_MARKED_HELPFUL',
}

export enum ResourceType {
  PDF = 'PDF',
  DOCUMENT = 'DOCUMENT',
  LINK = 'LINK',
  IMAGE = 'IMAGE',
  VIDEO_LINK = 'VIDEO_LINK',
  OTHER = 'OTHER',
}

export enum OpportunityCategory {
  INTERNSHIP = 'INTERNSHIP',
  SCHOLARSHIP = 'SCHOLARSHIP',
  HACKATHON = 'HACKATHON',
  FELLOWSHIP = 'FELLOWSHIP',
  COMPETITION = 'COMPETITION',
  JOB = 'JOB',
  VOLUNTEER = 'VOLUNTEER',
  RESEARCH = 'RESEARCH',
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface UserProfileSummary {
  id: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  avatarUrl?: string;
  level?: number;
  verificationStatus: VerificationStatus;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    role: UserRole;
    verificationStatus: VerificationStatus;
    isEmailVerified: boolean;
    institutionId: string;
    profile: {
      firstName: string;
      lastName: string;
      displayName?: string;
      avatarUrl?: string;
    } | null;
  };
}
