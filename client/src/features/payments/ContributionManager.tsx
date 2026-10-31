import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Download,
  HandCoins,
  History,
  Pencil,
  PlusCircle,
  Trash2,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { useNavigation } from '../../lib/NavigationContext';
import { apiRequest } from '../../lib/api';

type Salon = {
  id: string;
  name: string;
  type: 'CHAT' | 'CONTRIBUTION';
  currency: string;
  successThreshold: string | null;
  creatorId?: string;
  isCreator?: boolean;
  currentUserRole: 'ADMIN' | 'MEMBER' | null;
  members: Array<{ id: string; username: string; displayName: string }>;
};

type Payment = {
  id: string;
  userId: string;
  user: string;
  amount: number;
  date: string;
  motif: string;
  recordedById: string;
};

type MemberSummary = {
  userId: string;
  user: string;
  username: string;
  avatarUrl?: string | null;
  role: 'ADMIN' | 'MEMBER';
  assignedAmount: number | null;
  totalPaid: number;
  remainingToPay: number | null;
  paymentsCount: number;
  isFullyPaid: boolean;
};

type SummaryApi = {
  totalAmount: number;
  successThreshold: number;
  remainingToCollect: number;
  remainingToPay: number;
  currency: string;
  membersSummary?: MemberSummary[];
  contributions: Payment[];
};

