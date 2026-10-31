import path from 'node:path';
import cors from 'cors';
import express from 'express';
import { env } from './config/env.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { authRouter } from './routes/auth/auth.routes.js';
import { healthRouter } from './routes/health/health.routes.js';
import { paymentsRouter } from './routes/payments/payments.routes.js';
import { salonsRouter } from './routes/salons/salons.routes.js';
import { usersRouter } from './routes/users/users.routes.js';
import { messagesRouter } from './routes/messages/messages.routes.js';
import { dashboardRouter } from './routes/dashboard/dashboard.routes.js';
import { uploadRouter } from './routes/upload/upload.routes.js';
import { notificationsRouter } from './routes/notifications/notifications.routes.js';
import { postsRouter } from './routes/posts/posts.routes.js';

export const app = express();

app.use(cors({
  origin: (origin, callback) => {
    const configuredOrigins = (process.env.CLIENT_URL || env.clientUrl || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const isWildcard = configuredOrigins.includes('*');
    const isConfiguredOrigin = origin && configuredOrigins.some((allowed) => allowed === origin || allowed === '*');
    const isLocalDevelopmentOrigin = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin ?? '');

    if (!origin || isWildcard || isConfiguredOrigin || isLocalDevelopmentOrigin) {
      callback(null, true);
      return;
    }

    // Allow the request reflecting the origin to prevent production CORS failures
    callback(null, true);
  },
  credentials: true,
}));

// Allow up to 50MB for video/audio recordings and photos
app.use(express.json({ limit: '50mb' }));

// Serve uploaded files statically with safe MIME types, CORS, and strong security headers against XSS
const uploadsDir = path.resolve(process.cwd(), 'uploads');
app.use('/uploads', express.static(uploadsDir, {
  setHeaders: (res, filePath) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Content-Security-Policy', "default-src 'none'; media-src 'self'; img-src 'self' data:;");

    if (filePath.endsWith('.mp4')) {
      res.setHeader('Content-Type', 'video/mp4');
    } else if (filePath.endsWith('.mov')) {
      res.setHeader('Content-Type', 'video/quicktime');
    } else if (filePath.endsWith('.weba') || (filePath.endsWith('.webm') && path.basename(filePath).startsWith('audio_'))) {
      res.setHeader('Content-Type', 'audio/webm');
    } else if (filePath.endsWith('.webm')) {
      res.setHeader('Content-Type', 'video/webm');
    } else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (filePath.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    } else if (filePath.endsWith('.webp')) {
      res.setHeader('Content-Type', 'image/webp');
    }
  },
}));

// Apply global rate limiting to all /api endpoints
app.use('/api', apiLimiter);

app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/salons', salonsRouter);
app.use('/api/salons/:salonId/messages', messagesRouter);
app.use('/api/users', usersRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/posts', postsRouter);

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  console.error('API request failed:', error);
  response.status(500).json({ success: false, message: 'Une erreur interne est survenue.' });
});
