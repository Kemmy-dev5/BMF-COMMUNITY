# Guide de Déploiement & Hébergement — BMF Community

Oui, **BMF Community peut être hébergé très facilement en production**.

L'application est composée de trois couches :
1. **Frontend (Client)** : React 19 + Vite + Tailwind CSS + PWA (installable sur mobile).
2. **Backend (Serveur)** : Node.js + Express + Prisma ORM + Uploads.
3. **Base de données** : MySQL.

---

## Option 1 : Déploiement Simple & Cloud (Recommandé pour démarrer)

### A. Base de données MySQL
Vous pouvez créer une base MySQL infogérée gratuite ou à faible coût sur :
- **Railway.app** (1 clic pour provisionner MySQL, copie de l'URL `DATABASE_URL`)
- **Aiven.io** (offre gratuite MySQL)
- **Clever Cloud** ou **Scaleway**

### B. Backend Node.js (API)
Hébergez le serveur sur **Render.com** ou **Railway.app** :
1. Connectez votre dépôt GitHub.
2. Créez un **Web Service**.
3. Répertoire racine : `server`
4. Build Command : `npm install && npm run build && npx prisma db push`
5. Start Command : `npm run start`
6. Variables d'environnement :
   - `DATABASE_URL` = `mysql://user:pass@host:3306/bmf_db`
   - `JWT_SECRET` = `une_cle_secrete_tres_longue_et_aleatoire`
   - `PORT` = `4000`
   - `CORS_ORIGIN` = `https://votre-frontend.vercel.app`

### C. Frontend React (PWA & Mobile)
Hébergez le client sur **Vercel** ou **Netlify** (gratuit, ultra-rapide avec CDN mondial et HTTPS obligatoire pour la PWA) :
1. Connectez le dépôt GitHub sur [Vercel](https://vercel.com).
2. Répertoire racine (Root Directory) : `client`
3. Framework Preset : `Vite`
4. Build Command : `npm run build`
5. Output Directory : `dist`
6. Variable d'environnement :
   - `VITE_API_URL` = `https://votre-backend.onrender.com/api`

---

## Option 2 : Déploiement sur Serveur Dédié / VPS (Hostinger, OVH, Hetzner, DigitalOcean)

Pour un contrôle total, un coût fixe réduit (~4-5€ / mois) et un nom de domaine personnalisé :

### 1. Préparation du serveur Ubuntu
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose git nginx certbot python3-certbot-nginx
```

### 2. Cloner le projet et lancer avec Docker
```bash
git clone https://github.com/votre-compte/bmf-community.git
cd bmf-community
docker-compose up -d --build
```

### 3. Certificat SSL HTTPS Gratuit (Obligatoire pour PWA & Notifications)
```bash
sudo certbot --nginx -d votre-domaine.com
```

---

## Fonctionnalités Clés Validées :
1. **Sécurité Administrateur Salon** :
   - Seul le créateur du salon (`creatorId`) peut consulter les demandes d'adhésion.
   - Seul le créateur peut accepter ou refuser les nouveaux membres.
   - Seul le créateur peut exclure/supprimer un membre (le créateur ne peut pas être exclu).
   - Seul le créateur peut encaisser des paiements de cotisations et fixer les quotas individuels.
2. **Thème Dark / Light** :
   - Bascule fluide disponible dans la barre du haut, la barre latérale et le profil.
   - Mémorisation de la préférence dans `localStorage`.
   - Palette émeraude sombre haut de gamme sans scintillement au chargement.
3. **Application Mobile Installable (PWA)** :
   - Manifest Web (`manifest.webmanifest`) et Service Worker (`sw.js`).
   - Icônes haute résolution Android / iOS (`192x192`, `512x512`, `maskable`, `icon.svg`).
   - Bannière d'installation mobile 1-clic pour Android et guidée pour iPhone.
4. **Signal Téléphone sur Notification** :
   - Vibration physique du smartphone via `navigator.vibrate()`.
   - Carillon sonore synthétisé avec l'API Web Audio (instantané, sans fichier externe).
   - Bouton « Tester le signal » directement dans le menu de notifications et dans le profil.