export function ContributionManager() {
  const { user } = useAuth();
  const { selectedSalonId } = useNavigation();
  const [salons, setSalons] = useState<Salon[]>([]);
  const [salonId, setSalonId] = useState('');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [membersSummary, setMembersSummary] = useState<MemberSummary[]>([]);
  const [threshold, setThreshold] = useState(0);
  const [currency, setCurrency] = useState('USD');
  const [form, setForm] = useState({
    userId: '',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    reason: '',
  });
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Quota modal state for Admin
  const [editingQuotaMember, setEditingQuotaMember] = useState<MemberSummary | null>(null);
  const [quotaInput, setQuotaInput] = useState('');
  const [savingQuota, setSavingQuota] = useState(false);

  useEffect(() => {
    apiRequest<{ success: boolean; data: Salon[] }>('/salons')
      .then((res) => {
        const contributionSalons = res.data.filter((s) => s.type === 'CONTRIBUTION');
        setSalons(contributionSalons);

        if (selectedSalonId && contributionSalons.some((s) => s.id === selectedSalonId)) {
          setSalonId(selectedSalonId);
        } else if (contributionSalons.length > 0) {
          setSalonId(contributionSalons[0].id);
        }
      })
      .catch((err) => {
        setNotice({
          type: 'error',
          message: err instanceof Error ? err.message : 'Impossible de charger les salons.',
        });
      })
      .finally(() => setLoading(false));
  }, [selectedSalonId]);

  const selectedSalon = salons.find((s) => s.id === salonId);
  const isSalonAdmin = Boolean(selectedSalon?.isCreator ?? (selectedSalon?.creatorId ? selectedSalon.creatorId === user?.id : selectedSalon?.currentUserRole === 'ADMIN'));

  const selectedMembers = useMemo(() => {
    if (!selectedSalon) return [];
    if (isSalonAdmin) return selectedSalon.members;
    return selectedSalon.members.filter((m) => m.id === user?.id);
  }, [selectedSalon, user?.id, isSalonAdmin]);

  const loadPaymentsSummary = async (targetSalonId: string) => {
    try {
      const res = await apiRequest<{ success: boolean; data: SummaryApi }>(
        `/payments/summary?salonId=${encodeURIComponent(targetSalonId)}`
      );
      setPayments(res.data.contributions);
      setThreshold(res.data.successThreshold);
      setCurrency(res.data.currency);
      setMembersSummary(res.data.membersSummary ?? []);
    } catch (err) {
      setNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'Résumé des cotisations indisponible.',
      });
    }
  };

  useEffect(() => {
    if (!salonId) {
      setPayments([]);
      setThreshold(0);
      setMembersSummary([]);
      return;
    }

    void loadPaymentsSummary(salonId);
    setForm((current) => ({
      ...current,
      userId: selectedMembers.some((m) => m.id === current.userId)
        ? current.userId
        : selectedMembers[0]?.id ?? user?.id ?? '',
    }));
  }, [salonId, selectedMembers, user?.id]);

  const totals = useMemo(() => {
    const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
    const progress = threshold > 0 ? Math.min(100, Math.round((totalAmount / threshold) * 100)) : 0;
    return {
      totalAmount,
      progress,
      remainingToCollect: Math.max(0, threshold - totalAmount),
      excedent: Math.max(0, totalAmount - threshold),
    };
  }, [payments, threshold]);

  const handleRecordPayment = async (e: FormEvent) => {
    e.preventDefault();
    setNotice(null);

    const amountNum = Number(form.amount);
    if (!salonId || !form.userId || !form.date || !Number.isFinite(amountNum) || amountNum <= 0) {
      setNotice({ type: 'error', message: 'Veuillez saisir un membre, une date et un montant valide.' });
      return;
    }

    try {
      setSaving(true);
      await apiRequest('/payments', {
        method: 'POST',
        body: JSON.stringify({
          salonId,
          recipientId: form.userId,
          amount: amountNum,
          date: form.date,
          reason: form.reason.trim(),
        }),
      });

      setForm((prev) => ({ ...prev, amount: '', reason: '' }));
      setShowAddModal(false);
      setNotice({ type: 'success', message: 'Paiement enregistré avec succès.' });
      await loadPaymentsSummary(salonId);
    } catch (err) {
      setNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'Échec de l’enregistrement du versement.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveQuota = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingQuotaMember || !salonId) return;

    const amountNum = Number(quotaInput);
    if (!Number.isFinite(amountNum) || amountNum < 0) {
      setNotice({ type: 'error', message: 'Veuillez saisir un montant positif valide.' });
      return;
    }

    try {
      setSavingQuota(true);
      const res = await apiRequest<{ success: boolean; message: string }>('/payments/quota', {
        method: 'PATCH',
        body: JSON.stringify({
          salonId,
          userId: editingQuotaMember.userId,
          assignedAmount: amountNum,
        }),
      });

      setNotice({ type: 'success', message: res.message });
      setEditingQuotaMember(null);
      await loadPaymentsSummary(salonId);
    } catch (err) {
      setNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'Échec de la définition du montant.',
      });
    } finally {
      setSavingQuota(false);
    }
  };

  const deletePayment = async (paymentId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette cotisation ?')) return;

    try {
      setNotice(null);
      await apiRequest(`/payments/${paymentId}`, { method: 'DELETE' });
      setPayments((prev) => prev.filter((p) => p.id !== paymentId));
      setNotice({ type: 'success', message: 'Paiement supprimé.' });
      await loadPaymentsSummary(salonId);
    } catch (err) {
      setNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'Impossible de supprimer ce paiement.',
      });
    }
  };

  const exportCsv = () => {
    if (payments.length === 0) return;
    const headers = ['Date', 'Membre', 'Montant', 'Devise', 'Motif', 'ID Transaction'];
    const rows = payments.map((p) => [
      p.date,
      `"${p.user.replace(/"/g, '""')}"`,
      p.amount.toFixed(2),
      currency,
      `"${p.motif.replace(/"/g, '""')}"`,
      p.id,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csvContent);
    link.download = `cotisations_${selectedSalon?.name.replace(/[^a-z0-9]/gi, '_') || 'salon'}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-xs text-slate-400 animate-pulse">
        Chargement du module de cotisations…
      </div>
    );
  }

  if (salons.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-500 shadow-xs">
        <HandCoins size={36} className="mx-auto text-slate-300 mb-3" />
        <h2 className="text-sm font-bold text-slate-800">Aucun salon de cotisation disponible</h2>
        <p className="mt-1 text-slate-400">
          Vous devez créer ou rejoindre un salon de type <strong>Cotisation</strong> pour gérer ou consulter les finances.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header & Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
            Gestion Financière & Tontines
          </span>
          <h1 className="text-xl font-bold text-slate-900 mt-0.5">Suivi des Cotisations</h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <span>Salon :</span>
            <select
              value={salonId}
              onChange={(e) => setSalonId(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 focus:border-emerald-600 focus:outline-none"
            >
              {salons.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.currency})
                </option>
              ))}
            </select>
          </label>

          {isSalonAdmin ? (
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 rounded-xl bg-[#1f5943] px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#184634] transition cursor-pointer"
            >
              <PlusCircle size={15} />
              <span>Encaisser un versement</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
              <span className="h-2 w-2 rounded-full bg-slate-400" />
              <span>Consultation seule</span>
            </div>
          )}

          {payments.length > 0 && (
            <button
              type="button"
              onClick={exportCsv}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              title="Exporter l'historique en CSV"
            >
              <Download size={14} />
              <span>Export CSV</span>
            </button>
          )}
        </div>
      </div>

      {!isSalonAdmin && (
        <div className="flex items-center gap-2.5 rounded-xl bg-slate-50 border border-slate-200/80 px-4 py-2.5 text-xs text-slate-600">
          <AlertCircle size={15} className="text-slate-400 shrink-0" />
          <span>
            <strong>Mode consultation :</strong> Seul l'administrateur de ce salon peut enregistrer des paiements et définir les montants individuels à encaisser.
          </span>
        </div>
      )}

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

      {/* Progress & Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total collecté</span>
            <DollarSign size={16} className="text-emerald-700" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">
            {totals.totalAmount.toFixed(2)} <span className="text-xs font-semibold text-slate-500">{currency}</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-700 font-semibold">
            <TrendingUp size={13} /> {totals.progress}% de l'objectif
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Objectif global</span>
            <HandCoins size={16} className="text-emerald-700" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">
            {threshold.toFixed(2)} <span className="text-xs font-semibold text-slate-500">{currency}</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            Reste global : <strong>{totals.remainingToCollect.toFixed(2)} {currency}</strong>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Membres actifs</span>
            <Users size={16} className="text-blue-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">
            {membersSummary.length || selectedSalon?.members.length || 0}
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            {payments.length} versement(s) au total
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Transactions</span>
            <History size={16} className="text-purple-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">
            {payments.length}
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            Dernier versement : {payments[0]?.date || 'Aucun'}
          </div>
        </div>
      </div>

      {/* Progress Bar Banner */}
      <div className="rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 via-emerald-100/50 to-white p-5 shadow-xs">
        <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-2">
          <span>Progression globale de la cagnotte</span>
          <span className="text-emerald-800">{totals.progress}% ({totals.totalAmount.toFixed(2)} / {threshold.toFixed(2)} {currency})</span>
        </div>
        <div className="h-3 w-full rounded-full bg-slate-200 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#1f5943] to-[#73a447] transition-all duration-500"
            style={{ width: `${totals.progress}%` }}
          />
        </div>
      </div>

      {/* Members Breakdown Table (with custom assigned amounts per person) */}
      {membersSummary.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
          <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Users size={15} className="text-emerald-700" /> Montants individuels et situation par membre
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {isSalonAdmin
                  ? 'En tant qu’administrateur, vous pouvez fixer le montant attendu pour chaque membre (ex: Emmanuel 50$, Henock 45$).'
                  : 'Consultez votre montant attendu et l’état de vos versements.'}
              </p>
            </div>
            <span className="text-[11px] text-slate-500 font-semibold">{membersSummary.length} membre(s)</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Membre</th>
                  <th className="px-5 py-3">Rôle</th>
                  <th className="px-5 py-3">Montant à encaisser</th>
                  <th className="px-5 py-3">Total versé</th>
                  <th className="px-5 py-3">Reste dû</th>
                  <th className="px-5 py-3 text-center">Statut</th>
                  {isSalonAdmin && <th className="px-5 py-3 text-right">Actions Admin</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {membersSummary.map((m) => {
                  const initial = m.user.slice(0, 1).toUpperCase();
                  const isAssigned = m.assignedAmount !== null;
                  const isCompleted = isAssigned && m.totalPaid >= m.assignedAmount!;
                  const isPartial = isAssigned && m.totalPaid > 0 && m.totalPaid < m.assignedAmount!;

                  return (
                    <tr key={m.userId} className="hover:bg-slate-50/50 transition">
                      <td className="px-5 py-3 flex items-center gap-2.5 font-semibold text-slate-800">
                        {m.avatarUrl ? (
                          <img src={m.avatarUrl} alt="" className="h-7 w-7 rounded-lg object-cover" />
                        ) : (
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                            {initial}
                          </div>
                        )}
                        <div>
                          <div>{m.user}</div>
                          <div className="text-[10px] text-slate-400">@{m.username}</div>
                        </div>
                      </td>

                      <td className="px-5 py-3">
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                            m.role === 'ADMIN' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {m.role === 'ADMIN' ? 'Admin' : 'Membre'}
                        </span>
                      </td>

                      {/* Montant individuel à encaisser (Fixé par l'admin) */}
                      <td className="px-5 py-3 font-bold text-slate-900">
                        {isAssigned ? (
                          <span className="text-slate-900 font-extrabold">
                            {m.assignedAmount!.toFixed(2)} {currency}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Non défini</span>
                        )}
                      </td>

                      <td className="px-5 py-3 font-bold text-emerald-800">
                        {m.totalPaid.toFixed(2)} {currency}
                      </td>

                      <td className="px-5 py-3 font-semibold text-slate-700">
                        {m.remainingToPay !== null ? (
                          m.remainingToPay > 0 ? (
                            <span className="text-rose-600 font-bold">
                              {m.remainingToPay.toFixed(2)} {currency}
                            </span>
                          ) : (
                            <span className="text-emerald-700 font-bold">0.00 {currency}</span>
                          )
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      <td className="px-5 py-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            isCompleted
                              ? 'bg-emerald-100 text-emerald-800'
                              : isPartial
                              ? 'bg-amber-100 text-amber-800'
                              : isAssigned && m.totalPaid === 0
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : m.totalPaid > 0
                              ? 'bg-emerald-50 text-emerald-800'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {isCompleted
                            ? '✓ Réglé'
                            : isPartial
                            ? `Reste ${m.remainingToPay!.toFixed(2)}`
                            : isAssigned && m.totalPaid === 0
                            ? 'Non versé'
                            : m.totalPaid > 0
                            ? 'Cotisant'
                            : 'En attente'}
                        </span>
                      </td>

                      {/* Admin Quick Actions */}
                      {isSalonAdmin && (
                        <td className="px-5 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingQuotaMember(m);
                                setQuotaInput(m.assignedAmount !== null ? String(m.assignedAmount) : '');
                              }}
                              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 transition cursor-pointer"
                              title="Définir le montant à encaisser pour ce membre"
                            >
                              <Pencil size={12} className="text-emerald-700" />
                              <span>Fixer quota</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setForm((prev) => ({
                                  ...prev,
                                  userId: m.userId,
                                  amount: m.remainingToPay !== null && m.remainingToPay > 0 ? String(m.remainingToPay) : '',
                                }));
                                setShowAddModal(true);
                              }}
                              className="rounded-lg bg-[#1f5943] px-2 py-1 text-[11px] font-bold text-white hover:bg-[#184634] transition cursor-pointer"
                              title="Encaisser un versement pour ce membre"
                            >
                              Encaisser
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payment History List */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-3.5 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <History size={15} className="text-emerald-700" /> Historique détaillé des versements
          </h2>
          <span className="text-[11px] text-slate-500">{payments.length} transaction(s)</span>
        </div>

        {payments.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            Aucun versement n'a encore été enregistré pour ce salon.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {payments.map((p) => {
              const canDelete = isSalonAdmin;
              return (
                <div key={p.id} className="flex items-center justify-between p-4 hover:bg-slate-50/60 transition">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                      <HandCoins size={18} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800">{p.user}</div>
                      <div className="text-[11px] text-slate-500">
                        {p.date} {p.motif ? `· ${p.motif}` : ''}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <strong className="text-sm font-black text-emerald-800">
                      +{p.amount.toFixed(2)} {currency}
                    </strong>
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => void deletePayment(p.id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition cursor-pointer"
                        title="Supprimer ce paiement (Admin)"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Fixer le montant individuel par membre (Admin) */}
      {editingQuotaMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                  Définir la cotisation individuelle
                </span>
                <h3 className="text-sm font-bold text-slate-900">{editingQuotaMember.user}</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingQuotaMember(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveQuota} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Montant à encaisser ({currency})
                </label>
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="ex: 50.00"
                  value={quotaInput}
                  onChange={(e) => setQuotaInput(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium text-slate-800 focus:border-emerald-600 focus:bg-white focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Ex: Emmanuel 50$, Henock 45$. Ce montant servira de référence pour calculer le reste dû.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingQuotaMember(null)}
                  className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={savingQuota}
                  className="rounded-xl bg-[#1f5943] px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#184634] transition cursor-pointer disabled:opacity-50"
                >
                  {savingQuota ? 'Enregistrement…' : 'Enregistrer le montant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Enregistrer un versement (Admin seulement) */}
      {showAddModal && isSalonAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <PlusCircle size={18} className="text-emerald-700" /> Encaisser un versement
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Membre cotisant
                </label>
                <select
                  required
                  value={form.userId}
                  onChange={(e) => setForm((prev) => ({ ...prev, userId: e.target.value }))}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 focus:border-emerald-600 focus:outline-none"
                >
                  {selectedMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.displayName} (@{m.username})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Montant ({currency})
                  </label>
                  <input
                    required
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="ex: 50.00"
                    value={form.amount}
                    onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 focus:border-emerald-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Date du versement
                  </label>
                  <input
                    required
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Motif ou référence (facultatif)
                </label>
                <input
                  maxLength={255}
                  placeholder="ex: Cotisation mensuelle Mars"
                  value={form.reason}
                  onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-[#1f5943] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#184634] transition disabled:opacity-60 cursor-pointer"
                >
                  {saving ? 'Validation…' : 'Valider le paiement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
