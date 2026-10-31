import { Prisma } from '@prisma/client';
import { Router } from 'express';
import { asyncRoute } from '../../lib/asyncRoute.js';
import { prisma } from '../../lib/prisma.js';
import { requireAuth } from '../../middleware/requireAuth.js';

export const usersRouter = Router();
usersRouter.use(requireAuth);

usersRouter.get('/search', asyncRoute(async (request, response) => {
  const query = typeof request.query.q === 'string' ? request.query.q.trim() : '';
  const users = await prisma.user.findMany({
    where: {
      id: { not: request.userId },
      ...(query ? {
        OR: [
          { displayName: { contains: query } },
          { username: { contains: query.toLowerCase() } },
        ],
      } : {}),
    },
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      sentFriendships: { where: { addresseeId: request.userId }, select: { id: true, status: true }, take: 1 },
      receivedFriendships: { where: { requesterId: request.userId }, select: { id: true, status: true }, take: 1 },
    },
    orderBy: { displayName: 'asc' },
    take: 50,
  });

  response.json({
    success: true,
    data: users.map((user) => ({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl ?? null,
      friendshipStatus: user.sentFriendships[0]?.status ?? user.receivedFriendships[0]?.status ?? null,
      friendshipId: user.sentFriendships[0]?.id ?? user.receivedFriendships[0]?.id ?? null,
      friendshipDirection: user.sentFriendships[0] ? 'received' : user.receivedFriendships[0] ? 'sent' : null,
    })),
  });
}));

usersRouter.patch('/friends/:id', asyncRoute(async (request, response) => {
  const status = request.body?.status;
  if (status !== 'ACCEPTED' && status !== 'DECLINED') {
    response.status(400).json({ success: false, message: 'La réponse à la demande est invalide.' });
    return;
  }

  const friendship = await prisma.friendship.findFirst({
    where: { id: String(request.params.id), addresseeId: request.userId, status: 'PENDING' },
  });

  if (!friendship) {
    response.status(404).json({ success: false, message: 'Demande introuvable ou déjà traitée.' });
    return;
  }

  await prisma.friendship.update({ where: { id: friendship.id }, data: { status } });
  response.json({
    success: true,
    message: status === 'ACCEPTED' ? 'Demande acceptée.' : 'Demande refusée.',
  });
}));

usersRouter.get('/friends', asyncRoute(async (request, response) => {
  const friendships = await prisma.friendship.findMany({
    where: {
      status: { in: ['PENDING', 'ACCEPTED'] },
      OR: [{ requesterId: request.userId }, { addresseeId: request.userId }],
    },
    include: {
      requester: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      addressee: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  response.json({
    success: true,
    data: friendships.map((friendship) => ({
      id: friendship.id,
      status: friendship.status,
      direction: friendship.requesterId === request.userId ? 'sent' : 'received',
      user: friendship.requesterId === request.userId ? friendship.addressee : friendship.requester,
    })),
  });
}));

usersRouter.post('/friends/request', asyncRoute(async (request, response) => {
  const addresseeId = typeof request.body?.addresseeId === 'string' ? request.body.addresseeId : '';

  if (!addresseeId) {
    response.status(400).json({ success: false, message: 'Le destinataire est requis.' });
    return;
  }

  if (addresseeId === request.userId) {
    response.status(400).json({ success: false, message: 'Vous ne pouvez pas vous ajouter vous-même.' });
    return;
  }

  const addressee = await prisma.user.findUnique({ where: { id: addresseeId }, select: { id: true } });
  if (!addressee) {
    response.status(404).json({ success: false, message: 'Membre introuvable.' });
    return;
  }

  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: request.userId, addresseeId },
        { requesterId: addresseeId, addresseeId: request.userId },
      ],
    },
  });

  if (existing) {
    response.status(409).json({ success: false, message: 'Une demande ou une amitié existe déjà.' });
    return;
  }

  try {
    const friendship = await prisma.friendship.create({
      data: { requesterId: request.userId!, addresseeId },
    });
    response.status(201).json({ success: true, message: 'Demande d’amis envoyée.', data: friendship });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      response.status(404).json({ success: false, message: 'Membre introuvable.' });
      return;
    }

    throw error;
  }
}));

