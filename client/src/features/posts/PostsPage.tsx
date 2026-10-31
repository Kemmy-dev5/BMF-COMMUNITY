import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  Flame,
  Heart,
  Image as ImageIcon,
  Loader2,
  MessageCircle,
  PlusCircle,
  Send,
  Share2,
  Trash2,
  Video as VideoIcon,
  X,
} from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { useNavigation } from '../../lib/NavigationContext';
import { apiRequest } from '../../lib/api';

type PostAuthor = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
};

type PostComment = {
  id: string;
  authorId: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
};

type Post = {
  id: string;
  authorId: string;
  content: string;
  mediaType: 'IMAGE' | 'VIDEO' | null;
  mediaUrl: string | null;
  sharesCount: number;
  createdAt: string;
  likesCount: number;
  commentsCount: number;
  isLikedByMe: boolean;
  author: PostAuthor;
  comments: PostComment[];
};

type SalonOption = {
  id: string;
  name: string;
};

type FriendOption = {
  id: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
  };
};

export function PostsPage() {
  const { user } = useAuth();
  const { openUserProfile } = useNavigation();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form state
  const [content, setContent] = useState('');
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'IMAGE' | 'VIDEO' | null>(null);
  const [uploadProgress, setUploadProgress] = useState(false);

  // Expanded comments by post ID
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [submittingComment, setSubmittingComment] = useState<Record<string, boolean>>({});

  // Share modal state
  const [sharePost, setSharePost] = useState<Post | null>(null);
  const [userSalons, setUserSalons] = useState<SalonOption[]>([]);
  const [userFriends, setUserFriends] = useState<FriendOption[]>([]);
  const [selectedSalonId, setSelectedSalonId] = useState('');
  const [selectedFriendId, setSelectedFriendId] = useState('');
  const [sharingLoading, setSharingLoading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadPosts = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await apiRequest<{ success: boolean; data: { posts: Post[] } }>('/posts?limit=30');
      setPosts(res.data.posts);
    } catch (err) {
      if (!silent) {
        setNotice({
          type: 'error',
          message: err instanceof Error ? err.message : 'Impossible de charger les publications.',
        });
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    void loadPosts(false);
    const interval = window.setInterval(() => {
      void loadPosts(true);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  // Pre-load salons and friends for share modal
  useEffect(() => {
    apiRequest<{ success: boolean; data: SalonOption[] }>('/salons')
      .then((res) => {
        setUserSalons(res.data);
        if (res.data.length > 0) setSelectedSalonId(res.data[0].id);
      })
      .catch(() => {});

    apiRequest<{ success: boolean; data: Array<{ status: string; user: FriendOption['user'] }> }>('/users/friends')
      .then((res) => {
        const accepted = res.data
          .filter((f) => f.status === 'ACCEPTED')
          .map((f) => ({ id: f.user.id, user: f.user }));
        setUserFriends(accepted);
        if (accepted.length > 0) setSelectedFriendId(accepted[0].user.id);
      })
      .catch(() => {});
  }, []);

  const handleMediaSelect = (e: ChangeEvent<HTMLInputElement>, chosenType: 'IMAGE' | 'VIDEO') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (chosenType === 'IMAGE' && !file.type.startsWith('image/')) {
      setNotice({ type: 'error', message: 'Veuillez sélectionner un fichier image valide.' });
      return;
    }

    if (chosenType === 'VIDEO' && !file.type.startsWith('video/')) {
      setNotice({ type: 'error', message: 'Veuillez sélectionner un fichier vidéo valide.' });
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setNotice({ type: 'error', message: 'Le fichier dépasse la limite maximale de 50 Mo.' });
      return;
    }

    setMediaType(chosenType);

    const reader = new FileReader();
    reader.onload = () => {
      setMediaPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeMedia = () => {
    setMediaPreview(null);
    setMediaType(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCreatePost = async (e: FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !mediaPreview) {
      setNotice({ type: 'error', message: 'Veuillez rédiger un message ou joindre un média.' });
      return;
    }

    try {
      setSubmitting(true);
      setNotice(null);

      let mediaUrl: string | null = null;
      if (mediaPreview && mediaType) {
        setUploadProgress(true);
        const uploadRes = await apiRequest<{ success: boolean; data: { url: string } }>('/upload', {
          method: 'POST',
          body: JSON.stringify({
            data: mediaPreview,
            type: mediaType === 'VIDEO' ? 'video' : 'image',
          }),
        });
        mediaUrl = uploadRes.data.url;
      }

      const postRes = await apiRequest<{ success: boolean; data: Post; message: string }>('/posts', {
        method: 'POST',
        body: JSON.stringify({
          content: content.trim(),
          mediaType: mediaType ?? undefined,
          mediaUrl: mediaUrl ?? undefined,
        }),
      });

      setPosts((prev) => [postRes.data, ...prev]);
      setContent('');
      removeMedia();
      setNotice({ type: 'success', message: 'Votre publication est en ligne !' });
    } catch (err) {
      setNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'Échec de la publication.',
      });
    } finally {
      setSubmitting(false);
      setUploadProgress(false);
    }
  };

  const handleLike = async (postId: string) => {
    // Optimistic update
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const newIsLiked = !p.isLikedByMe;
        return {
          ...p,
          isLikedByMe: newIsLiked,
          likesCount: newIsLiked ? p.likesCount + 1 : Math.max(0, p.likesCount - 1),
        };
      })
    );

    try {
      const res = await apiRequest<{ success: boolean; data: { isLiked: boolean; likesCount: number } }>(
        `/posts/${postId}/like`,
        { method: 'POST' }
      );
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, isLikedByMe: res.data.isLiked, likesCount: res.data.likesCount }
            : p
        )
      );
    } catch {
      // Revert on error
      void loadPosts(true);
    }
  };

  const toggleComments = (postId: string) => {
    setExpandedComments((prev) => ({ ...prev, [postId]: !prev[postId] }));
  };

  const handleAddComment = async (postId: string, e: FormEvent) => {
    e.preventDefault();
    const text = commentInputs[postId]?.trim();
    if (!text) return;

    try {
      setSubmittingComment((prev) => ({ ...prev, [postId]: true }));
      const res = await apiRequest<{ success: boolean; data: PostComment }>(`/posts/${postId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content: text }),
      });

      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                commentsCount: p.commentsCount + 1,
                comments: [...p.comments, res.data],
              }
            : p
        )
      );
      setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur lors de l’ajout du commentaire.');
    } finally {
      setSubmittingComment((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const handleDeleteComment = async (postId: string, commentId: string) => {
    if (!confirm('Supprimer ce commentaire ?')) return;

    try {
      await apiRequest(`/posts/comments/${commentId}`, { method: 'DELETE' });
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                commentsCount: Math.max(0, p.commentsCount - 1),
                comments: p.comments.filter((c) => c.id !== commentId),
              }
            : p
        )
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Impossible de supprimer.');
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Voulez-vous vraiment supprimer cette publication ?')) return;

    try {
      await apiRequest(`/posts/${postId}`, { method: 'DELETE' });
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      setNotice({ type: 'success', message: 'Publication supprimée avec succès.' });
    } catch (err) {
      setNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'Impossible de supprimer la publication.',
      });
    }
  };

  const handleShareToSalon = async () => {
    if (!sharePost || !selectedSalonId) return;
    try {
      setSharingLoading(true);
      await apiRequest(`/posts/${sharePost.id}/share`, {
        method: 'POST',
        body: JSON.stringify({ type: 'SALON', targetId: selectedSalonId }),
      });
      setPosts((prev) =>
        prev.map((p) => (p.id === sharePost.id ? { ...p, sharesCount: p.sharesCount + 1 } : p))
      );
      setNotice({ type: 'success', message: 'Publication partagée dans le salon avec succès !' });
      setSharePost(null);
    } catch (err) {
      setNotice({ type: 'error', message: err instanceof Error ? err.message : 'Erreur de partage.' });
    } finally {
      setSharingLoading(false);
    }
  };

  const handleShareToFriend = async () => {
    if (!sharePost || !selectedFriendId) return;
    try {
      setSharingLoading(true);
      await apiRequest(`/posts/${sharePost.id}/share`, {
        method: 'POST',
        body: JSON.stringify({ type: 'FRIEND', targetId: selectedFriendId }),
      });
      setPosts((prev) =>
        prev.map((p) => (p.id === sharePost.id ? { ...p, sharesCount: p.sharesCount + 1 } : p))
      );
      setNotice({ type: 'success', message: 'Publication envoyée en message direct à votre ami !' });
      setSharePost(null);
    } catch (err) {
      setNotice({ type: 'error', message: err instanceof Error ? err.message : 'Erreur de partage.' });
    } finally {
      setSharingLoading(false);
    }
  };

  const handleCopyLink = (postId: string) => {
    const postUrl = `${window.location.origin}/#post-${postId}`;
    navigator.clipboard.writeText(postUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);

    // Incrémenter le partage côté serveur
    apiRequest(`/posts/${postId}/share`, {
      method: 'POST',
      body: JSON.stringify({ type: 'LINK' }),
    }).catch(() => {});

    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, sharesCount: p.sharesCount + 1 } : p))
    );
  };

  const userInitial = user?.displayName ? user.displayName.slice(0, 1).toUpperCase() : 'B';

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn pb-12">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
              Fil d'actualité & Réseau
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
              <Flame size={12} className="text-amber-600 animate-pulse" /> En direct
            </span>
          </div>
          <h1 className="text-xl font-black text-slate-900 mt-0.5">Publications de la Communauté</h1>
        </div>

        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex items-center gap-1.5 rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer self-start sm:self-auto"
        >
          <PlusCircle size={15} className="text-emerald-700" />
          <span>Créer un post</span>
        </button>
      </div>

      {notice && (
        <div
          className={`flex items-center gap-2.5 rounded-2xl p-4 text-xs sm:text-sm shadow-xs ${
            notice.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {notice.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span className="font-medium">{notice.message}</span>
        </div>
      )}

      {/* Post Creation Box */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:shadow-sm">
        <form onSubmit={handleCreatePost} className="space-y-4">
          <div className="flex items-start gap-3.5">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt=""
                className="h-10 w-10 shrink-0 rounded-xl object-cover shadow-2xs"
              />
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1f5943] text-white font-black text-sm shadow-2xs">
                {userInitial}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <textarea
                rows={3}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Exprimez-vous… Partagez une réflexion, une photo, une vidéo ou une annonce solidaire."
                className="w-full resize-none rounded-xl border border-slate-100 bg-[#fbfdfa] p-3 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 transition"
              />
            </div>
          </div>

          {/* Media preview */}
          {mediaPreview && (
            <div className="relative rounded-2xl overflow-hidden bg-slate-900/5 p-2 border border-slate-200/80">
              <button
                type="button"
                onClick={removeMedia}
                className="absolute top-4 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-slate-900/70 text-white hover:bg-slate-900 transition cursor-pointer"
                title="Retirer ce média"
              >
                <X size={16} />
              </button>

              {mediaType === 'IMAGE' ? (
                <img
                  src={mediaPreview}
                  alt="Aperçu"
                  className="max-h-80 w-full object-contain rounded-xl mx-auto"
                />
              ) : (
                <video
                  src={mediaPreview}
                  controls
                  playsInline
                  className="max-h-80 w-full rounded-xl mx-auto"
                />
              )}
            </div>
          )}

          {/* Hidden File Inputs */}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => handleMediaSelect(e, mediaType === 'VIDEO' ? 'VIDEO' : 'IMAGE')}
          />

          {/* Bottom Bar: Action buttons & Submit */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setMediaType('IMAGE');
                  if (fileInputRef.current) {
                    fileInputRef.current.accept = 'image/*';
                    fileInputRef.current.click();
                  }
                }}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 transition cursor-pointer"
              >
                <ImageIcon size={15} className="text-emerald-700" />
                <span>Photo</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMediaType('VIDEO');
                  if (fileInputRef.current) {
                    fileInputRef.current.accept = 'video/*';
                    fileInputRef.current.click();
                  }
                }}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 transition cursor-pointer"
              >
                <VideoIcon size={15} className="text-blue-600" />
                <span>Vidéo</span>
              </button>
            </div>

            <button
              type="submit"
              disabled={submitting || (!content.trim() && !mediaPreview)}
              className="flex items-center gap-2 rounded-xl bg-[#1f5943] px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#184634] transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>{uploadProgress ? 'Téléversement…' : 'Publication…'}</span>
                </>
              ) : (
                <>
                  <Send size={14} />
                  <span>Publier</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Posts Stream / Feed */}
      <div className="space-y-5">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
            <Loader2 size={24} className="mx-auto text-emerald-700 animate-spin mb-2" />
            Chargement des publications…
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
            <Flame size={36} className="mx-auto text-slate-300 mb-3" />
            <h3 className="text-base font-bold text-slate-800">Aucune publication pour le moment</h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
              Soyez le tout premier à publier une actualité, une photo ou une vidéo avec la communauté BMF !
            </p>
          </div>
        ) : (
          posts.map((post) => {
            const authorInitial = post.author.displayName.slice(0, 1).toUpperCase();
            const isMyPost = post.authorId === user?.id;
            const commentsOpen = expandedComments[post.id] ?? false;

            return (
              <article
                key={post.id}
                id={`post-${post.id}`}
                className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition hover:border-slate-300 space-y-4"
              >
                {/* Post Header: Author & Options */}
                <div className="flex items-center justify-between">
                  <div
                    onClick={() => openUserProfile(post.author.id)}
                    className="flex items-center gap-3 cursor-pointer group"
                    title="Voir le profil"
                  >
                    {post.author.avatarUrl ? (
                      <img
                        src={post.author.avatarUrl}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded-xl object-cover shadow-2xs group-hover:ring-2 group-hover:ring-emerald-500 transition"
                      />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1f5943] text-white font-bold text-sm shadow-2xs group-hover:scale-105 transition-transform">
                        {authorInitial}
                      </div>
                    )}

                    <div>
                      <strong className="block text-xs sm:text-sm font-bold text-slate-900 group-hover:text-emerald-800 transition">
                        {post.author.displayName}
                      </strong>
                      <span className="block text-[11px] text-slate-400">
                        @{post.author.username} ·{' '}
                        {new Date(post.createdAt).toLocaleString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Actions / Delete */}
                  {isMyPost && (
                    <button
                      type="button"
                      onClick={() => void handleDeletePost(post.id)}
                      className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 transition cursor-pointer"
                      title="Supprimer ma publication"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                {/* Post Content */}
                {post.content && (
                  <p className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                    {post.content}
                  </p>
                )}

                {/* Media Attachment */}
                {post.mediaUrl && post.mediaType === 'IMAGE' && (
                  <div className="rounded-2xl overflow-hidden bg-slate-900/5 max-h-[500px]">
                    <img
                      src={post.mediaUrl}
                      alt="Publication"
                      className="w-full h-auto max-h-[500px] object-cover rounded-2xl"
                    />
                  </div>
                )}

                {post.mediaUrl && post.mediaType === 'VIDEO' && (
                  <div className="rounded-2xl overflow-hidden bg-black max-h-[500px]">
                    <video
                      src={post.mediaUrl}
                      controls
                      playsInline
                      className="w-full max-h-[500px] rounded-2xl"
                    />
                  </div>
                )}

                {/* Interactions Bar */}
                <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-1 sm:gap-3">
                    {/* Like button */}
                    <button
                      type="button"
                      onClick={() => void handleLike(post.id)}
                      className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                        post.isLikedByMe
                          ? 'bg-rose-50 text-rose-600'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-rose-600'
                      }`}
                    >
                      <Heart
                        size={17}
                        className={post.isLikedByMe ? 'fill-current text-rose-600' : ''}
                      />
                      <span>{post.likesCount}</span>
                    </button>

                    {/* Comment button */}
                    <button
                      type="button"
                      onClick={() => toggleComments(post.id)}
                      className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                        commentsOpen
                          ? 'bg-emerald-50 text-emerald-800'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <MessageCircle size={17} />
                      <span>{post.commentsCount}</span>
                    </button>

                    {/* Share button */}
                    <button
                      type="button"
                      onClick={() => setSharePost(post)}
                      className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition cursor-pointer"
                      title="Partager cette publication"
                    >
                      <Share2 size={16} />
                      <span className="hidden sm:inline">Partager</span>
                      {post.sharesCount > 0 && (
                        <span className="text-[11px] text-slate-400">({post.sharesCount})</span>
                      )}
                    </button>
                  </div>

                  {/* Copy Link quick action */}
                  <button
                    type="button"
                    onClick={() => handleCopyLink(post.id)}
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-emerald-700 transition cursor-pointer"
                    title="Copier le lien"
                  >
                    <Copy size={13} />
                    <span>Lien</span>
                  </button>
                </div>

                {/* Collapsible Comments Section */}
                {commentsOpen && (
                  <div className="pt-3 border-t border-slate-100 space-y-3 animate-fadeIn">
                    {/* Add comment field */}
                    <form
                      onSubmit={(e) => handleAddComment(post.id, e)}
                      className="flex items-center gap-2"
                    >
                      <input
                        type="text"
                        maxLength={1000}
                        placeholder="Écrivez un commentaire…"
                        value={commentInputs[post.id] ?? ''}
                        onChange={(e) =>
                          setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))
                        }
                        className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-800 focus:border-emerald-600 focus:bg-white focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={submittingComment[post.id] || !commentInputs[post.id]?.trim()}
                        className="rounded-xl bg-[#1f5943] px-3.5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-[#184634] transition disabled:opacity-40 cursor-pointer"
                      >
                        <Send size={13} />
                      </button>
                    </form>

                    {/* Comments list */}
                    {post.comments.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic py-2">
                        Aucun commentaire. Soyez le premier à commenter !
                      </p>
                    ) : (
                      <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto custom-scrollbar">
                        {post.comments.map((comment) => {
                          const canDelete =
                            comment.authorId === user?.id || post.authorId === user?.id;
                          return (
                            <div
                              key={comment.id}
                              className="flex items-start justify-between gap-3 py-2.5 text-xs"
                            >
                              <div className="flex items-start gap-2.5 min-w-0">
                                {comment.author.avatarUrl ? (
                                  <img
                                    src={comment.author.avatarUrl}
                                    alt=""
                                    className="h-7 w-7 rounded-lg object-cover shrink-0 cursor-pointer"
                                    onClick={() => openUserProfile(comment.author.id)}
                                  />
                                ) : (
                                  <div
                                    onClick={() => openUserProfile(comment.author.id)}
                                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1f5943] text-white font-bold text-[10px] shrink-0 cursor-pointer"
                                  >
                                    {comment.author.displayName.slice(0, 1).toUpperCase()}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <strong
                                      onClick={() => openUserProfile(comment.author.id)}
                                      className="font-bold text-slate-900 cursor-pointer hover:underline"
                                    >
                                      {comment.author.displayName}
                                    </strong>
                                    <span className="text-[10px] text-slate-400">
                                      @{comment.author.username}
                                    </span>
                                  </div>
                                  <p className="mt-0.5 text-slate-700 leading-normal whitespace-pre-wrap">
                                    {comment.content}
                                  </p>
                                </div>
                              </div>

                              {canDelete && (
                                <button
                                  type="button"
                                  onClick={() => void handleDeleteComment(post.id, comment.id)}
                                  className="text-slate-400 hover:text-red-600 transition p-1 cursor-pointer shrink-0"
                                  title="Supprimer ce commentaire"
                                >
                                  <X size={13} />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>

      {/* Share Modal */}
      {sharePost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Share2 size={18} className="text-emerald-700" /> Partager la publication
              </h3>
              <button
                type="button"
                onClick={() => setSharePost(null)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Option 1: Partager dans un salon */}
            <div className="rounded-xl border border-slate-200 p-4 space-y-2.5">
              <strong className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                1. Partager dans un salon
              </strong>
              {userSalons.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Vous n'êtes membre d'aucun salon.</p>
              ) : (
                <div className="flex items-center gap-2">
                  <select
                    value={selectedSalonId}
                    onChange={(e) => setSelectedSalonId(e.target.value)}
                    className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none"
                  >
                    {userSalons.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleShareToSalon}
                    disabled={sharingLoading || !selectedSalonId}
                    className="rounded-xl bg-[#1f5943] px-3.5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-[#184634] transition disabled:opacity-50 cursor-pointer"
                  >
                    Publier
                  </button>
                </div>
              )}
            </div>

            {/* Option 2: Partager à un ami */}
            <div className="rounded-xl border border-slate-200 p-4 space-y-2.5">
              <strong className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                2. Partager à un ami (Message Privé)
              </strong>
              {userFriends.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Vous n'avez pas encore d'amis dans votre liste.</p>
              ) : (
                <div className="flex items-center gap-2">
                  <select
                    value={selectedFriendId}
                    onChange={(e) => setSelectedFriendId(e.target.value)}
                    className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none"
                  >
                    {userFriends.map((f) => (
                      <option key={f.user.id} value={f.user.id}>
                        {f.user.displayName} (@{f.user.username})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleShareToFriend}
                    disabled={sharingLoading || !selectedFriendId}
                    className="rounded-xl bg-slate-800 px-3.5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-slate-900 transition disabled:opacity-50 cursor-pointer"
                  >
                    Envoyer
                  </button>
                </div>
              )}
            </div>

            {/* Option 3: Copier le lien direct */}
            <div className="rounded-xl border border-slate-200 p-4 flex items-center justify-between">
              <div>
                <strong className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  3. Copier le lien
                </strong>
                <span className="text-[11px] text-slate-400">Lien direct vers la publication</span>
              </div>
              <button
                type="button"
                onClick={() => handleCopyLink(sharePost.id)}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                {copiedLink ? (
                  <>
                    <Check size={14} className="text-emerald-700" />
                    <span className="text-emerald-800">Copié !</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    <span>Copier le lien</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
