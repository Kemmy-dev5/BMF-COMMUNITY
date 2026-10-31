import { Router } from 'express';
import { asyncRoute } from '../../lib/asyncRoute.js';
import { prisma } from '../../lib/prisma.js';
import { requireAuth } from '../../middleware/requireAuth.js';

export const postsRouter = Router();
postsRouter.use(requireAuth);

function formatPost(post: any, currentUserId: string) {
  const isLikedByMe = post.likes?.some((like: any) => like.userId === currentUserId) ?? false;
  return {
    id: post.id,
    authorId: post.authorId,
    content: post.content,
    mediaType: post.mediaType,
    mediaUrl: post.mediaUrl,
    sharesCount: post.sharesCount ?? 0,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    author: {
      id: post.author.id,
      username: post.author.username,
      displayName: post.author.displayName,
      avatarUrl: post.author.avatarUrl ?? null,
      bio: post.author.bio ?? null,
    },
    likesCount: post._count?.likes ?? post.likes?.length ?? 0,
    commentsCount: post._count?.comments ?? post.comments?.length ?? 0,
    isLikedByMe,
    comments: (post.comments ?? []).map((c: any) => ({
      id: c.id,
      authorId: c.authorId,
      content: c.content,
      createdAt: c.createdAt,
      author: {
        id: c.author.id,
        username: c.author.username,
        displayName: c.author.displayName,
        avatarUrl: c.author.avatarUrl ?? null,
      },
    })),
  };
}

// 1. Fil d'actualité global (Feed)
postsRouter.get('/', asyncRoute(async (request, response) => {
  const limit = Math.min(50, Math.max(1, Number(request.query.limit) || 20));
  const cursor = typeof request.query.cursor === 'string' && request.query.cursor ? request.query.cursor : undefined;

  const posts = await prisma.post.findMany({
    take: limit + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy: { createdAt: 'desc' },
    include: {
      author: {
        select: { id: true, username: true, displayName: true, avatarUrl: true, bio: true },
      },
      likes: {
        where: { userId: request.userId! },
        select: { userId: true },
      },
      comments: {
        orderBy: { createdAt: 'asc' },
        include: {
          author: {
            select: { id: true, username: true, displayName: true, avatarUrl: true },
          },
        },
      },
      _count: {
        select: { likes: true, comments: true },
      },
    },
  });

  const hasMore = posts.length > limit;
  const items = hasMore ? posts.slice(0, limit) : posts;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  response.json({
    success: true,
    data: {
      posts: items.map((p) => formatPost(p, request.userId!)),
      nextCursor,
      hasMore,
    },
  });
}));

// 2. Récupérer une publication spécifique par ID (pour partage / permalien)
postsRouter.get('/:id', asyncRoute(async (request, response) => {
  const postId = String(request.params.id);

  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      author: {
        select: { id: true, username: true, displayName: true, avatarUrl: true, bio: true },
      },
      likes: {
        where: { userId: request.userId! },
        select: { userId: true },
      },
      comments: {
        orderBy: { createdAt: 'asc' },
        include: {
          author: {
            select: { id: true, username: true, displayName: true, avatarUrl: true },
          },
        },
      },
      _count: {
        select: { likes: true, comments: true },
      },
    },
  });

  if (!post) {
    response.status(404).json({ success: false, message: 'Publication introuvable.' });
    return;
  }

  response.json({
    success: true,
    data: formatPost(post, request.userId!),
  });
}));

// 3. Récupérer les publications d'un utilisateur spécifique
postsRouter.get('/user/:targetId', asyncRoute(async (request, response) => {
  const targetId = String(request.params.targetId).trim();

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ id: targetId }, { username: targetId.toLowerCase() }],
    },
    select: { id: true },
  });

  if (!user) {
    response.status(404).json({ success: false, message: 'Utilisateur introuvable.' });
    return;
  }

  const posts = await prisma.post.findMany({
    where: { authorId: user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      author: {
        select: { id: true, username: true, displayName: true, avatarUrl: true, bio: true },
      },
      likes: {
        where: { userId: request.userId! },
        select: { userId: true },
      },
      comments: {
        orderBy: { createdAt: 'asc' },
        include: {
          author: {
            select: { id: true, username: true, displayName: true, avatarUrl: true },
          },
        },
      },
      _count: {
        select: { likes: true, comments: true },
      },
    },
  });

  response.json({
    success: true,
    data: posts.map((p) => formatPost(p, request.userId!)),
  });
}));

