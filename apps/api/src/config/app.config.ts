import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env.API_PORT ?? '3001', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  clientUrl: process.env.CLIENT_URL ?? 'http://localhost:3000',
  apiUrl: process.env.API_URL ?? 'http://localhost:3001',
  adminSeedEmail: process.env.ADMIN_SEED_EMAIL ?? 'superadmin@interakt.app',
  adminSeedPassword: process.env.ADMIN_SEED_PASSWORD ?? '',
}));
