import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      displayName: true,
      email: true,
      securityQuestion: true,
      createdAt: true
    }
  });
  console.log('USERS_LIST:', JSON.stringify(users, null, 2));
}

main().finally(() => prisma.$disconnect());
