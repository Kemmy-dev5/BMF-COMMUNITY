import { FormEvent, useState } from 'react';
import { KeyRound, LogIn, UserPlus } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';

const SECURITY_QUESTIONS = [
  'Dans quelle ville êtes-vous né(e) ?',
  'Quel est le nom de votre premier animal de compagnie ?',
  'Quel était le nom de votre école primaire ?',
  'Quel est le prénom de votre meilleur(e) ami(e) d’enfance ?',
  'Quel est votre plat ou repas préféré ?',
];

export function AuthPage() {
  const { login, register, error: sessionError } = useAuth();
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'reset'>('login');
  const [failedAttempts, setFailedAttempts] = useState(0);

  const [loginValues, setLoginValues] = useState({ identifier: '', password: '' });
  const [registerValues, setRegisterValues] = useState({
    username: '',
    email: '',
    password: '',
    securityQuestion: SECURITY_QUESTIONS[0],
    securityAnswer: '',
  });

  const [resetIdentifier, setResetIdentifier] = useState('');
  const [resetQuestion, setResetQuestion] = useState('');
  const [hasSecurityQuestion, setHasSecurityQuestion] = useState(true);
  const [resetAnswer, setResetAnswer] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetLoadingQuestion, setResetLoadingQuestion] = useState(false);

  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null);

    try {
      setIsSubmitting(true);
      setNotice({ type: 'success', message: await login(loginValues) });
      setFailedAttempts(0);
    } catch (error) {
      const attempts = failedAttempts + 1;
      setFailedAttempts(attempts);

      if (attempts >= 3) {
        setAuthMode('reset');
        setResetIdentifier(loginValues.identifier);
        setNotice({
          type: 'error',
          message: '3 tentatives infructueuses. Pour votre sécurité, veuillez répondre à votre question secrète pour réinitialiser votre mot de passe.',
        });
        void fetchUserQuestion(loginValues.identifier);
      } else {
        setNotice({
          type: 'error',
          message: error instanceof Error ? error.message : `Identifiants incorrects (${attempts}/3 essais).`,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null);

    if (!registerValues.securityAnswer.trim()) {
      setNotice({ type: 'error', message: 'Veuillez saisir la réponse à votre question secrète.' });
      return;
    }

    try {
      setIsSubmitting(true);
      setNotice({
        type: 'success',
        message: await register({
          username: registerValues.username,
          email: registerValues.email,
          password: registerValues.password,
          securityQuestion: registerValues.securityQuestion,
          securityAnswer: registerValues.securityAnswer.trim().toLowerCase(),
        }),
      });
    } catch (error) {
      setNotice({
        type: 'error',
        message: error instanceof Error ? error.message : 'La création du compte a échoué.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchUserQuestion = async (ident?: string) => {
    const idToLookup = ident || resetIdentifier;
    if (!idToLookup.trim()) {
      setNotice({ type: 'error', message: 'Veuillez indiquer votre pseudo ou email.' });
      return;
    }

    try {
      setResetLoadingQuestion(true);
      setNotice(null);
      const res = await apiRequest<{ success: boolean; data: { question: string; hasSecurityQuestion?: boolean } }>('/auth/security-question', {
        method: 'POST',
        body: JSON.stringify({ identifier: idToLookup.trim() }),
      });
      setResetQuestion(res.data.question);
      setHasSecurityQuestion(res.data.hasSecurityQuestion ?? true);
    } catch (err) {
      setNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'Compte introuvable.',
      });
    } finally {
      setResetLoadingQuestion(false);
    }
  };

  const handleResetSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setNotice(null);

    try {
      const res = await apiRequest<{ success: boolean; message: string }>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          identifier: resetIdentifier.trim(),
          answer: resetAnswer.trim().toLowerCase(),
          newPassword: resetNewPassword,
        }),
      });

      setAuthMode('login');
      setFailedAttempts(0);
      setLoginValues({ identifier: resetIdentifier, password: '' });
      setNotice({
        type: 'success',
        message: res.message || 'Mot de passe modifié ! Connectez-vous avec vos nouveaux identifiants.',
      });
      setResetAnswer('');
      setResetNewPassword('');
    } catch (err) {
      setNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'Échec de la réinitialisation.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="max-w-md mx-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6 text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1f5943] text-white font-extrabold text-2xl shadow-xs mb-3">
          B
        </div>
        <h2 className="text-xl font-bold text-slate-900">
          {authMode === 'login'
            ? 'Connexion'
            : authMode === 'register'
            ? 'Créer un compte'
            : 'Récupération de compte'}
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          {authMode === 'login'
            ? 'Accédez à votre espace BMF Community'
            : authMode === 'register'
            ? 'Rejoignez la communauté en quelques clics'
            : 'Réinitialisez votre mot de passe'}
        </p>
      </div>

      {/* Segmented Switcher */}
      {authMode !== 'reset' && (
        <div className="mb-5 flex rounded-xl bg-slate-100 p-1 text-xs font-bold shadow-inner">
          <button
            type="button"
            onClick={() => {
              setAuthMode('login');
              setNotice(null);
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 transition-all cursor-pointer ${
              authMode === 'login'
                ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LogIn size={14} className={authMode === 'login' ? 'text-emerald-800' : 'text-slate-400'} />
            Se connecter
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('register');
              setNotice(null);
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 transition-all cursor-pointer ${
              authMode === 'register'
                ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserPlus size={14} className={authMode === 'register' ? 'text-emerald-800' : 'text-slate-400'} />
            Créer un compte
          </button>
        </div>
      )}

      {/* 1. Login Form */}
      {authMode === 'login' && (
        <form className="space-y-3" onSubmit={handleLogin}>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Email ou pseudo
            </label>
            <input
              required
              autoComplete="username"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs focus:bg-white focus:border-emerald-600 focus:outline-none"
              placeholder="Votre identifiant"
              value={loginValues.identifier}
              onChange={(e) => setLoginValues((prev) => ({ ...prev, identifier: e.target.value }))}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700">
                Mot de passe
              </label>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('reset');
                  setResetIdentifier(loginValues.identifier);
                  setNotice(null);
                  if (loginValues.identifier) void fetchUserQuestion(loginValues.identifier);
                }}
                className="text-[11px] font-semibold text-emerald-800 hover:underline cursor-pointer"
              >
                Mot de passe oublié ?
              </button>
            </div>
            <input
              required
              type="password"
              autoComplete="current-password"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs focus:bg-white focus:border-emerald-600 focus:outline-none"
              placeholder="••••••••"
              value={loginValues.password}
              onChange={(e) => setLoginValues((prev) => ({ ...prev, password: e.target.value }))}
            />
          </div>

          {failedAttempts > 0 && failedAttempts < 3 && (
            <p className="text-[11px] text-amber-600">
              ⚠️ {failedAttempts} tentative(s) échouée(s). Au bout de 3 essais, vous serez invité à répondre à votre question secrète.
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 rounded-xl bg-[#1f5943] py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#184634] transition disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
      )}

      {/* 2. Register Form */}
      {authMode === 'register' && (
        <form className="space-y-3" onSubmit={handleRegister}>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nom d'utilisateur (pseudo)
            </label>
            <input
              required
              minLength={3}
              maxLength={40}
              autoComplete="username"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs focus:bg-white focus:border-emerald-600 focus:outline-none"
              placeholder="mon_pseudo"
              value={registerValues.username}
              onChange={(e) => setRegisterValues((prev) => ({ ...prev, username: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Adresse email
            </label>
            <input
              required
              type="email"
              autoComplete="email"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs focus:bg-white focus:border-emerald-600 focus:outline-none"
              placeholder="contact@exemple.com"
              value={registerValues.email}
              onChange={(e) => setRegisterValues((prev) => ({ ...prev, email: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Mot de passe (8 caractères min)
            </label>
            <input
              required
              minLength={8}
              autoComplete="new-password"
              type="password"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs focus:bg-white focus:border-emerald-600 focus:outline-none"
              placeholder="••••••••"
              value={registerValues.password}
              onChange={(e) => setRegisterValues((prev) => ({ ...prev, password: e.target.value }))}
            />
          </div>

          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center gap-1.5 mb-1.5">
              <KeyRound size={13} className="text-emerald-800" />
              <label className="block text-xs font-bold text-slate-700">
                Question secrète de sécurité
              </label>
            </div>
            <select
              value={registerValues.securityQuestion}
              onChange={(e) => setRegisterValues((prev) => ({ ...prev, securityQuestion: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:bg-white focus:border-emerald-600 focus:outline-none"
            >
              {SECURITY_QUESTIONS.map((q) => (
                <option key={q} value={q}>
                  {q}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Votre réponse secrète
            </label>
            <input
              required
              type="text"
              value={registerValues.securityAnswer}
              onChange={(e) => setRegisterValues((prev) => ({ ...prev, securityAnswer: e.target.value }))}
              placeholder="Votre réponse secrète"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs focus:bg-white focus:border-emerald-600 focus:outline-none"
            />
            <span className="block mt-1 text-[10px] text-slate-400">
              Demandée pour réinitialiser votre mot de passe si vous le perdez.
            </span>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 rounded-xl bg-[#1f5943] py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#184634] transition disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? 'Création…' : 'Créer mon compte'}
          </button>
        </form>
      )}

      {/* 3. Reset Form */}
      {authMode === 'reset' && (
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
            <div className="font-bold mb-1 flex items-center gap-1.5">
              <KeyRound size={14} className="text-amber-700" />
              Récupération sécurisée
            </div>
            Répondez à votre question secrète pour choisir un nouveau mot de passe.
          </div>

          {!resetQuestion ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void fetchUserQuestion();
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Votre email ou pseudo
                </label>
                <input
                  required
                  type="text"
                  value={resetIdentifier}
                  onChange={(e) => setResetIdentifier(e.target.value)}
                  placeholder="alex ou alex@bmf.org"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs focus:bg-white focus:border-emerald-600 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={resetLoadingQuestion}
                className="w-full rounded-xl bg-[#1f5943] py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#184634] transition disabled:opacity-50 cursor-pointer"
              >
                {resetLoadingQuestion ? 'Recherche…' : 'Continuer →'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetSubmit} className="space-y-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Votre question secrète
                </div>
                <div className="text-xs font-bold text-slate-900">
                  {resetQuestion}
                </div>
              </div>

            {hasSecurityQuestion && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Votre réponse secrète
                </label>
                <input
                  required
                  type="text"
                  value={resetAnswer}
                  onChange={(e) => setResetAnswer(e.target.value)}
                  placeholder="Votre réponse"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs focus:bg-white focus:border-emerald-600 focus:outline-none"
                />
              </div>
            )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nouveau mot de passe (8 caractères min)
                </label>
                <input
                  required
                  minLength={8}
                  type="password"
                  value={resetNewPassword}
                  onChange={(e) => setResetNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs focus:bg-white focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 rounded-xl bg-[#1f5943] py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#184634] transition disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? 'Enregistrement…' : 'Enregistrer le nouveau mot de passe'}
              </button>
            </form>
          )}

          <div className="mt-3 text-center">
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setNotice(null);
                setResetQuestion('');
              }}
              className="text-xs font-bold text-emerald-800 hover:underline cursor-pointer"
            >
              ← Retour à la connexion
            </button>
          </div>
        </div>
      )}

      {notice && (
        <div
          className={`mt-4 rounded-xl border px-3.5 py-2.5 text-xs font-medium ${
            notice.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {notice.message}
        </div>
      )}

      {sessionError && !notice && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700">
          {sessionError}
        </div>
      )}
    </section>
  );
}