// 4. Créer une nouvelle publication
postsRouter.post('/', asyncRoute(async (request, response) => {
  const content = typeof request.body?.content === 'string' ? request.body.content.trim() : '';
  const mediaType = typeof request.body?.mediaType === 'string' && ['IMAGE', 'VIDEO'].includes(request.body.mediaType.toUpperCase())
    ? (request.body.mediaType.toUpperCase() as 'IMAGE' | 'VIDEO')
    : null;
  const mediaUrl = typeof request.body?.mediaUrl === 'string' ? request.body.mediaUrl.trim() : null;

  if (!content && !mediaUrl) {
    response.status(400).json({ success: false, message: 'Veuillez saisir un texte ou ajouter un média (photo ou vidéo).' });
    return;
  }

  if (content.length > 5000) {
    response.status(400).json({ success: false, message: 'Le texte de la publication ne peut pas dépasser 5 000 caractères.' });
    return;
  }

  const newPost = await prisma.post.create({
    data: {
      authorId: request.userId!,
      content,
      mediaType,
      mediaUrl,
    },
    include: {
      author: {
        select: { id: true, username: true, displayName: true, avatarUrl: true, bio: true },
      },
      likes: true,
      comments: true,
      _count: {
        select: { likes: true, comments: true },
      },
    },
  });

  response.status(201).json({
    success: true,
    message: 'Publication créée avec succès.',
    data: formatPost(newPost, request.userId!),
  });
}));

// 5. Supprimer une publication
postsRouter.delete('/:id', asyncRoute(async (request, response) => {
  const postId = String(request.params.id);

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, authorId: true },
  });

  if (!post) {
    response.status(404).json({ success: false, message: 'Publication introuvable.' });
    return;
  }

  if (post.authorId !== request.userId) {
    response.status(403).json({ success: false, message: 'Vous ne pouvez supprimer que vos propres publications.' });
    return;
  }

  await prisma.post.delete({ where: { id: postId } });

  response.json({
    success: true,
    message: 'Publication supprimée.',
  });
}));

// 6. Liker / Déliker une publication (Toggle like)
postsRouter.post('/:id/like', asyncRoute(async (request, response) => {
  const postId = String(request.params.id);
  const userId = request.userId!;

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true },
  });

  if (!post) {
    response.status(404).json({ success: false, message: 'Publication introuvable.' });
    return;
  }

  const existingLike = await prisma.postLike.findUnique({
    where: {
      postId_userId: { postId, userId },
    },
  });

  let isLiked = false;
  if (existingLike) {
    await prisma.postLike.delete({
      where: { id: existingLike.id },
    });
    isLiked = false;
  } else {
    await prisma.postLike.create({
      data: { postId, userId },
    });
    isLiked = true;
  }

  const likesCount = await prisma.postLike.count({ where: { postId } });

  response.json({
    success: true,
    data: {
      isLiked,
      likesCount,
    },
  });
}));

// 7. Commenter une publication
postsRouter.post('/:id/comments', asyncRoute(async (request, response) => {
  const postId = String(request.params.id);
  const content = typeof request.body?.content === 'string' ? request.body.content.trim() : '';

  if (!content) {
    response.status(400).json({ success: false, message: 'Le commentaire ne peut pas être vide.' });
    return;
  }

  if (content.length > 1000) {
    response.status(400).json({ success: false, message: 'Le commentaire ne doit pas dépasser 1 000 caractères.' });
    return;
  }

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true },
  });

  if (!post) {
    response.status(404).json({ success: false, message: 'Publication introuvable.' });
    return;
  }

  const comment = await prisma.postComment.create({
    data: {
      postId,
      authorId: request.userId!,
      content,
    },
    include: {
      author: {
        select: { id: true, username: true, displayName: true, avatarUrl: true },
      },
    },
  });

  response.status(201).json({
    success: true,
    message: 'Commentaire ajouté.',
    data: {
      id: comment.id,
      authorId: comment.authorId,
      content: comment.content,
      createdAt: comment.createdAt,
      author: {
        id: comment.author.id,
        username: comment.author.username,
        displayName: comment.author.displayName,
        avatarUrl: comment.author.avatarUrl ?? null,
      },
    },
  });
}));

