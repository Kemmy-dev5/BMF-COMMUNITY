import { useEffect, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock,
  MessageCircle,
  Search,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useNavigation } from '../../lib/NavigationContext';
import { apiRequest } from '../../lib/api';

type Friendship = {
  id: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'BLOCKED';
  direction: 'sent' | 'received';
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
  };
};

type SearchedUser = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  friendshipStatus: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'BLOCKED' | null;
  friendshipId: string | null;
  friendshipDirection: 'sent' | 'received' | null;
};

export function UserDirectoryPage() {
  const { navigateTo, openUserProfile } = useNavigation();
  const [activeTab, setActiveTab] = useState<'friends' | 'received' | 'sent' | 'search'>('friends');
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [searchResults, setSearchResults] = useState<SearchedUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadFriendships = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await apiRequest<{ success: boolean; data: Friendship[] }>('/users/friends');
      setFriendships(res.data);
    } catch (err) {
      if (!silent) {
        setNotice({
          type: 'error',
          message: err instanceof Error ? err.message : 'Impossible de charger la liste d’amis.',
        });
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    void loadFriendships(false);
    const interval = window.setInterval(() => {
      void loadFriendships(true);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Search members
  useEffect(() => {
    const searchMembers = async () => {
      try {
        setSearching(true);
        const query = searchQuery.trim() ? `?q=${encodeURIComponent(searchQuery.trim())}` : '';
        const res = await apiRequest<{ success: boolean; data: SearchedUser[] }>(`/users/search${query}`);
        setSearchResults(res.data);
      } catch (err) {
        setNotice({
          type: 'error',
          message: err instanceof Error ? err.message : 'Erreur lors de la recherche.',
        });
      } finally {
        setSearching(false);
      }
    };

    const timer = setTimeout(searchMembers, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSendRequest = async (targetUserId: string) => {
    try {
      setNotice(null);
      const res = await apiRequest<{ success: boolean; message?: string }>('/users/friends/request', {
        method: 'POST',
        body: JSON.stringify({ addresseeId: targetUserId }),
      });
      setNotice({ type: 'success', message: res.message ?? 'Demande d’ami envoyée.' });
      await loadFriendships();
      setSearchResults((prev) =>
        prev.map((u) => (u.id === targetUserId ? { ...u, friendshipStatus: 'PENDING', friendshipDirection: 'sent' } : u))
      );
    } catch (err) {
      setNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'Impossible d’envoyer la demande.',
      });
    }
  };

  const handleRespondRequest = async (friendshipId: string, status: 'ACCEPTED' | 'DECLINED') => {
    try {
      setNotice(null);
      const res = await apiRequest<{ success: boolean; message?: string }>(`/users/friends/${friendshipId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setNotice({
        type: 'success',
        message: res.message ?? (status === 'ACCEPTED' ? 'Demande acceptée !' : 'Demande refusée.'),
      });
      await loadFriendships();
    } catch (err) {
      setNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'Action impossible.',
      });
    }
  };

  const handleRemoveFriendship = async (friendshipId: string) => {
    if (!confirm('Voulez-vous vraiment effectuer cette action ?')) return;

    try {
      setNotice(null);
      const res = await apiRequest<{ success: boolean; message?: string }>(`/users/friends/${friendshipId}`, {
        method: 'DELETE',
      });
      setNotice({ type: 'success', message: res.message ?? 'Action effectuée.' });
      await loadFriendships();
      setSearchResults((prev) =>
        prev.map((u) => (u.friendshipId === friendshipId ? { ...u, friendshipStatus: null, friendshipDirection: null } : u))
      );
    } catch (err) {
      setNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'Impossible de supprimer.',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl bg-white border border-slate-200">
        <p className="text-sm text-slate-500 animate-pulse">Chargement des membres…</p>
      </div>
    );
  }

  const startDirectChat = async (recipientId: string) => {
    try {
      const res = await apiRequest<{ success: boolean; data: { id: string } }>('/salons/direct', {
        method: 'POST',
        body: JSON.stringify({ recipientId }),
      });
      navigateTo('discussions', res.data.id);
    } catch {
      navigateTo('discussions');
    }
  };

  const acceptedFriends = friendships.filter((f) => f.status === 'ACCEPTED');
  const receivedRequests = friendships.filter((f) => f.status === 'PENDING' && f.direction === 'received');
  const sentRequests = friendships.filter((f) => f.status === 'PENDING' && f.direction === 'sent');

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
              Communauté & Relations
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200/80">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> En direct
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-0.5">Membres & Amis</h1>
        </div>

        {/* Tab Switcher */}
        <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('friends')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition cursor-pointer ${
              activeTab === 'friends' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck size={14} className="text-emerald-700" />
            <span>Mes Amis ({acceptedFriends.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('received')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition cursor-pointer ${
              activeTab === 'received' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock size={14} className="text-amber-600" />
            <span>Reçues ({receivedRequests.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sent')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition cursor-pointer ${
              activeTab === 'sent' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Envoyées ({sentRequests.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('search')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition cursor-pointer ${
              activeTab === 'search' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Search size={14} className="text-blue-600" />
            <span>Recherche</span>
          </button>
        </div>
      </div>

      {notice && (
        <div
          className={`flex items-center gap-2 rounded-xl p-3 text-xs sm:text-sm ${
            notice.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {notice.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{notice.message}</span>
        </div>
      )}

      {/* Content for: Mes Amis */}
      {activeTab === 'friends' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 className="text-sm font-bold text-slate-800">Votre cercle d'amis</h2>
            <span className="text-xs text-slate-500">{acceptedFriends.length} ami(s) connecté(s)</span>
          </div>

          {acceptedFriends.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              <Users size={32} className="mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-slate-600">Vous n'avez pas encore d'amis ajoutés</p>
              <p className="mt-1">Passez par l'onglet « Recherche » pour trouver et ajouter des membres.</p>
            </div>
          ) : (
            <div className="grid gap-3 pt-4 sm:grid-cols-2 lg:grid-cols-3">
              {acceptedFriends.map((f) => {
                const initial = f.user.displayName.slice(0, 1).toUpperCase();
                return (
                  <div
                    key={f.id}
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 hover:bg-slate-50 transition"
                  >
                    <div
                      onClick={() => openUserProfile(f.user.id)}
                      className="flex items-center gap-3 min-w-0 cursor-pointer group"
                      title="Voir le profil complet"
                    >
                      {f.user.avatarUrl ? (
                        <img src={f.user.avatarUrl} alt="" className="h-10 w-10 shrink-0 rounded-xl object-cover shadow-2xs group-hover:scale-105 transition" />
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1f5943] font-bold text-sm text-white shadow-2xs group-hover:scale-105 transition">
                          {initial}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-800 truncate group-hover:text-emerald-800 transition">{f.user.displayName}</div>
                        <div className="text-[11px] text-slate-400 truncate">@{f.user.username}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => void startDirectChat(f.user.id)}
                        className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-emerald-700 shadow-2xs transition cursor-pointer"
                        title="Discuter en tête-à-tête"
                      >
                        <MessageCircle size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleRemoveFriendship(f.id)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 transition cursor-pointer"
                        title="Retirer de mes amis"
                      >
                        <UserMinus size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Content for: Demandes Reçues */}
      {activeTab === 'received' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-sm font-bold text-slate-800">Demandes d'ami en attente de votre réponse</h2>
          </div>

          {receivedRequests.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Aucune demande reçue pour l'instant.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 pt-2">
              {receivedRequests.map((f) => (
                <div key={f.id} className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-3">
                    {f.user.avatarUrl ? (
                      <img src={f.user.avatarUrl} alt="" className="h-10 w-10 shrink-0 rounded-xl object-cover shadow-2xs" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1f5943] font-bold text-sm text-white shadow-2xs">
                        {f.user.displayName.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="text-xs font-bold text-slate-800">{f.user.displayName}</div>
                      <div className="text-[11px] text-slate-400">@{f.user.username} souhaite devenir votre ami</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handleRespondRequest(f.id, 'ACCEPTED')}
                      className="flex items-center gap-1 rounded-xl bg-[#1f5943] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#184634] transition cursor-pointer"
                    >
                      <Check size={14} /> Accepter
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleRespondRequest(f.id, 'DECLINED')}
                      className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                    >
                      <X size={14} /> Refuser
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Content for: Demandes Envoyées */}
      {activeTab === 'sent' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-sm font-bold text-slate-800">Demandes que vous avez envoyées</h2>
          </div>

          {sentRequests.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Aucune demande envoyée en attente.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 pt-2">
              {sentRequests.map((f) => (
                <div key={f.id} className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 font-bold text-sm text-slate-700">
                      {f.user.displayName.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800">{f.user.displayName}</div>
                      <div className="text-[11px] text-slate-400">@{f.user.username} · En attente de réponse</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleRemoveFriendship(f.id)}
                    className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition cursor-pointer"
                  >
                    Annuler la demande
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Content for: Recherche / Découvrir */}
      {activeTab === 'search' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="relative mb-5">
            <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par nom d'affichage ou @pseudo…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-800 focus:border-emerald-600 focus:bg-white focus:outline-none"
            />
          </div>

          {searching ? (
            <div className="py-8 text-center text-xs text-slate-400 animate-pulse">
              Recherche en cours…
            </div>
          ) : searchResults.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Aucun membre trouvé correspondant à « {searchQuery} ».
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {searchResults.map((member) => {
                const isFriend = member.friendshipStatus === 'ACCEPTED';
                const isPending = member.friendshipStatus === 'PENDING';
                const isReceived = isPending && member.friendshipDirection === 'received';

                return (
                  <div key={member.id} className="flex items-center justify-between py-3.5">
                    <div
                      onClick={() => openUserProfile(member.id)}
                      className="flex items-center gap-3 cursor-pointer group"
                      title="Voir le profil complet"
                    >
                      {member.avatarUrl ? (
                        <img src={member.avatarUrl} alt="" className="h-10 w-10 shrink-0 rounded-xl object-cover shadow-2xs group-hover:scale-105 transition" />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1f5943] text-white font-bold text-sm shadow-2xs group-hover:scale-105 transition">
                          {member.displayName.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="text-xs font-bold text-slate-800 group-hover:text-emerald-800 transition">{member.displayName}</div>
                        <div className="text-[11px] text-slate-400">@{member.username}</div>
                      </div>
                    </div>

                    <div>
                      {isFriend ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#1f5943] px-3 py-1 text-[11px] font-bold text-white shadow-2xs">
                          ✓ Déjà ami
                        </span>
                      ) : isReceived ? (
                        <button
                          type="button"
                          onClick={() => member.friendshipId && void handleRespondRequest(member.friendshipId, 'ACCEPTED')}
                          className="rounded-xl bg-[#1f5943] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#184634] transition cursor-pointer"
                        >
                          Accepter la demande
                        </button>
                      ) : isPending ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-[11px] font-bold text-amber-800">
                          Demande envoyée
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void handleSendRequest(member.id)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-[#1f5943] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#184634] transition cursor-pointer"
                        >
                          <UserPlus size={14} /> Ajouter en ami
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