usersRouter.delete('/friends/:id', asyncRoute(async (request, response) => {
  const friendshipId = String(request.params.id);

  const friendship = await prisma.friendship.findFirst({
    where: {
      id: friendshipId,
      OR: [{ requesterId: request.userId! }, { addresseeId: request.userId! }],
    },
  });

  if (!friendship) {
    response.status(404).json({ success: false, message: 'Demande ou relation d’amitié introuvable.' });
    return;
  }

  await prisma.friendship.delete({ where: { id: friendship.id } });
  response.json({
    success: true,
    message: friendship.status === 'ACCEPTED' ? 'Ami retiré.' : 'Demande annulée.',
  });
}));

usersRouter.get('/profile/:targetId', asyncRoute(async (request, response) => {
  const targetId = String(request.params.targetId).trim();
  const currentUserId = request.userId!;

  const targetUser = await prisma.user.findFirst({
    where: {
      OR: [{ id: targetId }, { username: targetId.toLowerCase() }],
    },
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      bio: true,
      createdAt: true,
    },
  });

  if (!targetUser) {
    response.status(404).json({ success: false, message: 'Utilisateur introuvable.' });
    return;
  }

  const [friendsCount, postsCount, directFriendship] = await Promise.all([
    prisma.friendship.count({
      where: {
        status: 'ACCEPTED',
        OR: [{ requesterId: targetUser.id }, { addresseeId: targetUser.id }],
      },
    }),
    prisma.post.count({
      where: { authorId: targetUser.id },
    }),
    currentUserId !== targetUser.id
      ? prisma.friendship.findFirst({
          where: {
            OR: [
              { requesterId: currentUserId, addresseeId: targetUser.id },
              { requesterId: targetUser.id, addresseeId: currentUserId },
            ],
          },
        })
      : null,
  ]);

  response.json({
    success: true,
    data: {
      id: targetUser.id,
      username: targetUser.username,
      displayName: targetUser.displayName,
      avatarUrl: targetUser.avatarUrl ?? null,
      bio: targetUser.bio ?? null,
      createdAt: targetUser.createdAt,
      friendsCount,
      postsCount,
      isMe: currentUserId === targetUser.id,
      friendshipStatus: directFriendship?.status ?? null,
      friendshipId: directFriendship?.id ?? null,
      friendshipDirection: directFriendship
        ? directFriendship.requesterId === currentUserId
          ? 'sent'
          : 'received'
        : null,
    },
  });
}));

usersRouter.get('/profile/:targetId/friends', asyncRoute(async (request, response) => {
  const targetId = String(request.params.targetId).trim();

  const targetUser = await prisma.user.findFirst({
    where: {
      OR: [{ id: targetId }, { username: targetId.toLowerCase() }],
    },
    select: { id: true },
  });

  if (!targetUser) {
    response.status(404).json({ success: false, message: 'Utilisateur introuvable.' });
    return;
  }

  const friendships = await prisma.friendship.findMany({
    where: {
      status: 'ACCEPTED',
      OR: [{ requesterId: targetUser.id }, { addresseeId: targetUser.id }],
    },
    include: {
      requester: { select: { id: true, username: true, displayName: true, avatarUrl: true, bio: true } },
      addressee: { select: { id: true, username: true, displayName: true, avatarUrl: true, bio: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const friends = friendships.map((f) => {
    const friend = f.requesterId === targetUser.id ? f.addressee : f.requester;
    return {
      id: friend.id,
      username: friend.username,
      displayName: friend.displayName,
      avatarUrl: friend.avatarUrl ?? null,
      bio: friend.bio ?? null,
      friendshipSince: f.createdAt,
    };
  });

  response.json({
    success: true,
    data: friends,
  });
}));

