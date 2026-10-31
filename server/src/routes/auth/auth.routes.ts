import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { Prisma } from '@prisma/client';
import { Router } from 'express';
import { asyncRoute } from '../../lib/asyncRoute.js';
import { prisma } from '../../lib/prisma.js';
import { clearSession, createSession, getUserIdFromRequest } from '../../lib/session.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { authLimiter } from '../../middleware/rateLimiter.js';

const scryptAsync = promisify(scrypt);
const passwordKeyLength = 64;

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = (await scryptAsync(password, salt, passwordKeyLength)) as Buffer;
  return `scrypt:${salt}:${derivedKey.toString('hex')}`;
}

async function verifyPassword(password: string, storedHash: string) {
  const [algorithm, salt, expectedHex] = storedHash.split(':');
  if (algorithm !== 'scrypt' || !salt || !expectedHex) return false;

  const expected = Buffer.from(expectedHex, 'hex');
  const actual = (await scryptAsync(password, salt, passwordKeyLength)) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

// Hash security answers to protect against database leaks and credential stuffing
async function hashSecurityAnswer(answer: string): Promise<string> {
  const normalized = answer.trim().toLowerCase();
  const salt = randomBytes(16).toString('hex');
  const derivedKey = (await scryptAsync(normalized, salt, 32)) as Buffer;
  return `scrypt:${salt}:${derivedKey.toString('hex')}`;
}

async function verifySecurityAnswer(answer: string, storedHashOrPlain: string): Promise<boolean> {
  const normalized = answer.trim().toLowerCase();
  if (storedHashOrPlain.startsWith('scrypt:')) {
    const [algorithm, salt, expectedHex] = storedHashOrPlain.split(':');
    if (algorithm !== 'scrypt' || !salt || !expectedHex) return false;
    const expected = Buffer.from(expectedHex, 'hex');
    const actual = (await scryptAsync(normalized, salt, 32)) as Buffer;
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }
  // Backward compatibility with legacy plain-text answers in DB
  return storedHashOrPlain.trim().toLowerCase() === normalized;
}

function publicUser(user: {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatarUrl?: string | null;
  bio?: string | null;
}) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    email: user.email,
    avatarUrl: user.avatarUrl ?? null,
    bio: user.bio ?? null,
  };
}

export const authRouter = Router();

authRouter.get('/me', asyncRoute(async (request, response) => {
  const userId = getUserIdFromRequest(request);
  const user = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, username: true, displayName: true, email: true, avatarUrl: true, bio: true },
      })
    : null;

  response.json({ success: true, data: { user: user ? publicUser(user) : null } });
}));

authRouter.post('/login', authLimiter, asyncRoute(async (request, response) => {
  const rawIdentifier = typeof request.body?.identifier === 'string' ? request.body.identifier.trim() : '';
  const password = typeof request.body?.password === 'string' ? request.body.password : '';

  if (!rawIdentifier || !password) {
    response.status(400).json({ success: false, message: 'Identifiant et mot de passe requis.' });
    return;
  }

  const lowerIdentifier = rawIdentifier.toLowerCase();
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: rawIdentifier },
        { email: lowerIdentifier },
        { username: rawIdentifier },
        { username: lowerIdentifier },
      ],
    },
  });

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    response.status(401).json({ success: false, message: 'Identifiants invalides.' });
    return;
  }

  const token = createSession(user.id, response);
  response.json({ success: true, message: 'Connexion réussie.', data: { user: publicUser(user), token } });
}));

