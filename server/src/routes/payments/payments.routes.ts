import { Prisma } from '@prisma/client';
import { Router } from 'express';
import { asyncRoute } from '../../lib/asyncRoute.js';
import { prisma } from '../../lib/prisma.js';
import { requireAuth } from '../../middleware/requireAuth.js';

export const paymentsRouter = Router();
paymentsRouter.use(requireAuth);

paymentsRouter.get('/summary', asyncRoute(async (request, response) => {
  const salonId = typeof request.query.salonId === 'string' ? request.query.salonId : '';
  if (!salonId) {
    response.status(400).json({ success: false, message: 'salonId est obligatoire.' });
    return;
  }

  const salon = await prisma.salon.findFirst({
    where: {
      id: salonId,
      members: { some: { userId: request.userId, status: 'ACTIVE' } },
    },
    include: {
      payments: {
        include: { recipient: { select: { id: true, username: true, displayName: true } } },
        orderBy: { paidAt: 'desc' },
      },
      members: {
        where: { status: 'ACTIVE' },
        include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
      },
    },
  });

  if (!salon) {
    response.status(404).json({ success: false, message: 'Salon introuvable ou accès refusé.' });
    return;
  }

  const totalAmount = salon.payments.reduce((total, payment) => total + Number(payment.amount), 0);
  const successThreshold = Number(salon.successThreshold ?? 180);

  const membersSummary = salon.members.map((member) => {
    const { user, role, assignedAmount } = member;
    const memberPayments = salon.payments.filter((payment) => payment.recipientId === user.id);
    const totalPaid = memberPayments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    const assigned = assignedAmount !== null ? Number(assignedAmount) : null;
    const remainingToPay = assigned !== null ? Math.max(0, assigned - totalPaid) : null;

    return {
      userId: user.id,
      user: user.displayName,
      username: user.username,
      avatarUrl: user.avatarUrl ?? null,
      role,
      assignedAmount: assigned,
      totalPaid,
      remainingToPay,
      paymentsCount: memberPayments.length,
      isFullyPaid: assigned !== null ? totalPaid >= assigned : totalPaid > 0,
    };
  });

  response.json({
    success: true,
    data: {
      totalAmount,
      successThreshold,
      remainingToCollect: Math.max(0, successThreshold - totalAmount),
      remainingToPay: Math.max(0, totalAmount - successThreshold),
      currency: salon.currency,
      membersSummary,
      contributions: salon.payments.map((payment) => ({
        id: payment.id,
        userId: payment.recipient.id,
        user: payment.recipient.displayName,
        amount: Number(payment.amount),
        date: payment.paidAt.toISOString().slice(0, 10),
        motif: payment.reason ?? '',
        recordedById: payment.recordedById,
      })),
    },
  });
}));

// Only the salon creator administrator sets / updates the expected contribution quota for a specific member in the salon
paymentsRouter.patch('/quota', asyncRoute(async (request, response) => {
  const salonId = typeof request.body?.salonId === 'string' ? request.body.salonId : '';
  const targetUserId = typeof request.body?.userId === 'string' ? request.body.userId : '';
  const amount = Number(request.body?.assignedAmount);

  if (!salonId || !targetUserId || !Number.isFinite(amount) || amount < 0) {
    response.status(400).json({ success: false, message: 'Le salon, le membre et un montant positif sont obligatoires.' });
    return;
  }

  const salon = await prisma.salon.findUnique({
    where: { id: salonId },
    select: { id: true, creatorId: true },
  });

  if (!salon) {
    response.status(404).json({ success: false, message: 'Salon introuvable.' });
    return;
  }

  if (salon.creatorId !== request.userId) {
    response.status(403).json({ success: false, message: 'Seul l’administrateur créateur de ce salon peut définir le montant à encaisser pour ce membre.' });
    return;
  }

  const targetMembership = await prisma.salonMember.findUnique({
    where: { salonId_userId: { salonId, userId: targetUserId } },
    include: { user: { select: { displayName: true } } },
  });

  if (!targetMembership) {
    response.status(404).json({ success: false, message: 'Ce membre ne fait pas partie du salon.' });
    return;
  }

  await prisma.salonMember.update({
    where: { salonId_userId: { salonId, userId: targetUserId } },
    data: { assignedAmount: new Prisma.Decimal(amount) },
  });

  response.json({
    success: true,
    message: `Montant individuel fixé à ${amount} pour ${targetMembership.user.displayName}.`,
    data: { userId: targetUserId, assignedAmount: amount },
  });
}));

