import { MemberRole, Prisma, SalonType } from '@prisma/client';
import { Router } from 'express';
import { asyncRoute } from '../../lib/asyncRoute.js';
import { prisma } from '../../lib/prisma.js';
import { requireAuth } from '../../middleware/requireAuth.js';

export const salonsRouter = Router();
salonsRouter.use(requireAuth);

salonsRouter.get('/', asyncRoute(async (request, response) => {
  const query = typeof request.query.q === 'string' ? request.query.q.trim() : '';
  const salons = await prisma.salon.findMany({
    where: {
      OR: [
        { isDiscoverable: true },
        { members: { some: { userId: request.userId! } } },
      ],
      ...(query ? {
        AND: [
          {
            OR: [
              { name: { contains: query } },
              { description: { contains: query } },
            ],
          },
        ],
      } : {}),
    },
    include: {
      members: {
        include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  response.json({
    success: true,
    data: salons.map((salon) => {
      const isDirect = !salon.isDiscoverable;
      const activeMembers = salon.members.filter((m) => m.status === 'ACTIVE');
      const pendingMembers = salon.members.filter((m) => m.status === 'PENDING');
      const currentMembership = salon.members.find(({ userId }) => userId === request.userId);
      const isCreator = salon.creatorId === request.userId;
      const isCurrentUserAdmin = isCreator && currentMembership?.status === 'ACTIVE';

      const otherMember = isDirect
        ? activeMembers.find(({ userId }) => userId !== request.userId)?.user || null
        : null;
      const displayName = isDirect && otherMember ? otherMember.displayName : salon.name;

      return {
        id: salon.id,
        name: displayName,
        rawName: salon.name,
        description: salon.description ?? '',
        rules: salon.rules ?? '',
        type: salon.type,
        isDirect,
        directRecipient: otherMember,
        currency: salon.currency,
        creatorId: salon.creatorId,
        isCreator,
        contributionAmount: salon.contributionAmount?.toString() ?? null,
        successThreshold: salon.successThreshold?.toString() ?? null,
        members: activeMembers.map(({ user }) => user),
        currentUserIsMember: currentMembership?.status === 'ACTIVE',
        currentUserStatus: currentMembership?.status ?? null,
        currentUserRole: currentMembership?.status === 'ACTIVE' ? (isCreator ? MemberRole.ADMIN : currentMembership.role) : null,
        pendingRequestsCount: isCurrentUserAdmin ? pendingMembers.length : 0,
      };
    }),
  });
}));

salonsRouter.post('/direct', asyncRoute(async (request, response) => {
  const recipientId = typeof request.body?.recipientId === 'string' ? request.body.recipientId : '';
  if (!recipientId || recipientId === request.userId) {
    response.status(400).json({ success: false, message: 'Destinataire invalide.' });
    return;
  }

  const recipient = await prisma.user.findUnique({
    where: { id: recipientId },
    select: { id: true, username: true, displayName: true, avatarUrl: true },
  });

  if (!recipient) {
    response.status(404).json({ success: false, message: 'Utilisateur introuvable.' });
    return;
  }

  // Find existing direct conversation between both users
  const existingSalon = await prisma.salon.findFirst({
    where: {
      isDiscoverable: false,
      type: 'CHAT',
      AND: [
        { members: { some: { userId: request.userId!, status: 'ACTIVE' } } },
        { members: { some: { userId: recipientId, status: 'ACTIVE' } } },
      ],
    },
    include: {
      members: {
        where: { status: 'ACTIVE' },
        include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
      },
    },
  });

  if (existingSalon) {
    response.json({
      success: true,
      message: 'Conversation existante retrouvée.',
      data: {
        id: existingSalon.id,
        name: recipient.displayName,
        type: 'CHAT',
        isDirect: true,
        directRecipient: recipient,
        members: existingSalon.members.map(({ user }) => user),
        currentUserIsMember: true,
        currentUserRole: MemberRole.MEMBER,
      },
    });
    return;
  }

  // Create new direct conversation
  const newSalon = await prisma.salon.create({
    data: {
      name: `Direct: ${recipient.displayName}`,
      type: 'CHAT',
      isDiscoverable: false,
      creatorId: request.userId!,
      members: {
        create: [
          { userId: request.userId!, role: MemberRole.MEMBER, status: 'ACTIVE' },
          { userId: recipientId, role: MemberRole.MEMBER, status: 'ACTIVE' },
        ],
      },
    },
    include: {
      members: {
        where: { status: 'ACTIVE' },
        include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
      },
    },
  });

  response.status(201).json({
    success: true,
    message: 'Conversation directe créée.',
    data: {
      id: newSalon.id,
      name: recipient.displayName,
      type: 'CHAT',
      isDirect: true,
      directRecipient: recipient,
      members: newSalon.members.map(({ user }) => user),
      currentUserIsMember: true,
      currentUserRole: MemberRole.MEMBER,
    },
  });
}));

salonsRouter.post('/', asyncRoute(async (request, response) => {
  const name = typeof request.body?.name === 'string' ? request.body.name.trim() : '';
  const description = typeof request.body?.description === 'string' ? request.body.description.trim() : '';
  const rules = typeof request.body?.rules === 'string' ? request.body.rules.trim() : '';
  const type = request.body?.type;
  const threshold = request.body?.successThreshold === undefined ? 180 : Number(request.body.successThreshold);

  if (!name) {
    response.status(400).json({ success: false, message: 'Le nom du salon est obligatoire.' });
    return;
  }

  if (name.length > 100 || description.length > 5000 || rules.length > 5000) {
    response.status(400).json({ success: false, message: 'Le nom ou la description du salon dépasse la longueur autorisée.' });
    return;
  }

  if (type !== 'CHAT' && type !== 'CONTRIBUTION') {
    response.status(400).json({ success: false, message: 'Le type de salon est invalide.' });
    return;
  }

  if (!Number.isFinite(threshold) || threshold < 0) {
    response.status(400).json({ success: false, message: 'L’objectif de cotisation est invalide.' });
    return;
  }

  const salon = await prisma.salon.create({
    data: {
      name,
      description: description || null,
      rules: rules || null,
      type: type as SalonType,
      creatorId: request.userId!,
      successThreshold: type === 'CONTRIBUTION' ? new Prisma.Decimal(threshold) : null,
      members: {
        create: { userId: request.userId!, role: MemberRole.ADMIN, status: 'ACTIVE' },
      },
    },
    include: { members: { include: { user: { select: { id: true, username: true, displayName: true } } } } },
  });

  response.status(201).json({
    success: true,
    message: 'Salon créé avec succès.',
    data: {
      id: salon.id,
      name: salon.name,
      description: salon.description ?? '',
      rules: salon.rules ?? '',
      type: salon.type,
      currency: salon.currency,
      contributionAmount: salon.contributionAmount?.toString() ?? null,
      successThreshold: salon.successThreshold?.toString() ?? null,
      members: salon.members.map(({ user }) => user),
      currentUserIsMember: true,
      currentUserStatus: 'ACTIVE',
      currentUserRole: MemberRole.ADMIN,
    },
  });
}));

salonsRouter.get('/:id', asyncRoute(async (request, response) => {
  const salon = await prisma.salon.findUnique({
    where: { id: String(request.params.id) },
    include: {
      members: {
        include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
      },
    },
  });

  if (!salon || !salon.isDiscoverable) {
    response.status(404).json({ success: false, message: 'Salon introuvable.' });
    return;
  }

  const activeMembers = salon.members.filter((m) => m.status === 'ACTIVE');
  const pendingMembers = salon.members.filter((m) => m.status === 'PENDING');
  const currentMembership = salon.members.find(({ userId }) => userId === request.userId);
  const isCreator = salon.creatorId === request.userId;
  const isCurrentUserAdmin = isCreator && currentMembership?.status === 'ACTIVE';

  response.json({
    success: true,
    data: {
      id: salon.id,
      name: salon.name,
      description: salon.description ?? '',
      rules: salon.rules ?? '',
      type: salon.type,
      currency: salon.currency,
      creatorId: salon.creatorId,
      isCreator,
      contributionAmount: salon.contributionAmount?.toString() ?? null,
      successThreshold: salon.successThreshold?.toString() ?? null,
      members: activeMembers.map(({ user }) => user),
      currentUserIsMember: currentMembership?.status === 'ACTIVE',
      currentUserStatus: currentMembership?.status ?? null,
      currentUserRole: currentMembership?.status === 'ACTIVE' ? (isCreator ? MemberRole.ADMIN : currentMembership.role) : null,
      pendingRequestsCount: isCurrentUserAdmin ? pendingMembers.length : 0,
      pendingRequests: isCurrentUserAdmin
        ? pendingMembers.map((m) => ({
            id: m.id,
            userId: m.user.id,
            username: m.user.username,
            displayName: m.user.displayName,
            avatarUrl: m.user.avatarUrl ?? null,
            requestedAt: m.joinedAt,
          }))
        : [],
    },
  });
}));

// User requests to join the salon (creates a PENDING request waiting for admin confirmation)
salonsRouter.post('/:id/join', asyncRoute(async (request, response) => {
  const salonId = String(request.params.id);
  const salon = await prisma.salon.findUnique({
    where: { id: salonId },
    select: { id: true, isDiscoverable: true, creatorId: true },
  });

  if (!salon || !salon.isDiscoverable) {
    response.status(404).json({ success: false, message: 'Salon introuvable.' });
    return;
  }

  const existing = await prisma.salonMember.findUnique({
    where: { salonId_userId: { salonId, userId: request.userId! } },
  });

  if (existing?.status === 'ACTIVE') {
    response.status(400).json({ success: false, message: 'Vous êtes déjà membre actif de ce salon.' });
    return;
  }

  if (existing?.status === 'PENDING') {
    response.status(400).json({ success: false, message: 'Votre demande d’adhésion est déjà en attente d’approbation par l’administrateur.' });
    return;
  }

  await prisma.salonMember.upsert({
    where: { salonId_userId: { salonId, userId: request.userId! } },
    create: { salonId, userId: request.userId!, role: MemberRole.MEMBER, status: 'PENDING' },
    update: { status: 'PENDING' },
  });

  response.status(200).json({
    success: true,
    message: 'Demande d’adhésion envoyée. Un administrateur du salon doit confirmer votre adhésion avant que vous puissiez y accéder.',
    data: { status: 'PENDING' },
  });
}));

// Salon creator admin views pending adhesion requests
salonsRouter.get('/:id/pending-members', asyncRoute(async (request, response) => {
  const salonId = String(request.params.id);

  const salon = await prisma.salon.findUnique({
    where: { id: salonId },
    select: { id: true, creatorId: true },
  });

  if (!salon) {
    response.status(404).json({ success: false, message: 'Salon introuvable.' });
    return;
  }

  if (salon.creatorId !== request.userId!) {
    response.status(403).json({ success: false, message: 'Seul l’administrateur créateur de ce salon peut consulter les demandes d’adhésion.' });
    return;
  }

  const pending = await prisma.salonMember.findMany({
    where: { salonId, status: 'PENDING' },
    include: {
      user: {
        select: { id: true, username: true, displayName: true, avatarUrl: true },
      },
    },
    orderBy: { joinedAt: 'asc' },
  });

  response.json({
    success: true,
    data: pending.map((m) => ({
      membershipId: m.id,
      userId: m.user.id,
      username: m.user.username,
      displayName: m.user.displayName,
      avatarUrl: m.user.avatarUrl ?? null,
      requestedAt: m.joinedAt,
    })),
  });
}));

// Salon creator admin confirms a user's adhesion to the salon
salonsRouter.post('/:id/members/:userId/confirm', asyncRoute(async (request, response) => {
  const salonId = String(request.params.id);
  const targetUserId = String(request.params.userId);

  const salon = await prisma.salon.findUnique({
    where: { id: salonId },
    select: { id: true, creatorId: true },
  });

  if (!salon) {
    response.status(404).json({ success: false, message: 'Salon introuvable.' });
    return;
  }

  if (salon.creatorId !== request.userId!) {
    response.status(403).json({ success: false, message: 'Seul l’administrateur créateur de ce salon peut accepter une adhésion.' });
    return;
  }

  const targetMembership = await prisma.salonMember.findUnique({
    where: { salonId_userId: { salonId, userId: targetUserId } },
    include: { user: { select: { displayName: true } } },
  });

  if (!targetMembership) {
    response.status(404).json({ success: false, message: 'Demande d’adhésion introuvable.' });
    return;
  }

  await prisma.salonMember.update({
    where: { salonId_userId: { salonId, userId: targetUserId } },
    data: { status: 'ACTIVE' },
  });

  response.json({
    success: true,
    message: `Adhésion de ${targetMembership.user.displayName} confirmée avec succès.`,
  });
}));

// Salon creator admin rejects a user's adhesion request
salonsRouter.post('/:id/members/:userId/reject', asyncRoute(async (request, response) => {
  const salonId = String(request.params.id);
  const targetUserId = String(request.params.userId);

  const salon = await prisma.salon.findUnique({
    where: { id: salonId },
    select: { id: true, creatorId: true },
  });

  if (!salon) {
    response.status(404).json({ success: false, message: 'Salon introuvable.' });
    return;
  }

  if (salon.creatorId !== request.userId!) {
    response.status(403).json({ success: false, message: 'Seul l’administrateur créateur de ce salon peut refuser une demande d’adhésion.' });
    return;
  }

  await prisma.salonMember.deleteMany({
    where: { salonId, userId: targetUserId, status: 'PENDING' },
  });

  response.json({
    success: true,
    message: 'Demande d’adhésion refusée.',
  });
}));

// Member leaves the salon voluntarily
salonsRouter.post('/:id/leave', asyncRoute(async (request, response) => {
  const salonId = String(request.params.id);

  const membership = await prisma.salonMember.findUnique({
    where: { salonId_userId: { salonId, userId: request.userId! } },
  });

  if (!membership) {
    response.status(404).json({ success: false, message: 'Vous n’êtes pas membre de ce salon.' });
    return;
  }

  await prisma.salonMember.delete({
    where: { salonId_userId: { salonId, userId: request.userId! } },
  });

  response.json({ success: true, message: 'Vous avez quitté le salon.' });
}));

// Salon creator admin updates salon settings
salonsRouter.patch('/:id', asyncRoute(async (request, response) => {
  const salonId = String(request.params.id);
  const name = typeof request.body?.name === 'string' ? request.body.name.trim() : undefined;
  const description = typeof request.body?.description === 'string' ? request.body.description.trim() : undefined;
  const rules = typeof request.body?.rules === 'string' ? request.body.rules.trim() : undefined;
  const threshold = request.body?.successThreshold !== undefined ? Number(request.body.successThreshold) : undefined;

  const salon = await prisma.salon.findUnique({
    where: { id: salonId },
    select: { id: true, creatorId: true },
  });

  if (!salon) {
    response.status(404).json({ success: false, message: 'Salon introuvable.' });
    return;
  }

  if (salon.creatorId !== request.userId!) {
    response.status(403).json({ success: false, message: 'Seul l’administrateur créateur de ce salon peut modifier ses paramètres.' });
    return;
  }

  const updateData: Prisma.SalonUpdateInput = {};
  if (name !== undefined) {
    if (!name || name.length > 100) {
      response.status(400).json({ success: false, message: 'Nom de salon invalide.' });
      return;
    }
    updateData.name = name;
  }
  if (description !== undefined) updateData.description = description || null;
  if (rules !== undefined) updateData.rules = rules || null;
  if (threshold !== undefined && Number.isFinite(threshold) && threshold >= 0) {
    updateData.successThreshold = new Prisma.Decimal(threshold);
  }

  const updated = await prisma.salon.update({
    where: { id: salonId },
    data: updateData,
  });

  response.json({
    success: true,
    message: 'Salon mis à jour avec succès.',
    data: updated,
  });
}));

// Salon creator admin deletes the salon
salonsRouter.delete('/:id', asyncRoute(async (request, response) => {
  const salonId = String(request.params.id);

  const salon = await prisma.salon.findUnique({
    where: { id: salonId },
    select: { id: true, creatorId: true },
  });

  if (!salon) {
    response.status(404).json({ success: false, message: 'Salon introuvable.' });
    return;
  }

  if (salon.creatorId !== request.userId!) {
    response.status(403).json({ success: false, message: 'Seul l’administrateur créateur de ce salon peut supprimer ce salon.' });
    return;
  }

  await prisma.salon.delete({ where: { id: salonId } });
  response.json({ success: true, message: 'Salon supprimé avec succès.' });
}));

// Salon creator admin removes/kicks a member from the salon
salonsRouter.delete('/:id/members/:userId', asyncRoute(async (request, response) => {
  const salonId = String(request.params.id);
  const targetUserId = String(request.params.userId);

  const salon = await prisma.salon.findUnique({
    where: { id: salonId },
    select: { id: true, creatorId: true },
  });

  if (!salon) {
    response.status(404).json({ success: false, message: 'Salon introuvable.' });
    return;
  }

  if (salon.creatorId !== request.userId!) {
    response.status(403).json({ success: false, message: 'Seul l’administrateur créateur de ce salon peut exclure ou supprimer un membre.' });
    return;
  }

  if (targetUserId === salon.creatorId) {
    response.status(400).json({ success: false, message: 'Le créateur du salon ne peut pas être exclu du salon.' });
    return;
  }

  if (targetUserId === request.userId) {
    response.status(400).json({ success: false, message: 'Utilisez l’option quitter pour partir du salon.' });
    return;
  }

  await prisma.salonMember.deleteMany({
    where: { salonId, userId: targetUserId },
  });

  response.json({ success: true, message: 'Membre retiré du salon avec succès.' });
}));
