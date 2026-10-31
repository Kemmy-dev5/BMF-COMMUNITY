import { ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '../../../lib/AuthContext';
import { useNavigation } from '../../../lib/NavigationContext';

export function GreetingPanel() {
  const { user } = useAuth();
  const { navigateTo } = useNavigation();
  const today = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  return (
    <section className="greeting-panel" id="accueil">
      <div className="greeting-copy">
        <span className="greeting-date"><Sparkles size={14} /> {today.toLocaleUpperCase('fr-FR')}</span>
        <h1>Bonjour, {user?.displayName}<span className="greeting-period">.</span></h1>
        <p>Bienvenue dans votre espace d'échange et d'entraide.</p>
        <button
          type="button"
          onClick={() => navigateTo('salons')}
          className="primary-button cursor-pointer"
        >
          Découvrir les salons <ArrowRight size={16} />
        </button>
      </div>
      <div className="greeting-art" aria-hidden="true">
        <span className="art-orbit orbit-one" /><span className="art-orbit orbit-two" />
        <span className="art-sun">b</span><span className="art-leaf leaf-one" /><span className="art-leaf leaf-two" />
        <span className="art-caption">Communauté<br />solidaire</span>
      </div>
      <div className="greeting-index"><span>01</span><span className="index-line" /><span>03</span></div>
    </section>
  );
}
