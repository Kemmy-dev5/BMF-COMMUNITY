import { useEffect, useState } from 'react';
import {
  Flame,
  HandCoins,
  LayoutDashboard,
  Menu,
  MessageCircle,
  User,
  Users,
  UserRoundPlus,
} from 'lucide-react';
import { BrandIntro } from './features/branding/BrandIntro';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { Sidebar } from './features/dashboard/components/Sidebar';
import { LandingPage } from './features/landing/LandingPage';
import { ContributionManager } from './features/payments/ContributionManager';
import { PostsPage } from './features/posts/PostsPage';
import { ProfilePage } from './features/profile/ProfilePage';
import { UserProfileModal } from './features/profile/UserProfileModal';
import { DiscussionPage } from './features/salons/DiscussionPage';
import { SalonPage } from './features/salons/SalonPage';
import { UserDirectoryPage } from './features/users/UserDirectoryPage';
import { NotificationBell } from './features/notifications/NotificationBell';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { AppView, NavigationProvider, useNavigation } from './lib/NavigationContext';
import { ThemeProvider } from './lib/ThemeContext';
import { ThemeToggle } from './components/ThemeToggle';
import { PwaInstallPrompt } from './components/PwaInstallPrompt';

const viewTitles: Record<AppView, { title: string; subtitle: string; icon: typeof LayoutDashboard }> = {
  dashboard: { title: 'Vue d’ensemble', subtitle: 'Accueil', icon: LayoutDashboard },
  publications: { title: 'Fil de Publications', subtitle: 'Actualités & Partage', icon: Flame },
  salons: { title: 'Salons & Espaces', subtitle: 'Communauté', icon: Users },
  discussions: { title: 'Discussions & Tête-à-tête', subtitle: 'Messagerie privée & salons', icon: MessageCircle },
  cotisations: { title: 'Cotisations & Finances', subtitle: 'Gestion', icon: HandCoins },
  membres: { title: 'Membres & Amis', subtitle: 'Réseau', icon: UserRoundPlus },
  profil: { title: 'Mon Profil & Paramètres', subtitle: 'Compte', icon: User },
};

function AppShell() {
  const { user } = useAuth();
  const { currentView, navigateTo, setMobileMenuOpen } = useNavigation();

  const currentMeta = viewTitles[currentView] ?? viewTitles.dashboard;
  const Icon = currentMeta.icon;
  const initial = user?.displayName ? user.displayName.slice(0, 1).toUpperCase() : 'B';

  return (
    <div className="app-shell min-h-screen bg-[#f5f8f3] dark:bg-[#0d1412] text-slate-800 dark:text-slate-100 transition-colors duration-200">
      <Sidebar />
      <UserProfileModal />

      <div className="main-content flex flex-col min-h-screen">
        {/* Top Sticky Header */}
        <header className="topbar bg-white/85 dark:bg-[#14201c]/90 border-b border-slate-200 dark:border-white/10 backdrop-blur-md transition-colors duration-200">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#162721] text-slate-600 dark:text-slate-300 lg:hidden hover:bg-slate-50 dark:hover:bg-[#1f332c] cursor-pointer shadow-2xs"
              aria-label="Ouvrir le menu"
            >
              <Menu size={18} />
            </button>

            {/* Breadcrumb */}
            <div className="breadcrumb flex items-center gap-2 text-xs">
              <span className="text-slate-400 dark:text-slate-500 font-medium">{currentMeta.subtitle}</span>
              <span className="breadcrumb-slash text-slate-300 dark:text-slate-700">/</span>
              <strong className="text-slate-900 dark:text-white font-bold flex items-center gap-1.5">
                <Icon size={14} className="text-emerald-700 dark:text-emerald-400" />
                {currentMeta.title}
              </strong>
            </div>
          </div>

          {/* Topbar User Profile Action, Notifications & Dark/Light Switch */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Dark / Light Theme Toggle */}
            <ThemeToggle />

            {/* Notification Bell with phone vibration and chime */}
            <NotificationBell />

            <button
              type="button"
              onClick={() => navigateTo('profil')}
              className="flex items-center gap-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white/90 dark:bg-[#162721] pl-2 pr-3 py-1.5 shadow-2xs hover:border-emerald-300 dark:hover:border-emerald-500 hover:bg-white dark:hover:bg-[#1a3029] transition cursor-pointer"
              title="Mon compte & paramètres"
            >
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="h-7 w-7 rounded-lg object-cover shadow-xs" />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1f5943] font-bold text-xs text-white shadow-xs">
                  {initial}
                </div>
              )}
              <div className="hidden sm:block text-left leading-tight">
                <span className="block text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[120px]">
                  {user?.displayName}
                </span>
                <span className="block text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
                  En ligne
                </span>
              </div>
            </button>
          </div>
        </header>

        {/* Mobile PWA Install Banner (appears on phones / supported browsers) */}
        <PwaInstallPrompt />

        {/* Dynamic Page Content */}
        <main className="page-content flex-1 w-full max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          {currentView === 'dashboard' && <DashboardPage />}
          {currentView === 'publications' && <PostsPage />}
          {currentView === 'salons' && <SalonPage />}
          {currentView === 'discussions' && <DiscussionPage />}
          {currentView === 'cotisations' && <ContributionManager />}
          {currentView === 'membres' && <UserDirectoryPage />}
          {currentView === 'profil' && <ProfilePage />}
        </main>
      </div>
    </div>
  );
}

function AppContent() {
  const { user, loading } = useAuth();
  const [showIntro, setShowIntro] = useState(() => {
    return !sessionStorage.getItem('bmf_intro_seen');
  });

  useEffect(() => {
    if (showIntro) {
      const timeout = window.setTimeout(() => {
        setShowIntro(false);
        sessionStorage.setItem('bmf_intro_seen', 'true');
      }, 2000);
      return () => window.clearTimeout(timeout);
    }
  }, [showIntro]);

  if (loading) {
    return (
      <>
        {showIntro && <BrandIntro />}
        <div className="grid min-h-screen place-items-center text-sm font-semibold text-emerald-800 dark:text-emerald-400 bg-[#f5f8f3] dark:bg-[#0d1412] animate-pulse">
          Connexion à BMF Community…
        </div>
      </>
    );
  }

  if (!user) {
    return (
      <>
        {showIntro && <BrandIntro />}
        <LandingPage />
      </>
    );
  }

  return (
    <NavigationProvider>
      {showIntro && <BrandIntro />}
      <AppShell />
    </NavigationProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
