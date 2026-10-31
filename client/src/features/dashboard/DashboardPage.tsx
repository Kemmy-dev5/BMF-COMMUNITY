import { useNavigation } from '../../lib/NavigationContext';
import { CommunityPage } from '../community/CommunityPage';
import { ContributionSummary } from './components/ContributionSummary';
import { GreetingPanel } from './components/GreetingPanel';
import { SalonList } from './components/SalonList';

export function DashboardPage() {
  const { navigateTo } = useNavigation();

  return (
    <div className="space-y-8 animate-fadeIn">
      <GreetingPanel />
      <ContributionSummary />

      <section className="salons-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">VOTRE ESPACE</span>
            <h2>Vos salons actifs</h2>
            <p>Retrouvez vos discussions et vos projets communs.</p>
          </div>
          <button
            type="button"
            onClick={() => navigateTo('salons')}
            className="text-action cursor-pointer bg-transparent border-0 font-bold text-xs"
          >
            Explorer tous les salons →
          </button>
        </div>
        <SalonList />
      </section>

      <CommunityPage />

      <footer className="dashboard-footer">
        <span>BMF Community <span className="footer-dot">·</span> Espace solidaire</span>
      </footer>
    </div>
  );
}
