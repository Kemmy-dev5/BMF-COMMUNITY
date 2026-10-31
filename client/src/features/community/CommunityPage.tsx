import { useEffect, useState } from 'react';
import { apiRequest } from '../../lib/api';

type CommunitySummary = {
  communityUsers: number;
  openSalons: number;
  joinedSalons: number;
};

export function CommunityPage() {
  const [summary, setSummary] = useState<CommunitySummary | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiRequest<{ success: boolean; data: CommunitySummary }>('/dashboard')
      .then((response) => setSummary(response.data))
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Impossible de charger les informations communautaires.'));
  }, []);

  return (
    <section id="communaute" className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-600">Communauté</p>
      <h2 className="mt-2 text-2xl font-bold text-slate-900">Votre espace en chiffres</h2>
      {error ? (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <strong className="text-slate-800">Membres inscrits</strong>
            <div className="mt-3 text-3xl font-black text-emerald-700">{summary?.communityUsers ?? '—'}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <strong className="text-slate-800">Salons ouverts</strong>
            <div className="mt-3 text-3xl font-black text-emerald-700">{summary?.openSalons ?? '—'}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <strong className="text-slate-800">Vos salons</strong>
            <div className="mt-3 text-3xl font-black text-emerald-700">{summary?.joinedSalons ?? '—'}</div>
          </div>
        </div>
      )}

      <div className="mt-6 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
        <h3 className="text-lg font-semibold text-slate-800">Règles de la communauté</h3>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600">
          <li>Chaque salon a un administrateur désigné.</li>
          <li>Les cotisations sont suivies dans l’historique du salon.</li>
          <li>Les demandes d’ami sont associées à votre compte.</li>
        </ul>
      </div>
    </section>
  );
}