authRouter.post('/register', authLimiter, asyncRoute(async (request, response) => {
  const username = typeof request.body?.username === 'string' ? request.body.username.trim().toLowerCase() : '';
  const email = typeof request.body?.email === 'string' ? request.body.email.trim().toLowerCase() : '';
  const password = typeof request.body?.password === 'string' ? request.body.password : '';

  if (!username || !email || !password) {
    response.status(400).json({ success: false, message: 'Nom, email et mot de passe requis.' });
    return;
  }

  if (username.length > 40 || !/^[a-z0-9_.-]+$/.test(username)) {
    response.status(400).json({ success: false, message: 'Le pseudo doit contenir au maximum 40 caractères (lettres, chiffres, ., _ ou -).' });
    return;
  }

  if (email.length > 191 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    response.status(400).json({ success: false, message: 'Veuillez saisir une adresse email valide.' });
    return;
  }

  if (password.length < 8 || password.length > 128) {
    response.status(400).json({ success: false, message: 'Le mot de passe doit contenir entre 8 et 128 caractères.' });
    return;
  }

  const securityQuestion = typeof request.body?.securityQuestion === 'string' ? request.body.securityQuestion.trim() : '';
  const securityAnswer = typeof request.body?.securityAnswer === 'string' ? request.body.securityAnswer.trim() : '';

  if (!securityQuestion || !securityAnswer) {
    response.status(400).json({ success: false, message: 'Veuillez sélectionner une question de sécurité et y répondre.' });
    return;
  }

  try {
    const user = await prisma.user.create({
      data: {
        username,
        displayName: username,
        email,
        passwordHash: await hashPassword(password),
        securityQuestion,
        securityAnswer: await hashSecurityAnswer(securityAnswer),
      },
    });

    const token = createSession(user.id, response);
    response.status(201).json({
      success: true,
      message: 'Compte créé avec succès.',
      data: { user: publicUser(user), token },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      response.status(409).json({ success: false, message: 'Ce pseudo ou cette adresse email est déjà utilisé.' });
      return;
    }

    throw error;
  }
}));

authRouter.post('/security-question', authLimiter, asyncRoute(async (request, response) => {
  const rawIdentifier = typeof request.body?.identifier === 'string' ? request.body.identifier.trim() : '';
  if (!rawIdentifier) {
    response.status(400).json({ success: false, message: 'Identifiant requis.' });
    return;
  }

  const lowerIdentifier = rawIdentifier.toLowerCase();
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: rawIdentifier },
        { email: lowerIdentifier },
        { username: rawIdentifier },
        { username: lowerIdentifier },
      ],
    },
    select: { id: true, username: true, securityQuestion: true, securityAnswer: true },
  });

  if (!user || !user.securityQuestion || !user.securityAnswer) {
    response.status(404).json({
      success: false,
      message: 'Aucune question secrète active trouvée pour ce compte.',
    });
    return;
  }

  response.json({
    success: true,
    data: { question: user.securityQuestion, hasSecurityQuestion: true },
  });
}));

authRouter.post('/reset-password', authLimiter, asyncRoute(async (request, response) => {
  const rawIdentifier = typeof request.body?.identifier === 'string' ? request.body.identifier.trim() : '';
  const answer = typeof request.body?.answer === 'string' ? request.body.answer.trim() : '';
  const newPassword = typeof request.body?.newPassword === 'string' ? request.body.newPassword : '';
  const newSecurityQuestion = typeof request.body?.securityQuestion === 'string' ? request.body.securityQuestion.trim() : undefined;
  const newSecurityAnswer = typeof request.body?.securityAnswer === 'string' ? request.body.securityAnswer.trim() : undefined;

  if (!rawIdentifier || !newPassword) {
    response.status(400).json({ success: false, message: 'Identifiant et nouveau mot de passe requis.' });
    return;
  }

  if (newPassword.length < 8 || newPassword.length > 128) {
    response.status(400).json({ success: false, message: 'Le mot de passe doit contenir entre 8 et 128 caractères.' });
    return;
  }

  const lowerIdentifier = rawIdentifier.toLowerCase();
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: rawIdentifier },
        { email: lowerIdentifier },
        { username: rawIdentifier },
        { username: lowerIdentifier },
      ],
    },
    select: { id: true, securityAnswer: true, securityQuestion: true },
  });

  if (!user) {
    response.status(404).json({ success: false, message: 'Aucun compte trouvé avec cet identifiant.' });
    return;
  }

  // Security check: Never bypass question verification if no answer is set
  if (!user.securityAnswer || !user.securityQuestion) {
    response.status(400).json({
      success: false,
      message: 'Ce compte n’a pas configuré de question secrète. Veuillez contacter l’administrateur pour réinitialiser vos accès.',
    });
    return;
  }

  const isValidAnswer = await verifySecurityAnswer(answer, user.securityAnswer);
  if (!isValidAnswer) {
    response.status(400).json({ success: false, message: 'Réponse à la question secrète incorrecte.' });
    return;
  }

  const updateData: Prisma.UserUpdateInput = {
    passwordHash: await hashPassword(newPassword),
  };

  // Upgrade legacy plain-text security answer to hashed format, or update with new question/answer
  if (newSecurityQuestion && newSecurityAnswer) {
    updateData.securityQuestion = newSecurityQuestion;
    updateData.securityAnswer = await hashSecurityAnswer(newSecurityAnswer);
  } else if (!user.securityAnswer.startsWith('scrypt:')) {
    updateData.securityAnswer = await hashSecurityAnswer(answer);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: updateData,
  });

  response.json({
    success: true,
    message: 'Votre mot de passe a été réinitialisé avec succès ! Vous pouvez maintenant vous connecter.',
  });
}));