// Only the salon creator administrator can record/collect payments
paymentsRouter.post('/', asyncRoute(async (request, response) => {
  const salonId = typeof request.body?.salonId === 'string' ? request.body.salonId : '';
  const recipientId = typeof request.body?.recipientId === 'string' ? request.body.recipientId : request.userId!;
  const amount = Number(request.body?.amount);
  const date = typeof request.body?.date === 'string' ? request.body.date : '';
  const reason = typeof request.body?.reason === 'string' ? request.body.reason.trim() : '';

  if (!salonId || !recipientId || !date || !Number.isFinite(amount) || amount <= 0) {
    response.status(400).json({ success: false, message: 'Salon, membre, montant positif et date valide sont obligatoires.' });
    return;
  }

  const paidAt = new Date(`${date}T00:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(paidAt.getTime()) || paidAt.toISOString().slice(0, 10) !== date) {
    response.status(400).json({ success: false, message: 'La date du paiement est invalide.' });
    return;
  }

  if (reason.length > 255) {
    response.status(400).json({ success: false, message: 'Le motif ne peut pas dépasser 255 caractères.' });
    return;
  }

  const salon = await prisma.salon.findUnique({
    where: { id: salonId },
    select: { id: true, creatorId: true },
  });

  if (!salon) {
    response.status(404).json({ success: false, message: 'Salon introuvable.' });
    return;
  }

  if (salon.creatorId !== request.userId) {
    response.status(403).json({ success: false, message: 'Seul l’administrateur créateur de ce salon peut encaisser et enregistrer des paiements.' });
    return;
  }

  const recipientMember = await prisma.salonMember.findFirst({
    where: { salonId, userId: recipientId, status: 'ACTIVE' },
    select: { userId: true },
  });

  if (!recipientMember) {
    response.status(400).json({ success: false, message: 'Le bénéficiaire doit être un membre actif de ce salon.' });
    return;
  }

  const payment = await prisma.contributionPayment.create({
    data: {
      salonId,
      recipientId,
      recordedById: request.userId!,
      amount: new Prisma.Decimal(amount),
      paidAt,
      reason: reason || null,
    },
    include: { recipient: { select: { id: true, displayName: true } } },
  });

  response.status(201).json({
    success: true,
    message: 'Paiement enregistré avec succès.',
    data: {
      id: payment.id,
      userId: payment.recipient.id,
      user: payment.recipient.displayName,
      amount: Number(payment.amount),
      date: payment.paidAt.toISOString().slice(0, 10),
      motif: payment.reason ?? '',
    },
  });
}));

// Only the salon creator administrator can delete payments
paymentsRouter.delete('/:id', asyncRoute(async (request, response) => {
  const payment = await prisma.contributionPayment.findUnique({
    where: { id: String(request.params.id) },
    include: { salon: { select: { id: true, creatorId: true } } },
  });

  if (!payment) {
    response.status(404).json({ success: false, message: 'Paiement introuvable.' });
    return;
  }

  if (payment.salon.creatorId !== request.userId) {
    response.status(403).json({ success: false, message: 'Seul l’administrateur créateur de ce salon peut supprimer ou modifier des paiements.' });
    return;
  }

  await prisma.contributionPayment.delete({ where: { id: payment.id } });
  response.json({ success: true, message: 'Paiement supprimé.' });
}));
