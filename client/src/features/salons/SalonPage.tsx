import { FormEvent, useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Filter,
  HandCoins,
  LogOut,
  MessageCircle,
  PlusCircle,
  Search,
  Shield,
  Trash2,
  UserMinus,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { useNavigation } from '../../lib/NavigationContext';
import { apiRequest } from '../../lib/api';

type Salon = {
  id: string;
  name: string;
  description: string;
  rules: string;
  type: 'CHAT' | 'CONTRIBUTION';
  currency: string;
  successThreshold: string | null;
  creatorId?: string;
  isCreator?: boolean;
  members: Array<{ id: string; username: string; displayName: string }>;
  currentUserIsMember: boolean;
  currentUserStatus: 'ACTIVE' | 'PENDING' | 'REMOVED' | null;
  currentUserRole: 'ADMIN' | 'MEMBER' | null;
  pendingRequestsCount?: number;
};

type PendingMember = {
  membershipId: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  requestedAt: string;
};

export function SalonPage() {
  const { user } = useAuth();
  const { navigateTo } = useNavigation();
  const [salons, setSalons] = useState<Salon[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'CHAT' | 'CONTRIBUTION'>('ALL');
  const [membershipFilter, setMembershipFilter] = useState<'ALL' | 'JOINED'>('ALL');

  const [form, setForm] = useState({
    name: '',
    description: '',
    rules: '',
    type: 'CHAT' as Salon['type'],
    successThreshold: '500',
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Admin Manage Modal
  const [managingSalon, setManagingSalon] = useState<Salon | null>(null);
  const [manageTab, setManageTab] = useState<'pending' | 'members'>('pending');
  const [pendingRequests, setPendingRequests] = useState<PendingMember[]>([]);
  const [loadingManage, setLoadingManage] = useState(false);

  const loadSalons = async () => {
    try {
      setLoading(true);
      const query = search ? `?q=${encodeURIComponent(search)}` : '';
      const res = await apiRequest<{ success: boolean; data: Salon[] }>(`/salons${query}`);
      setSalons(res.data);
    } catch (err) {
      setNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'Impossible de charger les salons.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(loadSalons, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const handleCreateSalon = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setNotice({ type: 'error', message: 'Le nom du salon est obligatoire.' });
      return;
    }

    try {
      setSaving(true);
      setNotice(null);
      const res = await apiRequest<{ success: boolean; message?: string; data?: Salon }>('/salons', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || 'Espace communautaire BMF.',
          rules: form.rules.trim() || 'Respect et entraide.',
          type: form.type,
          successThreshold: Number(form.successThreshold),
        }),
      });

      if (res.data) {
        setSalons((prev) => [res.data!, ...prev]);
      }
      setForm({ name: '', description: '', rules: '', type: 'CHAT', successThreshold: '500' });
      setShowCreateModal(false);
      setNotice({ type: 'success', message: res.message ?? 'Salon créé avec succès.' });
    } catch (err) {
      setNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'Impossible de créer le salon.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleJoinSalon = async (salon: Salon) => {
    try {
      setNotice(null);
      const res = await apiRequest<{ success: boolean; message?: string }>(`/salons/${salon.id}/join`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      setSalons((prev) =>
        prev.map((s) =>
          s.id === salon.id
            ? {
                ...s,
                currentUserStatus: 'PENDING',
                currentUserIsMember: false,
              }
            : s
        )
      );
      setNotice({
        type: 'success',
        message: res.message ?? 'Demande d’adhésion envoyée. En attente de confirmation par un administrateur du salon.',
      });
    } catch (err) {
      setNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'Impossible de rejoindre ce salon.',
      });
    }
  };

  const handleLeaveSalon = async (salonId: string) => {
    if (!confirm('Voulez-vous vraiment quitter ce salon ?')) return;

    try {
      setNotice(null);
      const res = await apiRequest<{ success: boolean; message?: string }>(`/salons/${salonId}/leave`, {
        method: 'POST',
      });
      setSalons((prev) =>
        prev.map((s) =>
          s.id === salonId
            ? {
                ...s,
                currentUserIsMember: false,
                currentUserStatus: null,
                currentUserRole: null,
                members: s.members.filter((m) => m.id !== user?.id),
              }
            : s
        )
      );
      setNotice({ type: 'success', message: res.message ?? 'Vous avez quitté le salon.' });
    } catch (err) {
      setNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'Impossible de quitter le salon.',
      });
    }
  };

  const handleDeleteSalon = async (salonId: string) => {
    if (!confirm('Attention : cette action supprimera définitivement le salon et son contenu ! Continuer ?')) return;

    try {
      setNotice(null);
      const res = await apiRequest<{ success: boolean; message?: string }>(`/salons/${salonId}`, {
        method: 'DELETE',
      });
      setSalons((prev) => prev.filter((s) => s.id !== salonId));
      setNotice({ type: 'success', message: res.message ?? 'Salon supprimé.' });
    } catch (err) {
      setNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'Échec de la suppression du salon.',
      });
    }
  };

  const openManageMembers = async (salon: Salon) => {
    setManagingSalon(salon);
    setManageTab(salon.pendingRequestsCount && salon.pendingRequestsCount > 0 ? 'pending' : 'members');
    setLoadingManage(true);
    try {
      const res = await apiRequest<{ success: boolean; data: PendingMember[] }>(`/salons/${salon.id}/pending-members`);
      setPendingRequests(res.data);
    } catch {
      setPendingRequests([]);
    } finally {
      setLoadingManage(false);
    }
  };

  const handleConfirmAdhesion = async (salonId: string, targetUserId: string) => {
    try {
      const res = await apiRequest<{ success: boolean; message: string }>(`/salons/${salonId}/members/${targetUserId}/confirm`, {
        method: 'POST',
      });
      setNotice({ type: 'success', message: res.message });
      setPendingRequests((prev) => prev.filter((p) => p.userId !== targetUserId));
      await loadSalons();
    } catch (err) {
      setNotice({ type: 'error', message: err instanceof Error ? err.message : 'Échec de la confirmation.' });
    }
  };

  const handleRejectAdhesion = async (salonId: string, targetUserId: string) => {
    try {
      const res = await apiRequest<{ success: boolean; message: string }>(`/salons/${salonId}/members/${targetUserId}/reject`, {
        method: 'POST',
      });
      setNotice({ type: 'success', message: res.message });
      setPendingRequests((prev) => prev.filter((p) => p.userId !== targetUserId));
      await loadSalons();
    } catch (err) {
      setNotice({ type: 'error', message: err instanceof Error ? err.message : 'Échec du refus.' });
    }
  };

  const handleKickMember = async (salonId: string, targetUserId: string, targetName: string) => {
    if (!confirm(`Voulez-vous vraiment exclure ${targetName} de ce salon ?`)) return;
    try {
      const res = await apiRequest<{ success: boolean; message: string }>(`/salons/${salonId}/members/${targetUserId}`, {
        method: 'DELETE',
      });
      setNotice({ type: 'success', message: res.message });
      if (managingSalon) {
        setManagingSalon((prev) =>
          prev ? { ...prev, members: prev.members.filter((m) => m.id !== targetUserId) } : null
        );
      }
      await loadSalons();
    } catch (err) {
      setNotice({ type: 'error', message: err instanceof Error ? err.message : 'Impossible d’exclure ce membre.' });
    }
  };

  const filteredSalons = salons.filter((salon) => {
    if (typeFilter !== 'ALL' && salon.type !== typeFilter) return false;
    if (membershipFilter === 'JOINED' && !salon.currentUserIsMember) return false;
    return true;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Espaces & Communautés</span>
          <h1 className="text-xl font-bold text-slate-900 mt-0.5">Salons BMF Community</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Rejoignez des discussions d'entraide ou des cagnottes solidaires. Seul l'administrateur confirme les adhésions.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 rounded-xl bg-[#1f5943] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#184634] transition cursor-pointer self-start sm:self-auto"
        >
          <PlusCircle size={15} />
          <span>Créer un salon</span>
        </button>
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

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-xs">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un salon par nom ou description…"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-emerald-600 focus:bg-white focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setTypeFilter('ALL')}
              className={`rounded-lg px-2.5 py-1 transition cursor-pointer ${
                typeFilter === 'ALL' ? 'bg-white text-emerald-800 shadow-2xs font-bold' : 'text-slate-600'
              }`}
            >
              Tous
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('CHAT')}
              className={`rounded-lg px-2.5 py-1 transition cursor-pointer ${
                typeFilter === 'CHAT' ? 'bg-white text-emerald-800 shadow-2xs font-bold' : 'text-slate-600'
              }`}
            >
              Discussion
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('CONTRIBUTION')}
              className={`rounded-lg px-2.5 py-1 transition cursor-pointer ${
                typeFilter === 'CONTRIBUTION' ? 'bg-white text-emerald-800 shadow-2xs font-bold' : 'text-slate-600'
              }`}
            >
              Cotisation
            </button>
          </div>

          <button
            type="button"
            onClick={() => setMembershipFilter((prev) => (prev === 'ALL' ? 'JOINED' : 'ALL'))}
            className={`rounded-xl border px-3 py-1.5 transition cursor-pointer text-xs font-semibold ${
              membershipFilter === 'JOINED'
                ? 'border-transparent bg-[#1f5943] text-white font-bold shadow-xs'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {membershipFilter === 'JOINED' ? '✓ Salons rejoints' : 'Mes salons uniquement'}
          </button>
        </div>
      </div>

      {/* Salons Grid */}
      {loading ? (
        <div className="py-16 text-center text-xs text-slate-400 animate-pulse">Chargement des salons…</div>
      ) : filteredSalons.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-500 shadow-xs">
          <Filter size={32} className="mx-auto text-slate-300 mb-2" />
          <p className="font-semibold text-slate-700">Aucun salon ne correspond à vos critères</p>
          <p className="mt-1 text-slate-400">Essayez de modifier votre recherche ou créez un nouveau salon.</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSalons.map((salon) => {
            const isChat = salon.type === 'CHAT';
            const isAdmin = Boolean(salon.isCreator ?? (salon.creatorId ? salon.creatorId === user?.id : salon.currentUserRole === 'ADMIN'));
            const isPending = salon.currentUserStatus === 'PENDING';

            return (
              <div
                key={salon.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-emerald-200 hover:shadow-md transition-all group"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-xl font-bold shadow-2xs ${
                          isChat ? 'bg-sky-100 text-sky-800' : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {isChat ? <MessageCircle size={18} /> : <HandCoins size={18} />}
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-slate-900 group-hover:text-emerald-800 transition">
                          {salon.name}
                        </h2>
                        <span
                          className={`inline-block rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            isChat ? 'bg-sky-50 text-sky-700' : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {isChat ? 'Discussion' : `Cagnotte (${salon.currency})`}
                        </span>
                      </div>
                    </div>

                    {salon.currentUserIsMember ? (
                      <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                        {isAdmin && <Shield size={11} />} {isAdmin ? 'Admin' : 'Membre'}
                      </span>
                    ) : isPending ? (
                      <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                        <Clock size={11} /> En attente
                      </span>
                    ) : null}
                  </div>

                  {/* Description */}
                  <p className="mt-3 text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {salon.description || 'Aucune description fournie.'}
                  </p>

                  {/* Rules / Threshold preview */}
                  {!isChat && salon.successThreshold && (
                    <div className="mt-3 rounded-xl bg-emerald-50/60 p-2.5 text-xs text-emerald-900 flex items-center justify-between">
                      <span className="text-[11px] font-medium">Objectif cible :</span>
                      <strong>
                        {Number(salon.successThreshold).toFixed(2)} {salon.currency}
                      </strong>
                    </div>
                  )}
                </div>

                {/* Card Footer */}
                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Users size={14} className="text-slate-400" />
                    <span>{salon.members.length} membre(s)</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Admin Management Button */}
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => void openManageMembers(salon)}
                        className="relative flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 transition cursor-pointer"
                        title="Gérer les adhésions et les membres"
                      >
                        <Shield size={13} className="text-emerald-700" />
                        <span>Membres</span>
                        {salon.pendingRequestsCount && salon.pendingRequestsCount > 0 ? (
                          <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-black text-white">
                            {salon.pendingRequestsCount}
                          </span>
                        ) : null}
                      </button>
                    )}

                    {salon.currentUserIsMember ? (
                      <>
                        <button
                          type="button"
                          onClick={() => navigateTo(isChat ? 'discussions' : 'cotisations', salon.id)}
                          className="flex items-center gap-1 rounded-xl bg-[#1f5943] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#184634] transition cursor-pointer"
                        >
                          <span>Ouvrir</span>
                          <ArrowRight size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleLeaveSalon(salon.id)}
                          className="rounded-xl p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition cursor-pointer"
                          title="Quitter le salon"
                        >
                          <LogOut size={15} />
                        </button>
                      </>
                    ) : isPending ? (
                      <span className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-1.5 text-[11px] font-bold text-amber-800">
                        Demande envoyée
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void handleJoinSalon(salon)}
                        className="rounded-xl bg-[#1f5943] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#184634] transition cursor-pointer"
                      >
                        Demander à rejoindre
                      </button>
                    )}

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => void handleDeleteSalon(salon.id)}
                        className="rounded-xl p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-600 transition cursor-pointer"
                        title="Supprimer le salon (Admin)"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Gérer les adhésions et les membres (Admin du Salon) */}
      {managingSalon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Administration du salon</span>
                <h3 className="text-base font-bold text-slate-900">{managingSalon.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setManagingSalon(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Tabs */}
            <div className="mt-4 flex border-b border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setManageTab('pending')}
                className={`flex items-center gap-1.5 border-b-2 px-4 py-2 font-bold cursor-pointer transition ${
                  manageTab === 'pending'
                    ? 'border-emerald-700 text-emerald-800'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Clock size={14} />
                <span>Demandes d'adhésion ({pendingRequests.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setManageTab('members')}
                className={`flex items-center gap-1.5 border-b-2 px-4 py-2 font-bold cursor-pointer transition ${
                  manageTab === 'members'
                    ? 'border-emerald-700 text-emerald-800'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Users size={14} />
                <span>Membres actifs ({managingSalon.members.length})</span>
              </button>
            </div>

            {/* Tab content */}
            <div className="mt-4 max-h-80 overflow-y-auto space-y-2">
              {loadingManage ? (
                <div className="py-8 text-center text-xs text-slate-400">Chargement…</div>
              ) : manageTab === 'pending' ? (
                pendingRequests.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    Aucune demande d'adhésion en attente pour ce salon.
                  </div>
                ) : (
                  pendingRequests.map((req) => (
                    <div
                      key={req.userId}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        {req.avatarUrl ? (
                          <img src={req.avatarUrl} alt="" className="h-8 w-8 rounded-lg object-cover" />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 font-bold">
                            {req.displayName.slice(0, 1).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-slate-800">{req.displayName}</div>
                          <div className="text-[10px] text-slate-400">@{req.username}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => void handleConfirmAdhesion(managingSalon.id, req.userId)}
                          className="flex items-center gap-1 rounded-lg bg-[#1f5943] px-2.5 py-1 text-xs font-bold text-white hover:bg-[#184634] transition cursor-pointer"
                        >
                          <Check size={13} />
                          <span>Confirmer</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleRejectAdhesion(managingSalon.id, req.userId)}
                          className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-red-50 hover:text-red-600 transition cursor-pointer"
                        >
                          <X size={13} />
                          <span>Refuser</span>
                        </button>
                      </div>
                    </div>
                  ))
                )
              ) : (
                managingSalon.members.map((m) => {
                  const isCurrent = m.id === user?.id;
                  return (
                    <div
                      key={m.id}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1f5943] text-white font-bold">
                          {m.displayName.slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800">
                            {m.displayName} {isCurrent && <span className="text-[10px] text-slate-400">(Vous)</span>}
                          </div>
                          <div className="text-[10px] text-slate-400">@{m.username}</div>
                        </div>
                      </div>

                      {m.id === managingSalon.creatorId ? (
                        <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-800">
                          <Shield size={12} /> Créateur (Admin)
                        </span>
                      ) : !isCurrent ? (
                        <button
                          type="button"
                          onClick={() => void handleKickMember(managingSalon.id, m.id, m.displayName)}
                          className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 transition cursor-pointer"
                          title="Exclure ce membre du salon"
                        >
                          <UserMinus size={13} />
                          <span>Exclure</span>
                        </button>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-5 border-t border-slate-100 pt-3 flex justify-end">
              <button
                type="button"
                onClick={() => setManagingSalon(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Créer un salon */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Créer un nouveau salon</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSalon} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Type de salon</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, type: 'CHAT' }))}
                    className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-xs font-bold transition cursor-pointer ${
                      form.type === 'CHAT'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <MessageCircle size={16} />
                    <span>Discussion</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, type: 'CONTRIBUTION' }))}
                    className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-xs font-bold transition cursor-pointer ${
                      form.type === 'CONTRIBUTION'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <HandCoins size={16} />
                    <span>Cotisation</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nom du salon <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="ex: Projets Vacances 2026, Tontine Solidaire…"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-emerald-600 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Objectif de ce salon, personnes concernées…"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-emerald-600 focus:bg-white focus:outline-none"
                />
              </div>

              {form.type === 'CONTRIBUTION' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Objectif global cible (en USD)
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={form.successThreshold}
                    onChange={(e) => setForm((prev) => ({ ...prev, successThreshold: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium text-slate-800 focus:border-emerald-600 focus:bg-white focus:outline-none"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    Vous pourrez également fixer un montant individuel par personne une fois le salon créé.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-[#1f5943] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#184634] transition cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Création en cours…' : 'Créer le salon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
