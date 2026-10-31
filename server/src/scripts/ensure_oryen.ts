import 'dotenv/config';
import { randomBytes, scrypt } from 'node:crypto';
import { promisify } from 'node:util';
import { PrismaClient } from '@prisma/client';

const scryptAsync = promisify(scrypt);
const passwordKeyLength = 64;

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = (await scryptAsync(password, salt, passwordKeyLength)) as Buffer;
  return `scrypt:${salt}:${derivedKey.toString('hex')}`;
}

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await hashPassword('Password123!');
  const user = await prisma.user.upsert({
    where: { username: 'oryen' },
    update: {
      passwordHash,
      securityQuestion: 'Dans quelle ville êtes-vous né(e) ?',
      securityAnswer: 'paris',
    },
    create: {
      username: 'oryen',
      displayName: 'Oryen',
      email: 'oryen@bmf.org',
      passwordHash,
      securityQuestion: 'Dans quelle ville êtes-vous né(e) ?',
      securityAnswer: 'paris',
    },
  });

  console.log('✅ Compte Oryen restauré avec succès :', user);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
