import dotenv from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../.env') });

function clean(val: string | undefined): string | undefined {
  if (!val) return undefined;
  return val.trim().replace(/^["']|["']$/g, '');
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  clientUrl: clean(process.env.CLIENT_URL) ?? 'http://localhost:5173',
  databaseUrl: clean(process.env.DATABASE_URL) ?? 'mysql://root:password@localhost:3306/bmf_community',
  jwtSecret: clean(process.env.JWT_SECRET) ?? 'bmf-community-dev-secret',
};
