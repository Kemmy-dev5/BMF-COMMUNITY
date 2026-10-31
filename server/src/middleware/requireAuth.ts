import type { RequestHandler } from 'express';
import { getUserIdFromRequest } from '../lib/session.js';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export const requireAuth: RequestHandler = (request, response, next) => {
  const userId = getUserIdFromRequest(request);
  if (!userId) {
    response.status(401).json({ success: false, message: 'Vous devez vous connecter pour continuer.' });
    return;
  }

  request.userId = userId;
  next();
};
