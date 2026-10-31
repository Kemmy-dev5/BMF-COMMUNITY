import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Response } from 'express';
import { env } from '../config/env.js';

const cookieName = 'bmf_session';
const sessionDurationSeconds = 60 * 60 * 24 * 7;

function sign(value: string) {
  return createHmac('sha256', env.jwtSecret).update(value).digest('base64url');
}

export function createToken(userId: string): string {
  const payload = Buffer.from(JSON.stringify({
    sub: userId,
    exp: Math.floor(Date.now() / 1000) + sessionDurationSeconds,
  })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function createSession(userId: string, response: Response): string {
  const token = createToken(userId);
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';

  response.setHeader(
    'Set-Cookie',
    `${cookieName}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${sessionDurationSeconds}${secure}`,
  );
  return token;
}

export function clearSession(response: Response) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  response.setHeader('Set-Cookie', `${cookieName}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`);
}

export function verifyToken(token: string | undefined): string | null {
  if (!token) return null;

  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra) return null;

  const expected = Buffer.from(sign(payload));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;

  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { sub?: unknown; exp?: unknown };
    if (typeof session.sub !== 'string' || typeof session.exp !== 'number' || session.exp <= Date.now() / 1000) {
      return null;
    }

    return session.sub;
  } catch {
    return null;
  }
}

export function readSession(cookieHeader: string | undefined): string | null {
  const token = cookieHeader
    ?.split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${cookieName}=`))
    ?.slice(cookieName.length + 1);

  return verifyToken(token);
}

export function getUserIdFromRequest(request: { headers: { authorization?: string; cookie?: string } }): string | null {
  const authHeader = request.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const bearerToken = authHeader.slice(7).trim();
    const verified = verifyToken(bearerToken);
    if (verified) return verified;
  }

  return readSession(request.headers.cookie);
}
