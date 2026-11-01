import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';

export const healthRouter = Router();

healthRouter.get('/', async (_request, response) => {
  try {
    const userCount = await prisma.user.count();
    response.json({
      status: 'ok',
      service: 'bmf-community-api',
      database: 'connected',
      userCount,
    });
  } catch (error) {
    response.status(500).json({
      status: 'error',
      service: 'bmf-community-api',
      database: 'disconnected',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});
