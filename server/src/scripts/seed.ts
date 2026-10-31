import 'dotenv/config';
import { randomBytes, scrypt } from 'node:crypto';
import { promisify } from 'node:util';
import { MemberRole, Prisma, PrismaClient, SalonType } from '@prisma/client';

const scryptAsync = promisify(scrypt);
const passwordKeyLength = 64;

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = await scryptAsync(password, salt, passwordKeyLength) as Buffer;
  return `scrypt:${salt}:${derivedKey.toString('hex')}`;
}

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Nettoyage et initialisation des données de test...');

  await prisma.contributionPayment.deleteMany();
  await prisma.message.deleteMany();
  await prisma.salonJoinRequest.deleteMany();
  await prisma.salonMember.deleteMany();
  await prisma.salon.deleteMany();
  await prisma.friendship.deleteMany();
  // Ne pas supprimer les utilisateurs existants pour préserver les comptes créés (Oryen, etc.)

  const defaultPasswordHash = await hashPassword('Password123!');

  const defaultSecurityQuestion = 'Dans quelle ville êtes-vous né(e) ?';
  const defaultSecurityAnswer = 'paris';

  console.log('👤 Création des utilisateurs...');
  const alex = await prisma.user.create({
    data: {
      username: 'alex',
      displayName: 'Alex Martin',
      email: 'alex@bmf.org',
      passwordHash: defaultPasswordHash,
      securityQuestion: defaultSecurityQuestion,
      securityAnswer: defaultSecurityAnswer,
    },
  });

  const sarah = await prisma.user.create({
    data: {
      username: 'sarah',
      displayName: 'Sarah Koné',
      email: 'sarah@bmf.org',
      passwordHash: defaultPasswordHash,
      securityQuestion: defaultSecurityQuestion,
      securityAnswer: defaultSecurityAnswer,
    },
  });

  const jean = await prisma.user.create({
    data: {
      username: 'jean',
      displayName: 'Jean Dupont',
      email: 'jean@bmf.org',
      passwordHash: defaultPasswordHash,
      securityQuestion: defaultSecurityQuestion,
      securityAnswer: defaultSecurityAnswer,
    },
  });

  const claire = await prisma.user.create({
    data: {
      username: 'claire',
      displayName: 'Claire Valette',
      email: 'claire@bmf.org',
      passwordHash: defaultPasswordHash,
      securityQuestion: defaultSecurityQuestion,
      securityAnswer: defaultSecurityAnswer,
    },
  });

  console.log('🤝 Création des amitiés...');
  await prisma.friendship.create({
    data: {
      requesterId: alex.id,
      addresseeId: sarah.id,
      status: 'ACCEPTED',
    },
  });

  await prisma.friendship.create({
    data: {
      requesterId: alex.id,
      addresseeId: jean.id,
      status: 'ACCEPTED',
    },
  });

  await prisma.friendship.create({
    data: {
      requesterId: claire.id,
      addresseeId: alex.id,
      status: 'PENDING',
    },
  });

  console.log('🏛️ Création des salons...');
  const salonGeneral = await prisma.salon.create({
    data: {
      name: 'Général & Entraide',
      description: 'Espace d’échange principal pour tous les membres de la communauté.',
      rules: 'Bienveillance, respect mutuel et entraide avant tout.',
      type: SalonType.CHAT,
      creatorId: alex.id,
      members: {
        create: [
          { userId: alex.id, role: MemberRole.ADMIN, status: 'ACTIVE' },
          { userId: sarah.id, role: MemberRole.MEMBER, status: 'ACTIVE' },
          { userId: jean.id, role: MemberRole.MEMBER, status: 'ACTIVE' },
          { userId: claire.id, role: MemberRole.MEMBER, status: 'ACTIVE' },
        ],
      },
    },
  });

  const salonProjets = await prisma.salon.create({
    data: {
      name: 'Projets & Événements',
      description: 'Brainstorming et organisation des actions collectives et sorties.',
      rules: 'Partagez vos idées et propositions d’activités.',
      type: SalonType.CHAT,
      creatorId: sarah.id,
      members: {
        create: [
          { userId: sarah.id, role: MemberRole.ADMIN, status: 'ACTIVE' },
          { userId: alex.id, role: MemberRole.MEMBER, status: 'ACTIVE' },
          { userId: jean.id, role: MemberRole.MEMBER, status: 'ACTIVE' },
        ],
      },
    },
  });

  const salonCagnotte = await prisma.salon.create({
    data: {
      name: 'Cagnotte Solidaire 2026',
      description: 'Fonds de soutien et de cotisations mutuelles pour les projets communautaires.',
      rules: 'Cotisation suggérée : 150 $ par membre pour financer nos actions annuelles.',
      type: SalonType.CONTRIBUTION,
      successThreshold: new Prisma.Decimal(600),
      currency: 'USD',
      creatorId: alex.id,
      members: {
        create: [
          { userId: alex.id, role: MemberRole.ADMIN, status: 'ACTIVE' },
          { userId: sarah.id, role: MemberRole.MEMBER, status: 'ACTIVE' },
          { userId: jean.id, role: MemberRole.MEMBER, status: 'ACTIVE' },
          { userId: claire.id, role: MemberRole.MEMBER, status: 'ACTIVE' },
        ],
      },
    },
  });

  console.log('💬 Envoi de messages de démonstration...');
  await prisma.message.createMany({
    data: [
      {
        salonId: salonGeneral.id,
        authorId: alex.id,
        content: 'Bienvenue à toutes et à tous sur la plateforme BMF Community ! 🌿',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
      },
      {
        salonId: salonGeneral.id,
        authorId: sarah.id,
        content: 'Merci Alex ! L’espace est super propre et très fluide. Hâte de lancer les ateliers.',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
      },
      {
        salonId: salonGeneral.id,
        authorId: jean.id,
        content: 'Salut l’équipe ! De mon côté j’ai déjà versé ma part pour la cagnotte solidaire.',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12),
      },
      {
        salonId: salonGeneral.id,
        authorId: claire.id,
        content: 'Bonjour à tous ! Ravie d’avoir rejoint le collectif !',
        createdAt: new Date(Date.now() - 1000 * 60 * 30),
      },
      {
        salonId: salonProjets.id,
        authorId: sarah.id,
        content: 'Quelqu’un a des disponibilités pour organiser une rencontre le mois prochain ?',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 18),
      },
      {
        salonId: salonProjets.id,
        authorId: alex.id,
        content: 'Oui tout à fait, je prépare un sondage de dates dans la semaine !',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
      },
    ],
  });

  console.log('💳 Enregistrement de cotisations...');
  const today = new Date();
  const d1 = new Date(today);
  d1.setDate(d1.getDate() - 5);
  const d2 = new Date(today);
  d2.setDate(d2.getDate() - 3);
  const d3 = new Date(today);
  d3.setDate(d3.getDate() - 1);

  await prisma.contributionPayment.createMany({
    data: [
      {
        salonId: salonCagnotte.id,
        recipientId: alex.id,
        recordedById: alex.id,
        amount: new Prisma.Decimal(150),
        paidAt: d1,
        reason: 'Cotisation annuelle Alex',
      },
      {
        salonId: salonCagnotte.id,
        recipientId: sarah.id,
        recordedById: alex.id,
        amount: new Prisma.Decimal(150),
        paidAt: d2,
        reason: 'Cotisation annuelle Sarah',
      },
      {
        salonId: salonCagnotte.id,
        recipientId: jean.id,
        recordedById: alex.id,
        amount: new Prisma.Decimal(100),
        paidAt: d3,
        reason: 'Acompte cotisation Jean',
      },
    ],
  });

  console.log('✅ Base de données initialisée avec succès !');
  console.log('👉 Comptes de test (mot de passe: "Password123!") :');
  console.log('   - alex (Admin)');
  console.log('   - sarah');
  console.log('   - jean');
  console.log('   - claire');
}

main()
  .catch((e) => {
    console.error('Erreur lors du seed :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
