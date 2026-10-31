import { FormEvent, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  HandCoins,
  KeyRound,
  Lock,
  LogIn,
  MessageCircle,
  Mic,
  Shield,
  ShieldCheck,
  Star,
  Users,
  UserPlus,
  Volume2,
  X,
} from 'lucide-react';
import { apiRequest } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';

const SECURITY_QUESTIONS = [
  'Dans quelle ville êtes-vous né(e) ?',
  'Quel est le nom de votre premier animal de compagnie ?',
  'Quel était le nom de votre école primaire ?',
  'Quel est le prénom de votre meilleur(e) ami(e) d’enfance ?',
  'Quel est votre plat ou repas préféré ?',
];

export function LandingPage() {
  const { login, register } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'reset'>('login');
  const [failedAttempts, setFailedAttempts] = useState(0);

  // Login form state
  const [loginValues, setLoginValues] = useState({ identifier: '', password: '' });

  // Register form state with security question
  const [registerValues, setRegisterValues] = useState({
    username: '',
    email: '',
    password: '',
    securityQuestion: SECURITY_QUESTIONS[0],
    securityAnswer: '',
  });

  // Password reset state
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [resetQuestion, setResetQuestion] = useState('');
  const [hasSecurityQuestion, setHasSecurityQuestion] = useState(true);
  const [resetAnswer, setResetAnswer] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetLoadingQuestion, setResetLoadingQuestion] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authNotice, setAuthNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const openAuth = (mode: 'login' | 'register' | 'reset') => {
    setAuthMode(mode);
    setAuthNotice(null);
    setAuthModalOpen(true);
  };

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setAuthNotice(null);

    try {
      await login(loginValues);
      setFailedAttempts(0);
      setAuthModalOpen(false);
    } catch {
      const attempts = failedAttempts + 1;
      setFailedAttempts(attempts);

      if (attempts >= 3) {
        setAuthMode('reset');
        setResetIdentifier(loginValues.identifier);
        setAuthNotice({
          type: 'error',
          message: '3 tentatives infructueuses. Pour votre sécurité, répondez à votre question secrète pour réinitialiser votre mot de passe.',
        });
        void fetchUserQuestion(loginValues.identifier);
      } else {
        setAuthNotice({
          type: 'error',
          message: `Identifiant ou mot de passe incorrect (${attempts}/3 essais).`,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setAuthNotice(null);

    if (!registerValues.securityAnswer.trim()) {
      setAuthNotice({ type: 'error', message: 'Veuillez saisir la réponse à votre question secrète.' });
      setIsSubmitting(false);
      return;
    }

    try {
      await register({
        username: registerValues.username,
        email: registerValues.email,
        password: registerValues.password,
        securityQuestion: registerValues.securityQuestion,
        securityAnswer: registerValues.securityAnswer.trim().toLowerCase(),
      });
      setAuthModalOpen(false);
    } catch (err) {
      setAuthNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'Erreur lors de la création du compte.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchUserQuestion = async (ident?: string) => {
    const idToLookup = ident || resetIdentifier;
    if (!idToLookup.trim()) {
      setAuthNotice({ type: 'error', message: 'Veuillez renseigner votre pseudo ou email.' });
      return;
    }

    try {
      setResetLoadingQuestion(true);
      setAuthNotice(null);
      const res = await apiRequest<{ success: boolean; data: { question: string; hasSecurityQuestion?: boolean } }>('/auth/security-question', {
        method: 'POST',
        body: JSON.stringify({ identifier: idToLookup.trim() }),
      });
      setResetQuestion(res.data.question);
      setHasSecurityQuestion(res.data.hasSecurityQuestion ?? true);
    } catch (err) {
      setAuthNotice({
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
    setAuthNotice(null);

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
      setAuthNotice({
        type: 'success',
        message: res.message || 'Mot de passe modifié ! Connectez-vous avec vos nouveaux identifiants.',
      });
      setResetAnswer('');
      setResetNewPassword('');
    } catch (err) {
      setAuthNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'Échec de la réinitialisation.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f8f3] text-slate-900 font-sans antialiased">
      {/* Top Fixed Frosted Navigation */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/85 backdrop-blur-md transition-all">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1f5943] text-white font-extrabold text-xl shadow-xs">
              B
            </div>
            <div>
              <div className="font-extrabold text-lg tracking-tight text-slate-900 leading-none">
                BMF <span className="text-xs font-normal text-slate-500">community</span>
              </div>
              <span className="text-[10px] text-emerald-800 font-semibold tracking-wide">
                Communauté solidaire
              </span>
            </div>
          </div>

          {/* Center Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-semibold text-slate-600">
            <a href="#fonctionnalites" className="hover:text-emerald-800 transition">
              Fonctionnalités
            </a>
            <a href="#tete-a-tete" className="hover:text-emerald-800 transition">
              Discussions privées
            </a>
            <a href="#cotisations" className="hover:text-emerald-800 transition">
              Cagnottes
            </a>
            <a href="#etapes" className="hover:text-emerald-800 transition">
              Fonctionnement
            </a>
            <a href="#temoignages" className="hover:text-emerald-800 transition">
              Témoignages
            </a>
          </nav>

          {/* Auth Action Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => openAuth('login')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:border-emerald-300 hover:bg-emerald-50/50 transition cursor-pointer"
            >
              <LogIn size={14} className="text-emerald-800" />
              Se connecter
            </button>
            <button
              type="button"
              onClick={() => openAuth('register')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#1f5943] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#184634] transition cursor-pointer"
            >
              <UserPlus size={14} />
              Rejoindre
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 sm:pt-16 sm:pb-28">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-emerald-100/60 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-800 text-white px-4 py-1.5 text-xs font-bold uppercase tracking-wider shadow-2xs mb-6">
            <ShieldCheck size={14} className="text-white" />
            Espace d'échange et de solidarité entre membres
          </div>

          {/* Main Headline */}
          <h1 className="mx-auto max-w-4xl text-3xl font-black tracking-tight text-slate-900 sm:text-5xl lg:text-6xl leading-[1.15]">
            Discutez simplement, échangez en <span className="text-[#1f5943] underline decoration-emerald-500 decoration-wavy decoration-2">tête-à-tête</span> et soutenez vos projets communs.
          </h1>

          {/* Subtitle */}
          <p className="mx-auto mt-6 max-w-2xl text-base text-slate-600 sm:text-lg leading-relaxed">
            Un espace clair et convivial : salons thématiques, discussions privées à deux,
            notes vocales, partage de photos et suivi transparent des cotisations.
          </p>

          {/* CTA Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <button
              type="button"
              onClick={() => openAuth('register')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#1f5943] px-6 py-3.5 text-sm font-bold text-white shadow-md hover:bg-[#184634] hover:shadow-lg transition cursor-pointer"
            >
              Créer un compte
              <ArrowRight size={16} />
            </button>
            <button
              type="button"
              onClick={() => openAuth('login')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 shadow-xs hover:bg-slate-50 hover:border-emerald-300 transition cursor-pointer"
            >
              <LogIn size={16} className="text-emerald-800" />
              Se connecter
            </button>
          </div>

          {/* Key Trust Points */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 size={15} className="text-emerald-700" />
              Simple et gratuit
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Lock size={15} className="text-emerald-700" />
              Échanges privés confidentiels
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Mic size={15} className="text-emerald-700" />
              Notes vocales et photos
            </span>
            <span className="inline-flex items-center gap-1.5">
              <HandCoins size={15} className="text-emerald-700" />
              Cagnottes transparentes
            </span>
          </div>

          {/* Interactive UI Mockup Showcase */}
          <div className="mt-14 mx-auto max-w-5xl rounded-3xl border border-slate-200 bg-white p-3 sm:p-5 shadow-2xl">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-6 overflow-hidden text-left">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-rose-400" />
                  <div className="h-3 w-3 rounded-full bg-amber-400" />
                  <div className="h-3 w-3 rounded-full bg-emerald-500" />
                  <span className="ml-2 text-xs font-bold text-slate-700">
                    Aperçu de l'interface BMF Community
                  </span>
                </div>
                <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-white bg-[#1f5943] px-2.5 py-1 rounded-full">
                  <span className="h-2 w-2 rounded-full bg-emerald-300 animate-ping" />
                  En ligne
                </div>
              </div>

              {/* Chat & Channels Mock */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-4">
                {/* Left channels */}
                <div className="md:col-span-4 rounded-xl border border-slate-200 bg-white p-3 space-y-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Salons Thématiques
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-2.5 py-2 text-xs font-semibold text-slate-800">
                      <span className="text-emerald-700 font-bold">#</span> Général & Entraide
                    </div>
                    <div className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50">
                      <span className="text-slate-400 font-bold">#</span> Projets & Événements
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                      <span>Messages Privés (Tête-à-tête)</span>
                      <span className="rounded bg-emerald-800 text-white px-1.5 py-0.2">Direct</span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2.5 rounded-lg bg-[#1f5943] text-white px-2.5 py-2 text-xs shadow-xs">
                        <div className="relative">
                          <div className="h-7 w-7 rounded-full bg-white text-emerald-950 font-bold flex items-center justify-center text-xs">
                            S
                          </div>
                          <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 border border-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold truncate text-white">Sarah Koné</div>
                          <div className="text-[10px] text-emerald-100 truncate">
                            🎙️ Note vocale reçue
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-100">
                        <div className="relative">
                          <div className="h-7 w-7 rounded-full bg-slate-200 text-slate-600 font-bold flex items-center justify-center text-xs">
                            J
                          </div>
                          <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border border-white" />
                        </div>
                        <div className="min-w-0 flex-1 truncate">
                          <div className="font-semibold text-slate-800">Jean Dupont</div>
                          <div className="text-[10px] text-slate-400 truncate">Merci pour le point !</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Chat conversation */}
                <div className="md:col-span-8 rounded-xl border border-slate-200 bg-white p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-[#1f5943] text-white font-bold flex items-center justify-center text-xs shadow-xs">
                          S
                        </div>
                        <div>
                          <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                            Sarah Koné
                            <span className="rounded bg-emerald-800 px-1.5 py-0.2 text-[9px] font-bold text-white">
                              Tête-à-tête privé
                            </span>
                          </div>
                          <div className="text-[10px] text-emerald-700 font-medium">En ligne</div>
                        </div>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Lock size={12} className="text-emerald-700" /> Confidentiel
                      </div>
                    </div>

                    {/* Chat Messages */}
                    <div className="mt-4 space-y-3">
                      <div className="flex gap-2 items-start">
                        <div className="h-7 w-7 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs shrink-0">
                          S
                        </div>
                        <div className="bg-slate-100 rounded-2xl rounded-tl-xs p-3 text-xs text-slate-800 max-w-sm">
                          <p className="font-medium">
                            Bonjour ! Voici le point vocal pour la cagnotte solidaire :
                          </p>
                          <div className="mt-2 flex items-center gap-2.5 rounded-xl bg-white border border-slate-200 p-2 shadow-2xs">
                            <div className="h-8 w-8 rounded-full bg-[#1f5943] text-white flex items-center justify-center">
                              <Volume2 size={14} className="ml-0.5" />
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between text-[10px] font-medium text-slate-500 mb-1">
                                <span className="flex items-center gap-1 font-bold text-slate-700">
                                  Note vocale
                                </span>
                                <span>0:14</span>
                              </div>
                              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-600 rounded-full w-2/5" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <div className="bg-[#1f5943] text-white rounded-2xl rounded-tr-xs p-3 text-xs max-w-sm shadow-xs">
                          Parfait, j'enregistre ma participation dès maintenant.
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Cagnotte summary snippet */}
                  <div className="mt-4 pt-3 border-t border-slate-100 bg-[#f7f9f6] -mx-4 -mb-4 p-3 rounded-b-xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-[#1f5943] text-white flex items-center justify-center">
                        <HandCoins size={16} />
                      </div>
                      <div>
                        <div className="font-bold text-slate-800">Cagnotte d'entraide</div>
                        <div className="text-[10px] text-slate-500">
                          68% de l'objectif atteint (3 400 $ / 5 000 $)
                        </div>
                      </div>
                    </div>
                    <span className="font-bold text-white bg-emerald-800 px-2 py-0.5 rounded-full text-[11px]">
                      14 participants
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="fonctionnalites" className="py-20 bg-white border-y border-slate-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-800">
              Fonctionnalités
            </h2>
            <p className="mt-2 text-3xl font-black text-slate-900 sm:text-4xl tracking-tight">
              Des outils simples pour échanger au quotidien
            </p>
            <p className="mt-3 text-sm text-slate-600">
              Retrouvez vos discussions, salons et cagnottes au même endroit sans complexité.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-slate-200 bg-[#f9fbf8] p-6 shadow-xs hover:border-emerald-300 transition">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1f5943] text-white">
                <MessageCircle size={24} />
              </div>
              <h3 className="mt-4 text-lg font-bold text-slate-900">Messages Privés en Tête-à-tête</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Discutez directement et confidentiellement avec un ami ou un membre. Idéal pour les échanges bilatéraux.
              </p>
              <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                <ShieldCheck size={14} /> 100% Confidentiel
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-[#f9fbf8] p-6 shadow-xs hover:border-emerald-300 transition">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1f5943] text-white">
                <Users size={24} />
              </div>
              <h3 className="mt-4 text-lg font-bold text-slate-900">Salons Thématiques</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Organisez vos discussions par sujet : projets, entraide, annonces ou loisirs. Chaque salon a son historique.
              </p>
              <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                <ShieldCheck size={14} /> Salons ouverts et privés
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-[#f9fbf8] p-6 shadow-xs hover:border-emerald-300 transition">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1f5943] text-white">
                <Mic size={24} />
              </div>
              <h3 className="mt-4 text-lg font-bold text-slate-900">Notes Vocales & Photos</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Enregistrez des messages vocaux au micro d'un simple geste et partagez vos images facilement.
              </p>
              <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                <ShieldCheck size={14} /> Lecteur audio intégré
              </div>
            </div>

            <div id="cotisations" className="rounded-2xl border border-slate-200 bg-[#f9fbf8] p-6 shadow-xs hover:border-emerald-300 transition">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1f5943] text-white">
                <HandCoins size={24} />
              </div>
              <h3 className="mt-4 text-lg font-bold text-slate-900">Cagnottes Solidaires</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Suivez les cotisations, collectes et tontines. Visualisez l'état d'avancement des objectifs financiers.
              </p>
              <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                <ShieldCheck size={14} /> Comptes clairs et visibles
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-[#f9fbf8] p-6 shadow-xs hover:border-emerald-300 transition">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1f5943] text-white">
                <UserPlus size={24} />
              </div>
              <h3 className="mt-4 text-lg font-bold text-slate-900">Annuaire des Membres</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Retrouvez facilement les membres, envoyez des demandes d'amis et initiez un tête-à-tête en un clic.
              </p>
              <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                <ShieldCheck size={14} /> Recherche rapide
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-[#f9fbf8] p-6 shadow-xs hover:border-emerald-300 transition">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1f5943] text-white">
                <Shield size={24} />
              </div>
              <h3 className="mt-4 text-lg font-bold text-slate-900">Sécurité & Question Secrète</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Vos comptes sont protégés. En cas d'oubli de mot de passe, votre question clé vous permet de le réinitialiser.
              </p>
              <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                <ShieldCheck size={14} /> Protection des accès
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Spotlight Tête-à-tête */}
      <section id="tete-a-tete" className="py-20 bg-gradient-to-b from-white to-[#f5f8f3]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-800 text-white px-3.5 py-1 text-xs font-bold mb-4">
                <Lock size={13} className="text-white" />
                Discussions Privées 1-à-1
              </div>
              <h2 className="text-3xl font-black text-slate-900 sm:text-4xl tracking-tight leading-tight">
                Discutez en toute liberté entre deux membres
              </h2>
              <p className="mt-4 text-base text-slate-600 leading-relaxed">
                Besoin de régler un point particulier, de convenir d'une cotisation ou simplement d'échanger en tête-à-tête ? Démarrez une conversation directe à tout moment.
              </p>

              <div className="mt-6 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1f5943] text-white text-xs font-bold shrink-0 mt-0.5">
                    1
                  </div>
                  <p className="text-sm text-slate-700">
                    <strong className="text-slate-900">Espace strictement confidentiel :</strong> Seuls les deux participants ont accès aux échanges.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1f5943] text-white text-xs font-bold shrink-0 mt-0.5">
                    2
                  </div>
                  <p className="text-sm text-slate-700">
                    <strong className="text-slate-900">Notes vocales :</strong> Parlez directement au micro sans taper de long texte.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1f5943] text-white text-xs font-bold shrink-0 mt-0.5">
                    3
                  </div>
                  <p className="text-sm text-slate-700">
                    <strong className="text-slate-900">Accès direct :</strong> Accessible depuis la liste des discussions ou l'annuaire des membres.
                  </p>
                </div>
              </div>

              <div className="mt-8">
                <button
                  type="button"
                  onClick={() => openAuth('register')}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#1f5943] px-5 py-3 text-sm font-bold text-white shadow hover:bg-[#184634] transition cursor-pointer"
                >
                  Démarrer une discussion
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Visual Box */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-[#1f5943] text-white font-bold flex items-center justify-center text-sm shadow-xs">
                    S
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Sarah Koné</h4>
                    <p className="text-[11px] text-emerald-800 font-medium">Conversation confidentielle</p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-800 text-white px-2.5 py-0.5 text-[10px] font-bold">
                  En ligne
                </span>
              </div>

              <div className="space-y-3 py-2">
                <div className="rounded-2xl rounded-tl-xs bg-slate-100 p-3 text-xs text-slate-800 max-w-xs">
                  Tu as pu vérifier le reçu de la cotisation pour le projet ?
                </div>
                <div className="flex justify-end">
                  <div className="rounded-2xl rounded-tr-xs bg-[#1f5943] p-3 text-xs text-white max-w-xs shadow-xs">
                    Oui parfaitement, tout est validé dans la cagnotte !
                  </div>
                </div>
                <div className="rounded-2xl rounded-tl-xs bg-slate-100 p-3 text-xs text-slate-800 max-w-xs">
                  <div className="flex items-center gap-2 font-bold text-emerald-800 text-[11px] mb-1">
                    <Volume2 size={13} /> Message vocal (0:18)
                  </div>
                  <div className="h-2 w-48 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-600 w-3/4 rounded-full" />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 text-center text-xs text-slate-500 font-medium">
                🔒 Vos messages restent strictement entre vous et votre interlocuteur.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3 Steps Section */}
      <section id="etapes" className="py-20 bg-white border-y border-slate-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-800">
            Fonctionnement
          </h2>
          <p className="mt-2 text-3xl font-black text-slate-900 sm:text-4xl tracking-tight">
            Comment démarrer
          </p>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="rounded-2xl border border-slate-200 bg-[#f7f9f6] p-8 text-left relative">
              <span className="text-4xl font-black text-emerald-300">01</span>
              <h3 className="mt-2 text-lg font-bold text-slate-900">Créez votre compte</h3>
              <p className="mt-2 text-sm text-slate-600">
                Choisissez un identifiant, votre mot de passe et votre question secrète en cas d'oubli.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-[#f7f9f6] p-8 text-left relative">
              <span className="text-4xl font-black text-emerald-300">02</span>
              <h3 className="mt-2 text-lg font-bold text-slate-900">Échangez et discutez</h3>
              <p className="mt-2 text-sm text-slate-600">
                Rejoignez les salons d'entraide ou initiez un tête-à-tête privé avec un membre.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-[#f7f9f6] p-8 text-left relative">
              <span className="text-4xl font-black text-emerald-300">03</span>
              <h3 className="mt-2 text-lg font-bold text-slate-900">Cotisez simplement</h3>
              <p className="mt-2 text-sm text-slate-600">
                Suivez la progression des cagnottes solidaires et participez aux projets du groupe.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Community Testimonials */}
      <section id="temoignages" className="py-20 bg-[#f5f8f3]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <div className="flex justify-center gap-1 text-amber-500 mb-3">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={18} fill="currentColor" />
              ))}
            </div>
            <h2 className="text-2xl font-black text-slate-900 sm:text-3xl tracking-tight">
              Retours de nos membres
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Des retours d'expérience concrets de notre communauté.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
              <p className="text-sm text-slate-700 italic">
                « La combinaison des salons pour les nouvelles et des discussions en tête-à-tête pour les échanges personnels est très pratique. »
              </p>
              <div className="mt-6 flex items-center gap-3 pt-4 border-t border-slate-100">
                <div className="h-9 w-9 rounded-full bg-[#1f5943] text-white font-bold flex items-center justify-center text-xs">
                  A
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Alex Martin</h4>
                  <p className="text-[10px] text-slate-500">Membre actif</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
              <p className="text-sm text-slate-700 italic">
                « Le suivi des cotisations est clair, et pouvoir s'envoyer des mémos vocaux directement dans l'application facilite tout. »
              </p>
              <div className="mt-6 flex items-center gap-3 pt-4 border-t border-slate-100">
                <div className="h-9 w-9 rounded-full bg-[#1f5943] text-white font-bold flex items-center justify-center text-xs">
                  S
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Sarah Koné</h4>
                  <p className="text-[10px] text-slate-500">Trésorière</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
              <p className="text-sm text-slate-700 italic">
                « La recherche dans l'annuaire et les notifications en direct rendent la communication très réactive. »
              </p>
              <div className="mt-6 flex items-center gap-3 pt-4 border-t border-slate-100">
                <div className="h-9 w-9 rounded-full bg-[#1f5943] text-white font-bold flex items-center justify-center text-xs">
                  J
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Jean Dupont</h4>
                  <p className="text-[10px] text-slate-500">Membre</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Bottom Banner */}
      <section className="py-16 bg-[#1f5943] text-white text-center">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <h2 className="text-3xl font-black sm:text-4xl tracking-tight text-white">
            Rejoignez BMF Community
          </h2>
          <p className="mt-3 text-sm text-emerald-100 max-w-xl mx-auto">
            Créez votre compte en quelques instants et participez aux échanges du groupe.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => openAuth('register')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-emerald-950 hover:bg-slate-100 shadow-md transition cursor-pointer"
            >
              Créer mon compte
              <ArrowRight size={16} />
            </button>
            <button
              type="button"
              onClick={() => openAuth('login')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-6 py-3.5 text-sm font-bold text-white hover:bg-white/20 transition cursor-pointer"
            >
              Se connecter
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-12 text-slate-600 text-xs">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1f5943] text-white font-extrabold text-sm">
              B
            </div>
            <div>
              <span className="font-extrabold text-slate-900">BMF Community</span>
              <span className="ml-2 text-slate-400">© 2026. Tous droits réservés.</span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <a href="#fonctionnalites" className="hover:text-emerald-800">
              Fonctionnalités
            </a>
            <a href="#tete-a-tete" className="hover:text-emerald-800">
              Tête-à-tête
            </a>
            <a href="#cotisations" className="hover:text-emerald-800">
              Cagnottes
            </a>
            <button
              type="button"
              onClick={() => openAuth('login')}
              className="font-bold text-emerald-800 hover:underline cursor-pointer"
            >
              Connexion
            </button>
          </div>
        </div>
      </footer>

      {/* Authentication Modal */}
      {authModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-fadeIn"
          onClick={() => setAuthModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1f5943] text-white font-bold text-sm shadow-xs">
                  B
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {authMode === 'login'
                      ? 'Connexion'
                      : authMode === 'register'
                      ? 'Création de compte'
                      : 'Récupération de compte'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {authMode === 'login'
                      ? 'Accédez à vos discussions et salons'
                      : authMode === 'register'
                      ? 'Rejoignez la communauté en quelques clics'
                      : 'Réinitialisez votre mot de passe avec votre question secrète'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAuthModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Clean Segmented Tab Selector (Connexion vs Inscription) */}
            {authMode !== 'reset' && (
              <div className="mt-4 flex rounded-xl bg-slate-100 p-1 text-xs font-bold shadow-inner">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setAuthNotice(null);
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
                    setAuthNotice(null);
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

            {/* Error or Notice message */}
            {authNotice && (
              <div
                className={`mt-4 rounded-xl border p-3 text-xs font-medium ${
                  authNotice.type === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                    : 'border-red-200 bg-red-50 text-red-700'
                }`}
              >
                {authNotice.message}
              </div>
            )}

            {/* 1. Login Form */}
            {authMode === 'login' && (
              <form className="mt-4 space-y-3" onSubmit={handleLoginSubmit}>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Email ou nom d'utilisateur
                  </label>
                  <input
                    required
                    type="text"
                    autoComplete="username"
                    value={loginValues.identifier}
                    onChange={(e) => setLoginValues((prev) => ({ ...prev, identifier: e.target.value }))}
                    placeholder="Votre pseudo ou email"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs focus:bg-white focus:border-emerald-600 focus:outline-none"
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
                        setAuthNotice(null);
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
                    value={loginValues.password}
                    onChange={(e) => setLoginValues((prev) => ({ ...prev, password: e.target.value }))}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs focus:bg-white focus:border-emerald-600 focus:outline-none"
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
                  {isSubmitting ? 'Connexion en cours…' : 'Se connecter'}
                </button>

                <div className="mt-3 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('register');
                      setAuthNotice(null);
                    }}
                    className="text-xs text-slate-500 hover:text-emerald-800 cursor-pointer"
                  >
                    Pas encore de compte ? <strong className="font-bold text-emerald-800 underline">Créer un compte</strong>
                  </button>
                </div>
              </form>
            )}

            {/* 2. Register Form with Security Question */}
            {authMode === 'register' && (
              <form className="mt-4 space-y-3" onSubmit={handleRegisterSubmit}>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nom d'utilisateur (pseudo)
                  </label>
                  <input
                    required
                    minLength={3}
                    maxLength={40}
                    type="text"
                    value={registerValues.username}
                    onChange={(e) => setRegisterValues((prev) => ({ ...prev, username: e.target.value }))}
                    placeholder="mon_pseudo"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs focus:bg-white focus:border-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Adresse email
                  </label>
                  <input
                    required
                    type="email"
                    value={registerValues.email}
                    onChange={(e) => setRegisterValues((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="contact@exemple.com"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs focus:bg-white focus:border-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mot de passe (8 caractères minimum)
                  </label>
                  <input
                    required
                    minLength={8}
                    type="password"
                    value={registerValues.password}
                    onChange={(e) => setRegisterValues((prev) => ({ ...prev, password: e.target.value }))}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs focus:bg-white focus:border-emerald-600 focus:outline-none"
                  />
                </div>

                {/* Security Question selection */}
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
                    placeholder="Ex: Paris, Minou, etc."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs focus:bg-white focus:border-emerald-600 focus:outline-none"
                  />
                  <span className="block mt-1 text-[10px] text-slate-400">
                    Cette réponse vous sera demandée pour réinitialiser votre mot de passe si vous le perdez.
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-2 rounded-xl bg-[#1f5943] py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#184634] transition disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Création en cours…' : 'Créer mon compte'}
                </button>

                <div className="mt-3 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('login');
                      setAuthNotice(null);
                    }}
                    className="text-xs text-slate-500 hover:text-emerald-800 cursor-pointer"
                  >
                    Déjà membre ? <strong className="font-bold text-emerald-800 underline">Se connecter</strong>
                  </button>
                </div>
              </form>
            )}

            {/* 3. Password Reset Form via Security Question */}
            {authMode === 'reset' && (
              <div className="mt-4 space-y-3">
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                  <div className="font-bold mb-1 flex items-center gap-1.5">
                    <KeyRound size={14} className="text-amber-700" />
                    Récupération sécurisée
                  </div>
                  Indiquez votre identifiant et répondez à votre question secrète pour définir un nouveau mot de passe.
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
                        Votre email ou nom d'utilisateur
                      </label>
                      <input
                        required
                        type="text"
                        value={resetIdentifier}
                        onChange={(e) => setResetIdentifier(e.target.value)}
                        placeholder="Ex: alex ou alex@bmf.org"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs focus:bg-white focus:border-emerald-600 focus:outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={resetLoadingQuestion}
                      className="w-full rounded-xl bg-[#1f5943] py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#184634] transition disabled:opacity-50 cursor-pointer"
                    >
                      {resetLoadingQuestion ? 'Recherche du compte…' : 'Continuer →'}
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
                      {isSubmitting ? 'Réinitialisation en cours…' : 'Enregistrer le nouveau mot de passe'}
                    </button>
                  </form>
                )}

                <div className="mt-3 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('login');
                      setAuthNotice(null);
                      setResetQuestion('');
                    }}
                    className="text-xs font-bold text-emerald-800 hover:underline cursor-pointer"
                  >
                    ← Retour à la connexion
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
