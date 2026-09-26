import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  accessSecret: process.env.JWT_ACCESS_SECRET ?? 'fallback-access-secret-change-in-prod-min-32',
  refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'fallback-refresh-secret-change-in-prod-min-32',
  accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
}));
