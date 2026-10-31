import { ChangeEvent, FormEvent, useRef, useState } from 'react';
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  KeyRound,
  Lock,
  Mail,
  Moon,
  Smartphone,
  Sun,
  Trash2,
  User,
  UserCheck,
  Volume2,
} from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { apiRequest } from '../../lib/api';
import { useTheme } from '../../lib/ThemeContext';
import { playNotificationSound, requestNotificationPermission, vibratePhone } from '../../lib/notificationSignal';

export function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? '');
  const [avatarPreview, setAvatarPreview] = useState(user?.avatarUrl ?? '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [profileNotice, setProfileNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordNotice, setPasswordNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  const handleAvatarFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setProfileNotice({ type: 'error', message: 'Veuillez sélectionner un fichier image valide.' });
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      setProfileNotice({ type: 'error', message: 'L’image est trop volumineuse (max 4Mo).' });
      return;
    }

    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setAvatarPreview(base64);
      setProfileNotice({ type: 'success', message: 'Photo sélectionnée. Cliquez sur « Mettre à jour le profil » pour enregistrer.' });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview('');
    setAvatarUrl('');
    if (avatarInputRef.current) avatarInputRef.current.value = '';
    setProfileNotice({ type: 'success', message: 'Photo retirée. Cliquez sur « Mettre à jour le profil » pour enregistrer.' });
  };

  const handleUpdateProfile = async (e: FormEvent) => {
    e.preventDefault();
    setProfileNotice(null);

    if (!displayName.trim() || !email.trim()) {
      setProfileNotice({ type: 'error', message: 'Veuillez remplir tous les champs obligatoires.' });
      return;
    }

    try {
      setSavingProfile(true);
      let finalAvatarUrl = avatarUrl;

      // Upload file through the upload endpoint if a new photo was selected to prevent Base64 database bloat
      if (avatarFile && avatarPreview && avatarPreview.startsWith('data:')) {
        const uploadRes = await apiRequest<{ success: boolean; data: { url: string } }>('/upload', {
          method: 'POST',
          body: JSON.stringify({
            data: avatarPreview,
            type: 'image',
          }),
        });
        finalAvatarUrl = uploadRes.data.url;
        setAvatarUrl(finalAvatarUrl);
        setAvatarFile(null);
      } else if (!avatarPreview) {
        finalAvatarUrl = '';
      }

      const res = await apiRequest<{ success: boolean; message: string; data: { user: any } }>('/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          displayName: displayName.trim(),
          email: email.trim(),
          bio: bio.trim() || null,
          avatarUrl: finalAvatarUrl || null,
        }),
      });

      if (res.data?.user && updateUser) {
        updateUser(res.data.user);
      }
      setProfileNotice({ type: 'success', message: res.message ?? 'Profil mis à jour avec succès.' });
    } catch (err) {
      setProfileNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'Échec de la mise à jour du profil.',
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordNotice(null);

    if (newPassword !== confirmPassword) {
      setPasswordNotice({ type: 'error', message: 'Les nouveaux mots de passe ne correspondent pas.' });
      return;
    }

    if (newPassword.length < 8) {
      setPasswordNotice({ type: 'error', message: 'Le mot de passe doit comporter au moins 8 caractères.' });
      return;
    }

    try {
      setSavingPassword(true);
      const res = await apiRequest<{ success: boolean; message: string }>('/auth/password', {
        method: 'PATCH',
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      setPasswordNotice({ type: 'success', message: res.message ?? 'Mot de passe modifié avec succès.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'Échec de la modification du mot de passe.',
      });
    } finally {
      setSavingPassword(false);
    }
  };

  const initial = displayName ? displayName.slice(0, 1).toUpperCase() : 'B';

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#14201c] p-5 shadow-xs">
        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
          Mon Compte & Sécurité
        </span>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">Paramètres du profil</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Gérez vos informations personnelles, votre mot de passe, l'apparence et les alertes mobiles.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profile Card */}
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#14201c] p-6 shadow-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-white/10">
            <User className="text-emerald-700 dark:text-emerald-400" size={18} />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Informations Générales</h2>
          </div>

          <form onSubmit={handleUpdateProfile} className="mt-5 space-y-4">
            {/* Avatar Section */}
            <div className="flex items-center gap-4">
              <div className="relative">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt=""
                    className="h-16 w-16 rounded-2xl object-cover shadow-xs border border-slate-200 dark:border-white/10"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1f5943] text-white font-black text-2xl shadow-xs">
                    {initial}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition cursor-pointer shadow-xs"
                  title="Changer de photo"
                >
                  <Camera size={13} />
                </button>
              </div>

              <div>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarFile}
                  className="hidden"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#182722] px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition cursor-pointer"
                  >
                    Choisir une photo
                  </button>
                  {avatarPreview && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      className="rounded-xl p-1.5 text-slate-400 hover:text-red-600 transition cursor-pointer"
                      title="Supprimer la photo"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-slate-400">JPG, PNG ou WEBP (max 4 Mo)</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Nom d'affichage
              </label>
              <div className="relative mt-1.5">
                <UserCheck size={16} className="absolute left-3.5 top-3 text-slate-400" />
                <input
                  required
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#182722] pl-10 pr-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:border-emerald-600 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Adresse e-mail
              </label>
              <div className="relative mt-1.5">
                <Mail size={16} className="absolute left-3.5 top-3 text-slate-400" />
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#182722] pl-10 pr-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:border-emerald-600 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Biographie / Présentation
              </label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Quelques mots pour vous présenter à la communauté…"
                className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#182722] p-3 text-sm text-slate-800 dark:text-slate-100 focus:border-emerald-600 focus:outline-none"
              />
            </div>

            {profileNotice && (
              <div
                className={`flex items-center gap-2 rounded-xl p-3 text-sm ${
                  profileNotice.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40'
                    : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/40'
                }`}
              >
                {profileNotice.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{profileNotice.message}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={savingProfile}
              className="mt-2 w-full rounded-xl bg-[#1f5943] py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-[#164332] transition cursor-pointer disabled:opacity-60"
            >
              {savingProfile ? 'Enregistrement…' : 'Mettre à jour le profil'}
            </button>
          </form>
        </div>

        {/* Security / Password Card */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#14201c] p-6 shadow-xs">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-white/10">
              <KeyRound className="text-emerald-700 dark:text-emerald-400" size={18} />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Sécurité du Mot de Passe</h2>
            </div>

            <form onSubmit={handleChangePassword} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Mot de passe actuel
                </label>
                <div className="relative mt-1.5">
                  <Lock size={16} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    required
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#182722] pl-10 pr-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Nouveau mot de passe
                </label>
                <div className="relative mt-1.5">
                  <Lock size={16} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    required
                    type="password"
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Au moins 8 caractères"
                    className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#182722] pl-10 pr-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Confirmer le nouveau mot de passe
                </label>
                <div className="relative mt-1.5">
                  <Lock size={16} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    required
                    type="password"
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#182722] pl-10 pr-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              {passwordNotice && (
                <div
                  className={`flex items-center gap-2 rounded-xl p-3 text-sm ${
                    passwordNotice.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40'
                      : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/40'
                  }`}
                >
                  {passwordNotice.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  <span>{passwordNotice.message}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={savingPassword}
                className="mt-2 w-full rounded-xl bg-slate-800 dark:bg-slate-700 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-slate-900 transition cursor-pointer disabled:opacity-60"
              >
                {savingPassword ? 'Modification…' : 'Changer le mot de passe'}
              </button>
            </form>
          </div>

          {/* Theme & Mobile Notification Signals Card */}
          <ProfileSettingsAddon />
        </div>
      </div>
    </div>
  );
}

function ProfileSettingsAddon() {
  const { theme, setTheme } = useTheme();
  const [testingSignal, setTestingSignal] = useState(false);
  const [notifPerm, setNotifPerm] = useState<NotificationPermission>(() => {
    return typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default';
  });

  const handleTest = () => {
    setTestingSignal(true);
    vibratePhone([250, 100, 250, 100, 350]);
    playNotificationSound();
    setTimeout(() => setTestingSignal(false), 1200);
  };

  const handlePerm = async () => {
    const res = await requestNotificationPermission();
    setNotifPerm(res);
    vibratePhone([150, 50, 150]);
    playNotificationSound();
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#14201c] p-6 shadow-xs space-y-6">
      {/* Theme selection */}
      <div>
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-white/10">
          <Sun size={18} className="text-emerald-700 dark:text-emerald-400" />
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Apparence de l'application</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Basculez entre le thème clair et le thème sombre selon votre préférence.
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`flex items-center justify-center gap-2.5 rounded-xl border p-3 text-xs font-bold transition cursor-pointer ${
              theme === 'light'
                ? 'border-emerald-600 bg-emerald-50/70 text-emerald-900 shadow-2xs'
                : 'border-slate-200 dark:border-white/10 bg-white dark:bg-[#182722] text-slate-700 dark:text-slate-300 hover:bg-slate-50'
            }`}
          >
            <Sun size={16} className="text-amber-500" />
            <span>Mode Clair</span>
          </button>

          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`flex items-center justify-center gap-2.5 rounded-xl border p-3 text-xs font-bold transition cursor-pointer ${
              theme === 'dark'
                ? 'border-emerald-500 bg-[#1a3028] text-white shadow-2xs'
                : 'border-slate-200 dark:border-white/10 bg-white dark:bg-[#182722] text-slate-700 dark:text-slate-300 hover:bg-slate-50'
            }`}
          >
            <Moon size={16} className="text-amber-300" />
            <span>Mode Sombre</span>
          </button>
        </div>
      </div>

      {/* Mobile notification & sound signals */}
      <div className="pt-2 border-t border-slate-100 dark:border-white/10">
        <div className="flex items-center gap-2 pb-3">
          <Smartphone size={18} className="text-emerald-700 dark:text-emerald-400" />
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Signal mobile & notifications</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Vibration physique et carillon sonore lors de la réception d'une notification.
            </p>
          </div>
        </div>

        <div className="mt-2 rounded-xl bg-slate-50 dark:bg-[#182722] border border-slate-200/80 dark:border-white/10 p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                Signal de notification mobile
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Statut système :{' '}
                <strong className={notifPerm === 'granted' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600'}>
                  {notifPerm === 'granted' ? 'Activé (vibration & son autorisés)' : 'Non autorisé ou en attente'}
                </strong>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTest}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition cursor-pointer shadow-2xs ${
                  testingSignal
                    ? 'bg-emerald-600 text-white animate-pulse'
                    : 'border border-slate-200 dark:border-white/10 bg-white dark:bg-[#14201c] text-slate-700 dark:text-slate-200 hover:bg-slate-50'
                }`}
                title="Déclenche la vibration et le son sur cet appareil"
              >
                <Volume2 size={14} />
                <span>{testingSignal ? 'Signal émis !' : 'Tester le signal'}</span>
              </button>

              {notifPerm !== 'granted' && (
                <button
                  type="button"
                  onClick={() => void handlePerm()}
                  className="rounded-xl bg-[#1f5943] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#164332] transition cursor-pointer shadow-2xs"
                >
                  Autoriser
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
