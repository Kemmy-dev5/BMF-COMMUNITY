import { Router } from 'express';
import { asyncRoute } from '../../lib/asyncRoute.js';
import { prisma } from '../../lib/prisma.js';
import { requireAuth } from '../../middleware/requireAuth.js';

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth);

dashboardRouter.get('/', asyncRoute(async (request, response) => {
  const [communityUsers, openSalons, memberships] = await Promise.all([
    prisma.user.count(),
    prisma.salon.count({ where: { isDiscoverable: true } }),
    prisma.salonMember.findMany({
      where: { userId: request.userId, status: 'ACTIVE' },
      include: { salon: { select: { id: true, type: true, successThreshold: true } } },
    }),
  ]);

  const contributionSalonIds = memberships
    .filter(({ salon }) => salon.type === 'CONTRIBUTION')
    .map(({ salon }) => salon.id);
  const payments = contributionSalonIds.length
    ? await prisma.contributionPayment.findMany({
      where: { salonId: { in: contributionSalonIds } },
      select: { amount: true },
    })
    : [];

  const contributionsTotal = payments.reduce((total, payment) => total + Number(payment.amount), 0);
  const contributionTarget = memberships
    .filter(({ salon }) => salon.type === 'CONTRIBUTION')
    .reduce((total, { salon }) => total + Number(salon.successThreshold ?? 180), 0);

  response.json({
    success: true,
    data: {
      communityUsers,
      openSalons,
      joinedSalons: memberships.length,
      contributionsTotal,
      contributionTarget,
      contributionRemaining: Math.max(0, contributionTarget - contributionsTotal),
    },
  });
}));
