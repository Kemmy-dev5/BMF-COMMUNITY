import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import { asyncRoute } from '../../lib/asyncRoute.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { uploadLimiter } from '../../middleware/rateLimiter.js';

export const uploadRouter = Router();
uploadRouter.use(requireAuth);
uploadRouter.use(uploadLimiter);

const uploadsDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const ALLOWED_EXTENSIONS: Record<'image' | 'video' | 'audio', Set<string>> = {
  image: new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']),
  video: new Set(['mp4', 'webm', 'mov', 'mkv']),
  audio: new Set(['webm', 'ogg', 'wav', 'mp3', 'm4a', 'weba']),
};

function detectSafeExtension(type: 'image' | 'video' | 'audio', header: string, requestedExt: string): string | null {
  const cleanExt = requestedExt.toLowerCase().replace(/[^a-z0-9]/gi, '');
  const allowed = ALLOWED_EXTENSIONS[type];

  if (cleanExt && allowed.has(cleanExt)) {
    return cleanExt === 'jpeg' ? 'jpg' : cleanExt;
  }

  // Detect from header MIME type
  if (type === 'video') {
    if (header.includes('video/webm')) return 'webm';
    if (header.includes('video/mp4')) return 'mp4';
    if (header.includes('video/quicktime')) return 'mov';
    if (header.includes('video/x-matroska')) return 'mkv';
    return 'mp4';
  }

  if (type === 'audio') {
    if (header.includes('audio/ogg')) return 'ogg';
    if (header.includes('audio/wav') || header.includes('audio/x-wav')) return 'wav';
    if (header.includes('audio/mpeg') || header.includes('audio/mp3')) return 'mp3';
    if (header.includes('audio/mp4') || header.includes('audio/m4a')) return 'm4a';
    if (header.includes('audio/webm') || header.includes('audio/weba')) return 'webm';
    return 'webm';
  }

  // image
  if (header.includes('image/jpeg')) return 'jpg';
  if (header.includes('image/png')) return 'png';
  if (header.includes('image/webp')) return 'webp';
  if (header.includes('image/gif')) return 'gif';

  // Disallow SVG or unknown formats for security reasons
  return null;
}

uploadRouter.post('/', asyncRoute(async (request, response) => {
  const data = typeof request.body?.data === 'string' ? request.body.data : '';
  const rawType = String(request.body?.type ?? '');
  const type: 'audio' | 'video' | 'image' = rawType === 'video' ? 'video' : rawType === 'audio' ? 'audio' : 'image';
  const rawExtension = typeof request.body?.extension === 'string' ? request.body.extension : '';

  if (!data || !data.includes(',')) {
    response.status(400).json({ success: false, message: 'Format de fichier ou données base64 invalides.' });
    return;
  }

  const [header, base64Content] = data.split(',');
  if (!base64Content) {
    response.status(400).json({ success: false, message: 'Contenu base64 manquant.' });
    return;
  }

  const ext = detectSafeExtension(type, header, rawExtension);
  if (!ext) {
    response.status(400).json({
      success: false,
      message: 'Format de média non pris en charge ou potentiellement dangereux. Formats autorisés : JPG, PNG, WEBP, GIF, MP4, WEBM, MOV, MP3, WAV, OGG.',
    });
    return;
  }

  const buffer = Buffer.from(base64Content, 'base64');
  if (buffer.length > 50 * 1024 * 1024) {
    response.status(400).json({ success: false, message: 'Le fichier dépasse la taille maximale autorisée (50 Mo).' });
    return;
  }

  const filename = `${type}_${Date.now()}_${randomBytes(6).toString('hex')}.${ext}`;
  const filepath = path.join(uploadsDir, filename);

  await fs.promises.writeFile(filepath, buffer);

  const fileUrl = `/uploads/${filename}`;

  response.status(201).json({
    success: true,
    message: 'Fichier téléversé avec succès.',
    data: {
      url: fileUrl,
      type,
      filename,
      size: buffer.length,
    },
  });
}));
