import { Router } from 'express';
import { asyncRoute } from '../../lib/asyncRoute.js';
import { prisma } from '../../lib/prisma.js';
import { requireAuth } from '../../middleware/requireAuth.js';

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

notificationsRouter.get('/', asyncRoute(async (request, response) => {
  const currentUserId = request.userId!;

  // 1. Pending friend requests received
  const pendingRequests = await prisma.friendship.findMany({
    where: {
      addresseeId: currentUserId,
      status: 'PENDING',
    },
    include: {
      requester: {
        select: { id: true, displayName: true, username: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  // 2. Recent accepted friendships
  const acceptedFriendships = await prisma.friendship.findMany({
    where: {
      requesterId: currentUserId,
      status: 'ACCEPTED',
    },
    include: {
      addressee: {
        select: { id: true, displayName: true, username: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  // 3. Salons joined by user
  const userMemberships = await prisma.salonMember.findMany({
    where: { userId: currentUserId, status: 'ACTIVE' },
    select: { salonId: true },
  });
  const salonIds = userMemberships.map((m) => m.salonId);

  // 4. Recent messages from others in user's salons
  const recentMessages = salonIds.length > 0
    ? await prisma.message.findMany({
        where: {
          salonId: { in: salonIds },
          authorId: { not: currentUserId },
        },
        include: {
          author: { select: { id: true, displayName: true, username: true } },
          salon: { select: { id: true, name: true, type: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      })
    : [];

  // 5. Pending join requests for salons created by the user (as salon administrator)
  const pendingSalonJoins = await prisma.salonMember.findMany({
    where: {
      status: 'PENDING',
      salon: {
        creatorId: currentUserId,
      },
    },
    include: {
      user: { select: { id: true, displayName: true, username: true } },
      salon: { select: { id: true, name: true } },
    },
    orderBy: { joinedAt: 'desc' },
    take: 10,
  });

  // 6. Recent contribution payments recorded for this user
  const recentPayments = await prisma.contributionPayment.findMany({
    where: {
      recipientId: currentUserId,
    },
    include: {
      salon: { select: { id: true, name: true, currency: true } },
      recordedBy: { select: { displayName: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  // Build notifications array
  const notifications: Array<{
    id: string;
    type: 'FRIEND_REQUEST' | 'FRIEND_ACCEPTED' | 'MESSAGE' | 'SALON_JOIN_REQUEST' | 'PAYMENT_RECEIVED';
    title: string;
    description: string;
    createdAt: Date;
    link: 'membres' | 'discussions' | 'salons' | 'cotisations';
    salonId?: string;
    avatarText: string;
  }> = [];

  for (const joinReq of pendingSalonJoins) {
    notifications.push({
      id: `join_req_${joinReq.id}`,
      type: 'SALON_JOIN_REQUEST',
      title: 'Demande d’adhésion salon',
      description: `${joinReq.user.displayName} souhaite rejoindre votre salon "${joinReq.salon.name}". Seul vous pouvez l'accepter.`,
      createdAt: joinReq.joinedAt,
      link: 'salons',
      salonId: joinReq.salon.id,
      avatarText: 'S',
    });
  }

  for (const req of pendingRequests) {
    notifications.push({
      id: `fr_req_${req.id}`,
      type: 'FRIEND_REQUEST',
      title: 'Demande d’ami reçue',
      description: `${req.requester.displayName} vous a envoyé une demande d'ami.`,
      createdAt: req.createdAt,
      link: 'membres',
      avatarText: req.requester.displayName.slice(0, 1).toUpperCase(),
    });
  }

  for (const acc of acceptedFriendships) {
    notifications.push({
      id: `fr_acc_${acc.id}`,
      type: 'FRIEND_ACCEPTED',
      title: 'Demande d’ami acceptée',
      description: `${acc.addressee.displayName} a accepté votre demande d'ami.`,
      createdAt: acc.createdAt,
      link: 'membres',
      avatarText: acc.addressee.displayName.slice(0, 1).toUpperCase(),
    });
  }

  for (const p of recentPayments) {
    notifications.push({
      id: `payment_${p.id}`,
      type: 'PAYMENT_RECEIVED',
      title: 'Paiement encaissé',
      description: `${p.recordedBy.displayName} a enregistré un versement de ${Number(p.amount)} ${p.salon.currency} pour le salon "${p.salon.name}".`,
      createdAt: p.createdAt,
      link: 'cotisations',
      salonId: p.salon.id,
      avatarText: '$',
    });
  }

  for (const msg of recentMessages) {
    let preview = 'Nouveau message reçu';
    try {
      if (msg.content.startsWith('{')) {
        const p = JSON.parse(msg.content);
        if (p.mediaType === 'audio') preview = '🎙️ Note vocale reçue';
        else if (p.mediaType === 'image') preview = '📷 Photo partagée';
        else if (p.text) preview = p.text.slice(0, 50);
      } else if (msg.content) {
        preview = msg.content.slice(0, 50);
      }
    } catch {
      preview = msg.content.slice(0, 50);
    }

    notifications.push({
      id: `msg_${msg.id}`,
      type: 'MESSAGE',
      title: msg.salon.name.startsWith('Tête-à-tête :') ? msg.author.displayName : msg.salon.name,
      description: `${msg.author.displayName} : ${preview}`,
      createdAt: msg.createdAt,
      link: 'discussions',
      salonId: msg.salonId,
      avatarText: msg.author.displayName.slice(0, 1).toUpperCase(),
    });
  }

  // Sort by date descending
  notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  response.json({
    success: true,
    data: {
      notifications: notifications.slice(0, 20),
      unreadCount: pendingSalonJoins.length + pendingRequests.length + recentMessages.slice(0, 5).length,
    },
  });
}));
