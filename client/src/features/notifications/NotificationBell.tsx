import {
  Bell,
  Check,
  HandCoins,
  MessageCircle,
  Shield,
  Smartphone,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { apiRequest } from '../../lib/api';
import { AppView, useNavigation } from '../../lib/NavigationContext';
import {
  playNotificationSound,
  requestNotificationPermission,
  signalPhoneNotification,
  vibratePhone,
} from '../../lib/notificationSignal';

export type AppNotification = {
  id: string;
  type: 'FRIEND_REQUEST' | 'FRIEND_ACCEPTED' | 'MESSAGE' | 'SALON_JOIN_REQUEST' | 'PAYMENT_RECEIVED';
  title: string;
  description: string;
  createdAt: string;
  link: 'membres' | 'discussions' | 'salons' | 'cotisations';
  salonId?: string;
  avatarText: string;
};

export function NotificationBell() {
  const { navigateTo } = useNavigation();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(() => {
    return typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default';
  });
  const [testSignalActive, setTestSignalActive] = useState(false);

  const [readIds, setReadIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('bmf_read_notifs');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const readIdsRef = useRef(readIds);
  readIdsRef.current = readIds;

  // Track known notification IDs to detect fresh incoming ones
  const knownIdsRef = useRef<Set<string> | null>(null);

  const fetchNotifications = async () => {
    try {
      const res = await apiRequest<{
        success: boolean;
        data: { notifications: AppNotification[]; unreadCount: number };
      }>('/notifications');

      if (res.data) {
        const incoming = res.data.notifications;

        // If this is a subsequent poll and we detect brand new notifications
        if (knownIdsRef.current !== null) {
          const fresh = incoming.filter(
            (n) => !knownIdsRef.current!.has(n.id) && !readIdsRef.current.has(n.id)
          );
          if (fresh.length > 0) {
            const topItem = fresh[0];
            // Signal the physical phone (vibration + sound chime + native notification)
            void signalPhoneNotification({
              title: topItem.title,
              body: topItem.description,
            });
          }
        }

        knownIdsRef.current = new Set(incoming.map((n) => n.id));
        setNotifications(incoming);
        const unread = incoming.filter((n) => !readIdsRef.current.has(n.id)).length;
        setUnreadCount(unread);
      }
    } catch {
      // ignore network errors during background sync
    }
  };

  // Initial fetch and real-time polling every 6 seconds
  useEffect(() => {
    void fetchNotifications();
    const interval = window.setInterval(() => {
      void fetchNotifications();
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  // Update unread count whenever readIds changes
  useEffect(() => {
    setUnreadCount(notifications.filter((n) => !readIds.has(n.id)).length);
  }, [readIds, notifications]);

  // Click outside listener to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const markAllAsRead = () => {
    const newRead = new Set(readIds);
    notifications.forEach((n) => newRead.add(n.id));
    setReadIds(newRead);
    setUnreadCount(0);
    try {
      localStorage.setItem('bmf_read_notifs', JSON.stringify(Array.from(newRead)));
    } catch {
      // storage unavailable
    }
  };

  const handleNotificationClick = (notif: AppNotification) => {
    // Mark as read
    const newRead = new Set(readIds);
    newRead.add(notif.id);
    setReadIds(newRead);
    setUnreadCount((prev) => Math.max(0, prev - 1));
    try {
      localStorage.setItem('bmf_read_notifs', JSON.stringify(Array.from(newRead)));
    } catch {
      // storage unavailable
    }

    setIsOpen(false);
    navigateTo(notif.link as AppView, notif.salonId);
  };

  const handleEnablePermissions = async () => {
    const perm = await requestNotificationPermission();
    setNotifPermission(perm);
    // Play a friendly confirmation chime + brief vibration
    vibratePhone([150, 50, 150]);
    playNotificationSound();
  };

  const handleTestSignal = () => {
    setTestSignalActive(true);
    // Trigger physical phone vibration + audible chime
    vibratePhone([250, 100, 250, 100, 350]);
    playNotificationSound();
    setTimeout(() => setTestSignalActive(false), 1200);
  };

  const formatTimeAgo = (dateStr: string) => {
    const diff = Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000));
    if (diff < 60) return 'À l’instant';
    if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`;
    return `Il y a ${Math.floor(diff / 86400)} j`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#162721] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#1a3029] hover:text-emerald-800 transition cursor-pointer shadow-2xs"
        aria-label="Notifications"
        title="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-extrabold text-white shadow-xs animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#14201c] p-3 shadow-2xl z-50 animate-scaleUp text-slate-800 dark:text-slate-100">
          <div className="flex items-center justify-between pb-2.5 px-2 border-b border-slate-100 dark:border-white/10">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-slate-900 dark:text-white">Notifications</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 px-2 py-0.5 text-[10px] font-extrabold">
                  {unreadCount} nouvelle{unreadCount > 1 ? 's' : ''}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="flex items-center gap-1 text-[11px] font-bold text-emerald-800 dark:text-emerald-400 hover:text-emerald-950 px-2 py-1 rounded-lg hover:bg-emerald-50 dark:hover:bg-white/5 transition cursor-pointer"
                  title="Tout marquer comme lu"
                >
                  <Check size={13} /> Tout marquer lu
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 transition cursor-pointer"
                aria-label="Fermer"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Phone Sound & Vibration Alert Banner */}
          <div className="mx-1 my-2 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800/40 p-2.5 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200 font-bold text-[11px]">
                <Smartphone size={14} className="text-emerald-700 dark:text-emerald-400" />
                <span>Signal téléphone actif (vibration & son)</span>
              </div>
              <button
                type="button"
                onClick={handleTestSignal}
                className={`rounded-lg px-2 py-0.5 text-[10px] font-bold transition cursor-pointer ${
                  testSignalActive
                    ? 'bg-emerald-600 text-white animate-pulse'
                    : 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-200'
                }`}
                title="Tester le signal sonore et la vibration sur votre appareil"
              >
                {testSignalActive ? '📳 Signal émis !' : 'Tester le signal'}
              </button>
            </div>

            {notifPermission !== 'granted' && (
              <div className="mt-2 flex items-center justify-between gap-2 pt-2 border-t border-emerald-200/50 dark:border-emerald-800/30">
                <span className="text-[10px] text-emerald-800 dark:text-emerald-300">
                  Activez les notifications pour vibrer en arrière-plan.
                </span>
                <button
                  type="button"
                  onClick={() => void handleEnablePermissions()}
                  className="rounded-lg bg-[#1f5943] px-2 py-1 text-[10px] font-bold text-white hover:bg-[#164332] transition cursor-pointer shrink-0"
                >
                  Activer
                </button>
              </div>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5 mt-1">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                Aucune notification pour le moment.
              </div>
            ) : (
              notifications.map((notif) => {
                const isRead = readIds.has(notif.id);
                return (
                  <button
                    key={notif.id}
                    type="button"
                    onClick={() => handleNotificationClick(notif)}
                    className={`flex w-full items-start gap-3 p-2.5 rounded-xl text-left transition cursor-pointer ${
                      isRead
                        ? 'hover:bg-slate-50 dark:hover:bg-white/5 opacity-75'
                        : 'bg-emerald-50/40 dark:bg-emerald-950/20 hover:bg-emerald-50/80 dark:hover:bg-emerald-950/40 font-medium'
                    }`}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#1f5943] text-white font-bold text-xs shadow-xs">
                      {notif.type === 'SALON_JOIN_REQUEST' ? (
                        <Shield size={15} />
                      ) : notif.type === 'PAYMENT_RECEIVED' ? (
                        <HandCoins size={15} />
                      ) : notif.type === 'FRIEND_REQUEST' ? (
                        <UserPlus size={15} />
                      ) : notif.type === 'FRIEND_ACCEPTED' ? (
                        <UserCheck size={15} />
                      ) : (
                        <MessageCircle size={15} />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <strong className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {notif.title}
                        </strong>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {formatTimeAgo(notif.createdAt)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                        {notif.description}
                      </p>
                    </div>

                    {!isRead && (
                      <span className="mt-2 h-2 w-2 rounded-full bg-emerald-600 shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