// 8. Supprimer un commentaire
postsRouter.delete('/comments/:commentId', asyncRoute(async (request, response) => {
  const commentId = String(request.params.commentId);

  const comment = await prisma.postComment.findUnique({
    where: { id: commentId },
    include: { post: { select: { authorId: true } } },
  });

  if (!comment) {
    response.status(404).json({ success: false, message: 'Commentaire introuvable.' });
    return;
  }

  // Autorisé si auteur du commentaire ou auteur de la publication
  if (comment.authorId !== request.userId && comment.post.authorId !== request.userId) {
    response.status(403).json({ success: false, message: 'Action non autorisée.' });
    return;
  }

  await prisma.postComment.delete({ where: { id: commentId } });

  response.json({
    success: true,
    message: 'Commentaire supprimé.',
  });
}));

// 9. Partager une publication (dans un salon, à un ami ou copier le lien)
postsRouter.post('/:id/share', asyncRoute(async (request, response) => {
  const postId = String(request.params.id);
  const type = String(request.body?.type ?? 'LINK').toUpperCase(); // "SALON" | "FRIEND" | "LINK"
  const targetId = typeof request.body?.targetId === 'string' ? request.body.targetId.trim() : '';

  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      author: { select: { displayName: true, username: true } },
    },
  });

  if (!post) {
    response.status(404).json({ success: false, message: 'Publication introuvable.' });
    return;
  }

  // Incrémenter le compteur de partage
  const updatedPost = await prisma.post.update({
    where: { id: postId },
    data: { sharesCount: { increment: 1 } },
    select: { sharesCount: true },
  });

  // Si partage dans un salon
  if (type === 'SALON' && targetId) {
    const membership = await prisma.salonMember.findFirst({
      where: { salonId: targetId, userId: request.userId!, status: 'ACTIVE' },
    });

    if (!membership) {
      response.status(403).json({ success: false, message: 'Vous n’êtes pas membre de ce salon.' });
      return;
    }

    const snippet = post.content ? ` « ${post.content.slice(0, 120)}${post.content.length > 120 ? '…' : ''} »` : '';
    await prisma.message.create({
      data: {
        salonId: targetId,
        authorId: request.userId!,
        content: `📢 [Publication partagée de @${post.author.username}]${snippet}\nConsulter la publication : #post:${post.id}`,
      },
    });
  }

  // Si partage à un ami en message direct
  if (type === 'FRIEND' && targetId) {
    // Vérifier si un salon direct existe entre les deux ou le créer
    const existingDirect = await prisma.salon.findFirst({
      where: {
        type: 'CHAT',
        isDiscoverable: false,
        AND: [
          { members: { some: { userId: request.userId!, status: 'ACTIVE' } } },
          { members: { some: { userId: targetId, status: 'ACTIVE' } } },
        ],
      },
    });

    let directSalonId = existingDirect?.id;
    if (!directSalonId) {
      const friend = await prisma.user.findUnique({ where: { id: targetId }, select: { displayName: true } });
      const newDirectSalon = await prisma.salon.create({
        data: {
          name: `Discussion privée`,
          type: 'CHAT',
          isDiscoverable: false,
          creatorId: request.userId!,
          members: {
            create: [
              { userId: request.userId!, role: 'ADMIN', status: 'ACTIVE' },
              { userId: targetId, role: 'MEMBER', status: 'ACTIVE' },
            ],
          },
        },
      });
      directSalonId = newDirectSalon.id;
    }

    const snippet = post.content ? ` « ${post.content.slice(0, 120)}${post.content.length > 120 ? '…' : ''} »` : '';
    await prisma.message.create({
      data: {
        salonId: directSalonId,
        authorId: request.userId!,
        content: `📢 [Publication partagée de @${post.author.username}]${snippet}\nConsulter la publication : #post:${post.id}`,
      },
    });
  }

  response.json({
    success: true,
    message: 'Publication partagée.',
    data: {
      sharesCount: updatedPost.sharesCount,
    },
  });
}));
