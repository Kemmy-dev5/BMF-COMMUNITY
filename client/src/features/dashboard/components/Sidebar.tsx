import {
  Flame,
  HandCoins,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Plus,
  User,
  Users,
  UserRoundPlus,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../../lib/AuthContext';
import { useNavigation } from '../../../lib/NavigationContext';
import { ThemeToggle } from '../../../components/ThemeToggle';

export function Sidebar() {
  const { user, logout } = useAuth();
  const { currentView, navigateTo, mobileMenuOpen, setMobileMenuOpen } = useNavigation();
  const [logoutError, setLogoutError] = useState('');

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : 'La déconnexion a échoué.');
    }
  };

  const navItems = [
    { view: 'dashboard' as const, label: 'Vue d’ensemble', icon: LayoutDashboard },
    { view: 'publications' as const, label: 'Publications & Fil', icon: Flame },
    { view: 'salons' as const, label: 'Explorer les salons', icon: Users },
    { view: 'discussions' as const, label: 'Discussions', icon: MessageCircle },
    { view: 'cotisations' as const, label: 'Cotisations & Finances', icon: HandCoins },
    { view: 'membres' as const, label: 'Membres & Amis', icon: UserRoundPlus },
  ];

  const initial = user?.displayName ? user.displayName.slice(0, 1).toUpperCase() : 'B';

  return (
    <>
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-64 flex-col bg-white dark:bg-[#14201c] border-r border-[#e8eee7] dark:border-white/10 p-5 shadow-lg lg:shadow-none transition-transform duration-300 ease-in-out lg:translate-x-0 overflow-y-auto overscroll-contain custom-scrollbar ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Header / Brand */}
        <div className="flex items-center justify-between pb-4 shrink-0">
          <button
            type="button"
            onClick={() => navigateTo('dashboard')}
            className="flex items-center gap-3 text-left cursor-pointer group"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1f5943] text-white font-extrabold text-lg shadow-sm group-hover:scale-105 transition-transform">
              B
            </div>
            <div>
              <div className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white leading-none">
                BMF <span className="text-xs font-normal text-slate-500 dark:text-slate-400">community</span>
              </div>
              <span className="text-[10px] text-emerald-800 dark:text-emerald-400 font-semibold">Communauté solidaire</span>
            </div>
          </button>

          <button
            type="button"
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 lg:hidden cursor-pointer"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Fermer le menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* User Card */}
        <div
          onClick={() => navigateTo('profil')}
          className="mt-3 mb-5 flex items-center gap-3 rounded-xl border border-slate-100 dark:border-white/10 bg-[#f7f9f6] dark:bg-[#182722] p-3 text-left cursor-pointer hover:border-emerald-200 dark:hover:border-emerald-700 hover:bg-emerald-50/50 dark:hover:bg-[#1d302a] transition-all shrink-0"
          title="Gérer mon profil"
        >
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="h-10 w-10 shrink-0 rounded-xl object-cover shadow-xs" />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1f5943] font-bold text-sm text-white shadow-xs">
              {initial}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <strong className="block truncate text-xs font-bold text-slate-800 dark:text-slate-100">
              {user?.displayName}
            </strong>
            <span className="block truncate text-[11px] text-slate-500 dark:text-slate-400">
              @{user?.username} · Paramètres
            </span>
          </div>
        </div>

        {/* Navigation Section */}
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-2 mb-2 shrink-0">
          Navigation
        </div>
        <nav className="space-y-1 shrink-0">
          {navItems.map(({ view, label, icon: Icon }) => {
            const isActive = currentView === view;
            return (
              <button
                key={view}
                type="button"
                onClick={() => navigateTo(view)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#1f5943] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-[#f5f8f3] dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon size={17} className={isActive ? 'text-white' : 'text-slate-400 dark:text-slate-400'} />
                <span>{label}</span>
                {isActive && (
                  <span className="ml-auto h-2 w-2 rounded-full bg-emerald-300" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Shortcuts Section */}
        <div className="mt-6 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-2 mb-2 shrink-0">
          <span>Raccourcis</span>
          <button
            type="button"
            onClick={() => navigateTo('salons')}
            title="Nouveau salon"
            className="hover:text-emerald-700 dark:hover:text-emerald-400 cursor-pointer"
          >
            <Plus size={14} />
          </button>
        </div>
        <div className="space-y-1 shrink-0">
          <button
            type="button"
            onClick={() => navigateTo('salons')}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs text-slate-600 dark:text-slate-300 hover:bg-[#f5f8f3] dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <Plus size={16} className="text-emerald-700 dark:text-emerald-400" />
            <span>Créer un salon</span>
          </button>
          <button
            type="button"
            onClick={() => navigateTo('profil')}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
              currentView === 'profil' ? 'bg-[#1f5943] text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-[#f5f8f3] dark:hover:bg-white/5'
            }`}
          >
            <User size={16} className={currentView === 'profil' ? 'text-white' : 'text-slate-400'} />
            <span>Mon compte & sécurité</span>
          </button>
        </div>

        {/* Theme switcher block */}
        <div className="mt-5 pt-3 border-t border-slate-100 dark:border-white/10 shrink-0">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-2 mb-2">
            Apparence
          </div>
          <ThemeToggle showLabel className="w-full justify-start py-2 px-3" />
        </div>

        {/* Footer Area */}
        <div className="mt-auto border-t border-slate-100 dark:border-white/10 pt-4 pb-2 space-y-2.5 shrink-0">
          <div className="flex items-center gap-2 px-2 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="truncate">Connecté en ligne</span>
          </div>

          {logoutError && (
            <div className="text-[11px] text-red-600 px-2">{logoutError}</div>
          )}

          <button
            type="button"
            onClick={() => void handleLogout()}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
          >
            <LogOut size={16} />
            <span>Se déconnecter</span>
          </button>
        </div>
      </aside>
    </>
  );
}
