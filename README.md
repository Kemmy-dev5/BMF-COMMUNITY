# BMF Community

Application communautaire avec comptes, salons de discussion, demandes d’amis et suivi persistant des cotisations.

## Architecture

- `client/` : interface React, TypeScript, Vite et Tailwind CSS.
- `server/` : API REST Express et Prisma ORM.
- `server/prisma/schema.prisma` : comptes, amitiés, salons, membres, messages et paiements.

Les opérations applicatives passent par l’API et sont enregistrées dans MySQL. Les mots de passe sont hachés avec scrypt et la session est conservée dans un cookie HTTP-only.

## Prérequis

- Node.js 20 ou supérieur
- MySQL 8 ou supérieur

## Démarrage local

1. Créer une base MySQL nommée `bmf_communuty` (ou ajuster `DATABASE_URL` si une autre base existe déjà).
2. Copier `.env.example` vers `server/.env`, puis adapter `DATABASE_URL` et remplacer `JWT_SECRET` par une valeur aléatoire longue.
3. À la racine du projet, lancer `npm install`.
4. Générer le client Prisma et créer/mettre à jour les tables : `npm run db:generate`, puis `npm run db:push`.
5. Démarrer l’interface et l’API : `npm run dev`.
6. Créer votre compte depuis l’écran de connexion. Les nouveaux comptes commencent sans salons; vous pouvez ensuite en créer ou en rejoindre.

L’interface est servie par Vite (par défaut `http://localhost:5173`; Vite choisit un autre port si celui-ci est occupé). L’API écoute sur `http://localhost:4000/api`.

Si l’API n’est pas sur le port 4000, définir `VITE_API_URL` dans `client/.env.local`, par exemple `VITE_API_URL=http://localhost:4001/api`.
