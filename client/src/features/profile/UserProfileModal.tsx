import { useEffect, useState } from 'react';
import {
  Calendar,
  Check,
  Heart,
  MessageCircle,
  MessageSquare,
  Share2,
  UserCheck,
  UserPlus,
  Users,
  Video,
  X,
} from 'lucide-react';
import { useNavigation } from '../../lib/NavigationContext';
import { apiRequest } from '../../lib/api';

type UserProfileData = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: string;
  friendsCount: number;
  postsCount: number;
  isMe: boolean;
  friendshipStatus: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'BLOCKED' | null;
  friendshipId: string | null;
  friendshipDirection: 'sent' | 'received' | null;
};

type FriendItem = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  friendshipSince: string;
};

type PostItem = {
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
  author: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  comments: Array<{
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
  }>;
};

export function UserProfileModal() {
  const { activeProfileUserId, closeUserProfile, openUserProfile, navigateTo } = useNavigation();

  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [activeTab, setActiveTab] = useState<'posts' | 'friends'>('posts');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!activeProfileUserId) {
      setProfile(null);
      setFriends([]);
      setPosts([]);
      setActiveTab('posts');
      return;
    }

    setLoading(true);
    setNotice(null);

    Promise.all([
      apiRequest<{ success: boolean; data: UserProfileData }>(`/users/profile/${activeProfileUserId}`),
      apiRequest<{ success: boolean; data: FriendItem[] }>(`/users/profile/${activeProfileUserId}/friends`),
      apiRequest<{ success: boolean; data: PostItem[] }>(`/posts/user/${activeProfileUserId}`),
    ])
      .then(([profileRes, friendsRes, postsRes]) => {
        setProfile(profileRes.data);
        setFriends(friendsRes.data);
        setPosts(postsRes.data);
      })
      .catch((err) => {
        setNotice(err instanceof Error ? err.message : 'Impossible de charger le profil.');
      })
      .finally(() => setLoading(false));
  }, [activeProfileUserId]);

  if (!activeProfileUserId) return null;

  const handleSendFriendRequest = async () => {
    if (!profile) return;
    try {
      setActionLoading(true);
      await apiRequest('/users/friends/request', {
        method: 'POST',
        body: JSON.stringify({ addresseeId: profile.id }),
      });
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              friendshipStatus: 'PENDING',
              friendshipDirection: 'sent',
            }
          : prev
      );
      setNotice('Demande d’ami envoyée.');
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Erreur.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptFriendRequest = async () => {
    if (!profile || !profile.friendshipId) return;
    try {
      setActionLoading(true);
      await apiRequest(`/users/friends/${profile.friendshipId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'ACCEPTED' }),
      });
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              friendshipStatus: 'ACCEPTED',
              friendsCount: prev.friendsCount + 1,
            }
          : prev
      );
      setNotice('Demande acceptée !');
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Erreur.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveFriend = async () => {
    if (!profile || !profile.friendshipId) return;
    if (!confirm('Voulez-vous retirer cette personne de vos amis ?')) return;

    try {
      setActionLoading(true);
      await apiRequest(`/users/friends/${profile.friendshipId}`, { method: 'DELETE' });
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              friendshipStatus: null,
              friendshipId: null,
              friendshipDirection: null,
              friendsCount: Math.max(0, prev.friendsCount - 1),
            }
          : prev
      );
      setNotice('Ami retiré.');
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Erreur.');
    } finally {
      setActionLoading(false);
    }
  };

  const startDirectMessage = async () => {
    if (!profile) return;
    try {
      const res = await apiRequest<{ success: boolean; data: { id: string } }>('/salons/direct', {
        method: 'POST',
        body: JSON.stringify({ recipientId: profile.id }),
      });
      closeUserProfile();
      navigateTo('discussions', res.data.id);
    } catch {
      closeUserProfile();
      navigateTo('discussions');
    }
  };

  const handleLikePost = async (postId: string) => {
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
      // silent
    }
  };

  const initial = profile?.displayName ? profile.displayName.slice(0, 2).toUpperCase() : 'B';
  const joinDate = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div
        className="relative flex flex-col w-full max-w-2xl max-h-[90vh] rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Cover / Banner */}
        <div className="relative h-28 sm:h-36 w-full bg-gradient-to-r from-[#18342a] via-[#1f5943] to-[#2d7a5b] shrink-0">
          <button
            type="button"
            onClick={closeUserProfile}
            className="absolute top-3.5 right-3.5 flex h-9 w-9 items-center justify-center rounded-full bg-black/30 text-white hover:bg-black/50 transition cursor-pointer z-10"
            title="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Profile Card Info */}
        <div className="px-6 pb-4 border-b border-slate-100 bg-white shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 sm:-mt-14 mb-4">
            <div className="relative flex items-end gap-3.5">
              {profile?.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.displayName}
                  className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl object-cover ring-4 ring-white shadow-md bg-white shrink-0"
                />
              ) : (
                <div className="flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-2xl bg-[#1f5943] text-white font-extrabold text-2xl ring-4 ring-white shadow-md shrink-0">
                  {initial}
                </div>
              )}

              <div className="min-w-0 pb-1">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 truncate">
                  {profile?.displayName}
                </h2>
                <p className="text-xs font-semibold text-emerald-800 truncate">
                  @{profile?.username}
                </p>
                {joinDate && (
                  <span className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                    <Calendar size={12} /> Membre depuis {joinDate}
                  </span>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              {!profile?.isMe && (
                <>
                  <button
                    type="button"
                    onClick={startDirectMessage}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-2xs cursor-pointer"
                  >
                    <MessageCircle size={15} className="text-emerald-700" />
                    <span>Discuter</span>
                  </button>

                  {profile?.friendshipStatus === 'ACCEPTED' ? (
                    <button
                      type="button"
                      onClick={handleRemoveFriend}
                      disabled={actionLoading}
                      className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-red-50 hover:text-red-600 transition cursor-pointer"
                      title="Retirer de mes amis"
                    >
                      <UserCheck size={14} className="text-emerald-700" />
                      <span>Amis</span>
                    </button>
                  ) : profile?.friendshipStatus === 'PENDING' && profile?.friendshipDirection === 'received' ? (
                    <button
                      type="button"
                      onClick={handleAcceptFriendRequest}
                      disabled={actionLoading}
                      className="flex items-center gap-1.5 rounded-xl bg-[#1f5943] px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#184634] transition cursor-pointer"
                    >
                      <Check size={14} />
                      <span>Accepter</span>
                    </button>
                  ) : profile?.friendshipStatus === 'PENDING' ? (
                    <span className="rounded-xl bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-800 border border-amber-200">
                      Demande envoyée
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendFriendRequest}
                      disabled={actionLoading}
                      className="flex items-center gap-1.5 rounded-xl bg-[#1f5943] px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#184634] transition cursor-pointer"
                    >
                      <UserPlus size={14} />
                      <span>Ajouter en ami</span>
                    </button>
                  )}
                </>
              )}

              {profile?.isMe && (
                <button
                  type="button"
                  onClick={() => {
                    closeUserProfile();
                    navigateTo('profil');
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Modifier mon profil
                </button>
              )}
            </div>
          </div>

          {/* User Bio / Description */}
          {profile?.bio ? (
            <div className="mt-2 text-xs sm:text-sm text-slate-600 bg-slate-50 rounded-2xl p-3.5 border border-slate-100/80 leading-relaxed whitespace-pre-wrap">
              {profile.bio}
            </div>
          ) : (
            <p className="mt-1 text-xs text-slate-400 italic">
              Aucune description pour le moment.
            </p>
          )}

          {notice && (
            <div className="mt-2.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs px-3 py-1.5 border border-emerald-200">
              {notice}
            </div>
          )}

          {/* Stats Bar & Tab Selectors */}
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
            <div className="flex items-center gap-6">
              <button
                type="button"
                onClick={() => setActiveTab('posts')}
                className={`flex items-center gap-2 text-xs font-bold transition cursor-pointer pb-1 border-b-2 ${
                  activeTab === 'posts'
                    ? 'border-emerald-700 text-emerald-800'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>Publications</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                  {profile?.postsCount ?? posts.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('friends')}
                className={`flex items-center gap-2 text-xs font-bold transition cursor-pointer pb-1 border-b-2 ${
                  activeTab === 'friends'
                    ? 'border-emerald-700 text-emerald-800'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Users size={14} />
                <span>Amis</span>
                <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[11px] font-bold">
                  {profile?.friendsCount ?? friends.length}
                </span>
              </button>
            </div>

            <span className="text-[11px] text-slate-400">
              {activeTab === 'posts' ? `${posts.length} publication(s)` : `${friends.length} ami(s)`}
            </span>
          </div>
        </div>

        {/* Tab Content Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#f7f9f6] space-y-4 custom-scrollbar">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
              Chargement des informations…
            </div>
          ) : activeTab === 'posts' ? (
            posts.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200/80 p-8">
                <MessageSquare size={28} className="mx-auto text-slate-300 mb-2" />
                <p className="font-semibold text-slate-600">Aucune publication pour l'instant</p>
                <p className="mt-1 text-[11px]">Cet utilisateur n'a pas encore partagé d'actualité.</p>
              </div>
            ) : (
              posts.map((post) => (
                <div
                  key={post.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-medium text-slate-500">
                      {new Date(post.createdAt).toLocaleString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {post.mediaType && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                        {post.mediaType === 'VIDEO' ? <Video size={11} /> : '📷'} {post.mediaType}
                      </span>
                    )}
                  </div>

                  {post.content && (
                    <p className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                      {post.content}
                    </p>
                  )}

                  {/* Media Rendering */}
                  {post.mediaUrl && post.mediaType === 'IMAGE' && (
                    <div className="rounded-xl overflow-hidden bg-slate-900/5 max-h-96">
                      <img
                        src={post.mediaUrl}
                        alt="Média"
                        className="w-full h-auto max-h-96 object-cover rounded-xl"
                      />
                    </div>
                  )}

                  {post.mediaUrl && post.mediaType === 'VIDEO' && (
                    <div className="rounded-xl overflow-hidden bg-black max-h-96">
                      <video
                        src={post.mediaUrl}
                        controls
                        playsInline
                        className="w-full max-h-96 rounded-xl"
                      />
                    </div>
                  )}

                  {/* Post Footer Actions */}
                  <div className="flex items-center gap-4 pt-2 border-t border-slate-100 text-xs text-slate-500">
                    <button
                      type="button"
                      onClick={() => handleLikePost(post.id)}
                      className={`flex items-center gap-1.5 font-bold transition cursor-pointer ${
                        post.isLikedByMe ? 'text-rose-600' : 'hover:text-rose-600'
                      }`}
                    >
                      <Heart size={15} className={post.isLikedByMe ? 'fill-current' : ''} />
                      <span>{post.likesCount}</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <MessageCircle size={15} />
                      <span>{post.commentsCount}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Share2 size={15} />
                      <span>{post.sharesCount}</span>
                    </div>
                  </div>
                </div>
              ))
            )
          ) : (
            /* Friends List Tab */
            friends.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200/80 p-8">
                <Users size={28} className="mx-auto text-slate-300 mb-2" />
                <p className="font-semibold text-slate-600">Aucun ami pour le moment</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {friends.map((friend) => {
                  const fInitial = friend.displayName.slice(0, 1).toUpperCase();
                  return (
                    <div
                      key={friend.id}
                      onClick={() => openUserProfile(friend.id)}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5 hover:border-emerald-300 hover:shadow-xs transition cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {friend.avatarUrl ? (
                          <img
                            src={friend.avatarUrl}
                            alt=""
                            className="h-10 w-10 shrink-0 rounded-xl object-cover shadow-2xs"
                          />
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1f5943] text-white font-bold text-xs shadow-2xs">
                            {fInitial}
                          </div>
                        )}
                        <div className="min-w-0">
                          <strong className="block text-xs font-bold text-slate-800 truncate">
                            {friend.displayName}
                          </strong>
                          <span className="block text-[11px] text-slate-400 truncate">
                            @{friend.username}
                          </span>
                        </div>
                      </div>

                      <span className="text-[10px] font-bold text-emerald-800 rounded-md bg-emerald-50 px-2 py-0.5 shrink-0">
                        Voir
                      </span>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
