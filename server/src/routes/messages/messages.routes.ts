import { Router } from 'express';
import { asyncRoute } from '../../lib/asyncRoute.js';
import { prisma } from '../../lib/prisma.js';
import { requireAuth } from '../../middleware/requireAuth.js';

function parseStoredMessage(raw: string) {
  if (raw.startsWith('{') && raw.endsWith('}')) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed.mediaUrl && parsed.mediaType) {
        return {
          content: typeof parsed.text === 'string' ? parsed.text : '',
          mediaUrl: String(parsed.mediaUrl),
          mediaType: parsed.mediaType === 'audio' ? ('audio' as const) : ('image' as const),
          duration: typeof parsed.duration === 'number' ? parsed.duration : undefined,
        };
      }
    } catch {
      // fallback
    }
  }

  return {
    content: raw,
    mediaUrl: null,
    mediaType: null,
    duration: undefined,
  };
}

export const messagesRouter = Router({ mergeParams: true });
messagesRouter.use(requireAuth);

messagesRouter.get('/', asyncRoute(async (request, response) => {
  const salonId = String(request.params.salonId);
  const membership = await prisma.salonMember.findFirst({
    where: { salonId, userId: request.userId, status: 'ACTIVE' },
    select: { id: true },
  });

  if (!membership) {
    response.status(403).json({ success: false, message: 'Vous devez rejoindre ce salon pour lire ses messages.' });
    return;
  }

  const messages = await prisma.message.findMany({
    where: { salonId },
    include: { author: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
    orderBy: { createdAt: 'asc' },
    take: 100,
  });

  response.json({
    success: true,
    data: messages.map((message) => ({
      id: message.id,
      ...parseStoredMessage(message.content),
      createdAt: message.createdAt,
      author: message.author,
    })),
  });
}));

messagesRouter.post('/', asyncRoute(async (request, response) => {
  const salonId = String(request.params.salonId);
  const content = typeof request.body?.content === 'string' ? request.body.content.trim() : '';
  const mediaUrl = typeof request.body?.mediaUrl === 'string' ? request.body.mediaUrl.trim() : '';
  const mediaType = request.body?.mediaType === 'image' || request.body?.mediaType === 'audio' ? request.body.mediaType : null;
  const duration = typeof request.body?.duration === 'number' ? request.body.duration : undefined;

  if (!content && !mediaUrl) {
    response.status(400).json({ success: false, message: 'Le message ou le fichier ne peut pas être vide.' });
    return;
  }

  if (content.length > 5000) {
    response.status(400).json({ success: false, message: 'Le message doit contenir moins de 5 000 caractères.' });
    return;
  }

  const membership = await prisma.salonMember.findFirst({
    where: { salonId, userId: request.userId, status: 'ACTIVE' },
    select: { id: true },
  });

  if (!membership) {
    response.status(403).json({ success: false, message: 'Vous devez rejoindre ce salon pour écrire un message.' });
    return;
  }

  let storedContent = content;
  if (mediaUrl && mediaType) {
    storedContent = JSON.stringify({
      text: content,
      mediaUrl,
      mediaType,
      duration,
    });
  }

  const message = await prisma.message.create({
    data: { salonId, authorId: request.userId!, content: storedContent },
    include: { author: { select: { id: true, username: true, displayName: true } } },
  });

  response.status(201).json({
    success: true,
    data: {
      id: message.id,
      content,
      mediaUrl: mediaUrl || null,
      mediaType: mediaType || null,
      duration,
      createdAt: message.createdAt,
      author: message.author,
    },
  });
}));
