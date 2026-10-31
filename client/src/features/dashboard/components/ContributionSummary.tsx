import { ArrowDownRight, ArrowUpRight, HandCoins, UsersRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiRequest } from '../../../lib/api';

type DashboardSummary = {
  communityUsers: number;
  openSalons: number;
  joinedSalons: number;
  contributionsTotal: number;
  contributionTarget: number;
  contributionRemaining: number;
};

export function ContributionSummary() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiRequest<{ success: boolean; data: DashboardSummary }>('/dashboard')
      .then((response) => setSummary(response.data))
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Impossible de charger le résumé.'));
  }, []);

  if (error) return <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>;
  if (!summary) return <div className="summary-grid" aria-label="Chargement du résumé">Chargement des statistiques…</div>;

  const stats = [
    {
      label: 'Salons rejoints',
      value: String(summary.joinedSalons).padStart(2, '0'),
      detail: `${summary.openSalons} salons ouverts`,
      icon: UsersRound,
      trend: `${summary.communityUsers} membres`,
      positive: true,
    },
    {
      label: 'Cotisations versées',
      value: `${summary.contributionsTotal.toFixed(2)} $`,
      detail: `sur un objectif de ${summary.contributionTarget.toFixed(2)} $`,
      icon: HandCoins,
      trend: `${summary.contributionRemaining.toFixed(2)} $ à collecter`,
      positive: false,
    },
  ];

  return (
    <section className="summary-grid" aria-label="Résumé de l’activité">
      {stats.map(({ label, value, detail, icon: Icon, trend, positive }) => (
        <article className="summary-item" key={label}>
          <div className="summary-top"><span className="summary-icon"><Icon size={18} /></span><span className={`summary-trend ${positive ? 'is-positive' : ''}`}>{positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{trend}</span></div>
          <div className="summary-value">{value}</div>
          <div className="summary-bottom"><strong>{label}</strong><span>{detail}</span></div>
        </article>
      ))}
    </section>
  );
}
