import { defineConfig, env } from 'prisma/config';
import fs from 'node:fs';

if (typeof process.loadEnvFile === 'function') {
  if (fs.existsSync('.env')) {
    process.loadEnvFile('.env');
  }
  if (fs.existsSync('.env.local')) {
    process.loadEnvFile('.env.local');
  }
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DIRECT_URL'),
  },
});
