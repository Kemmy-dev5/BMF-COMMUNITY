import { createContext, ReactNode, useContext, useState } from 'react';

export type AppView = 'dashboard' | 'publications' | 'salons' | 'discussions' | 'cotisations' | 'membres' | 'profil';

type NavigationContextValue = {
  currentView: AppView;
  selectedSalonId: string | null;
  mobileMenuOpen: boolean;
  activeProfileUserId: string | null;
  navigateTo: (view: AppView, salonId?: string | null) => void;
  setMobileMenuOpen: (open: boolean) => void;
  openUserProfile: (userId: string) => void;
  closeUserProfile: () => void;
};

const NavigationContext = createContext<NavigationContextValue | null>(null);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [selectedSalonId, setSelectedSalonId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeProfileUserId, setActiveProfileUserId] = useState<string | null>(null);

  const navigateTo = (view: AppView, salonId?: string | null) => {
    setCurrentView(view);
    if (salonId !== undefined) {
      setSelectedSalonId(salonId);
    }
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openUserProfile = (userId: string) => {
    setActiveProfileUserId(userId);
  };

  const closeUserProfile = () => {
    setActiveProfileUserId(null);
  };

  return (
    <NavigationContext.Provider
      value={{
        currentView,
        selectedSalonId,
        mobileMenuOpen,
        activeProfileUserId,
        navigateTo,
        setMobileMenuOpen,
        openUserProfile,
        closeUserProfile,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within NavigationProvider');
  }
  return context;
}
