import { ArrowUpRight, HandCoins, MessageCircle, Plus, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiRequest } from '../../../lib/api';
import { useNavigation } from '../../../lib/NavigationContext';

type Salon = {
  id: string;
  name: string;
  description: string;
  type: 'CHAT' | 'CONTRIBUTION';
  members: Array<{ id: string; username: string; displayName: string }>;
  currentUserIsMember: boolean;
};

export function SalonList() {
  const { navigateTo } = useNavigation();
  const [salons, setSalons] = useState<Salon[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    apiRequest<{ success: boolean; data: Salon[] }>('/salons')
      .then((response) => setSalons(response.data.filter((salon) => salon.currentUserIsMember).slice(0, 4)))
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Impossible de charger les salons.'));
  }, []);

  return (
    <div className="salon-list">
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {!error && salons.length === 0 && <p className="rounded-lg bg-white p-4 text-sm text-slate-500">Vous n’avez pas encore rejoint de salon.</p>}
      {salons.map((salon) => {
        const Icon = salon.type === 'CONTRIBUTION' ? HandCoins : MessageCircle;
        const targetView = salon.type === 'CHAT' ? 'discussions' : 'cotisations';
        return (
          <article className="salon-row" key={salon.id}>
            <div className={`salon-icon ${salon.type === 'CONTRIBUTION' ? 'lime' : 'green'}`}><Icon size={20} /></div>
            <div className="salon-description">
              <div className="salon-title-line">
                <h3>{salon.name}</h3>
                <span className="salon-type"><span />{salon.type === 'CONTRIBUTION' ? 'Cotisation' : 'Discussion'}</span>
              </div>
              <p>{salon.description}</p>
            </div>
            <div className="salon-members"><span><Users size={13} />{salon.members.length} membres</span></div>
            <button
              type="button"
              className="salon-open cursor-pointer"
              onClick={() => navigateTo(targetView, salon.id)}
              aria-label={`Ouvrir ${salon.name}`}
            >
              <ArrowUpRight size={18} />
            </button>
          </article>
        );
      })}
      <button
        type="button"
        className="create-salon-row cursor-pointer text-left w-full"
        onClick={() => navigateTo('salons')}
      >
        <span className="create-icon"><Plus size={18} /></span>
        <span><strong>Créer un salon</strong><small>Lancez un nouvel espace pour votre groupe</small></span>
      </button>
    </div>
  );
}