authRouter.post('/logout', (_request, response) => {
  clearSession(response);
  response.json({ success: true, message: 'Déconnexion réussie.' });
});

authRouter.patch('/profile', requireAuth, asyncRoute(async (request, response) => {
  const displayName = typeof request.body?.displayName === 'string' ? request.body.displayName.trim() : '';
  const email = typeof request.body?.email === 'string' ? request.body.email.trim().toLowerCase() : '';
  const avatarUrl = typeof request.body?.avatarUrl === 'string' ? request.body.avatarUrl.trim() : undefined;
  const bio = typeof request.body?.bio === 'string' ? request.body.bio.trim() : undefined;

  if (!displayName || !email) {
    response.status(400).json({ success: false, message: 'Le nom d’affichage et l’email sont requis.' });
    return;
  }

  if (displayName.length > 80) {
    response.status(400).json({ success: false, message: 'Le nom d’affichage ne doit pas dépasser 80 caractères.' });
    return;
  }

  if (bio !== undefined && bio.length > 1000) {
    response.status(400).json({ success: false, message: 'La description ne doit pas dépasser 1000 caractères.' });
    return;
  }

  if (email.length > 191 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    response.status(400).json({ success: false, message: 'Adresse email invalide.' });
    return;
  }

  // Reject oversized inline payloads (encourage uploaded /uploads/... URLs)
  if (avatarUrl && avatarUrl.length > 1024 * 1024) {
    response.status(400).json({
      success: false,
      message: 'L’image de profil est trop volumineuse. Veuillez utiliser l’option de téléversement standard (max 1Mo).',
    });
    return;
  }

  try {
    const updated = await prisma.user.update({
      where: { id: request.userId! },
      data: {
        displayName,
        email,
        ...(avatarUrl !== undefined ? { avatarUrl: avatarUrl || null } : {}),
        ...(bio !== undefined ? { bio: bio || null } : {}),
      },
      select: { id: true, username: true, displayName: true, email: true, avatarUrl: true, bio: true },
    });

    response.json({
      success: true,
      message: 'Profil mis à jour.',
      data: { user: publicUser(updated) },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      response.status(409).json({ success: false, message: 'Cette adresse email est déjà utilisée.' });
      return;
    }
    throw error;
  }
}));

authRouter.post('/change-password', requireAuth, asyncRoute(async (request, response) => {
  const currentPassword = typeof request.body?.currentPassword === 'string' ? request.body.currentPassword : '';
  const newPassword = typeof request.body?.newPassword === 'string' ? request.body.newPassword : '';

  if (!currentPassword || !newPassword) {
    response.status(400).json({ success: false, message: 'L’ancien et le nouveau mot de passe sont requis.' });
    return;
  }

  if (newPassword.length < 8 || newPassword.length > 128) {
    response.status(400).json({ success: false, message: 'Le nouveau mot de passe doit contenir au moins 8 caractères.' });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: request.userId! },
    select: { id: true, passwordHash: true },
  });

  if (!user || !(await verifyPassword(currentPassword, user.passwordHash))) {
    response.status(401).json({ success: false, message: 'Le mot de passe actuel est incorrect.' });
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(newPassword) },
  });

  response.json({ success: true, message: 'Mot de passe modifié avec succès.' });
}));
