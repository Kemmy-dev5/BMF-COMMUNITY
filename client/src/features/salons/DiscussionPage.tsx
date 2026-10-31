import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import {
  Hash,
  Image as ImageIcon,
  Lock,
  MessageCircle,
  Mic,
  Pause,
  Play,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  Volume2,
  X,
  ZoomIn,
} from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { useNavigation } from '../../lib/NavigationContext';
import { apiRequest } from '../../lib/api';

type Salon = {
  id: string;
  name: string;
  rawName?: string;
  description: string;
  rules: string;
  type: 'CHAT' | 'CONTRIBUTION';
  creatorId?: string;
  isCreator?: boolean;
  isDirect?: boolean;
  directRecipient?: { id: string; username: string; displayName: string; avatarUrl?: string | null } | null;
  members: Array<{ id: string; username: string; displayName: string; avatarUrl?: string | null }>;
  currentUserIsMember: boolean;
};

type Message = {
  id: string;
  content: string;
  mediaUrl?: string | null;
  mediaType?: 'image' | 'audio' | null;
  duration?: number;
  createdAt: string;
  author: { id: string; displayName: string; username: string; avatarUrl?: string | null };
};

export function normalizeMediaUrl(url?: string | null): string {
  if (!url) return '';
  return url.replace(/^http:\/\/localhost:4000/, '');
}

function VoiceMessagePlayer({ src, duration, isMe }: { src: string; duration?: number; isMe: boolean }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);
  const [showNative, setShowNative] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      setAudioError(false);
      audioRef.current.play().catch((err) => {
        console.warn('Audio play failed:', err);
        setAudioError(true);
        setIsPlaying(false);
      });
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      if ((!totalDuration || !Number.isFinite(totalDuration)) && audioRef.current.duration && Number.isFinite(audioRef.current.duration)) {
        setTotalDuration(Math.round(audioRef.current.duration));
      }
    }
  };

  const formatSecs = (sec: number) => {
    if (!Number.isFinite(sec) || sec <= 0) return '0:00';
    const s = Math.floor(sec);
    const m = Math.floor(s / 60);
    const rest = s % 60;
    return `${m}:${String(rest).padStart(2, '0')}`;
  };

  const displayDuration = totalDuration && Number.isFinite(totalDuration) && totalDuration > 0 ? totalDuration : duration || 0;
  const progressPercent = displayDuration > 0 ? (currentTime / displayDuration) * 100 : 0;

  return (
    <div
      className={`rounded-2xl p-3 min-w-[240px] max-w-sm shadow-xs ${
        isMe ? 'bg-emerald-800/90 text-white' : 'bg-slate-100 text-slate-800 border border-slate-200'
      }`}
    >
      <audio
        ref={audioRef}
        src={normalizeMediaUrl(src)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
        onError={() => setAudioError(true)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => {
          if (audioRef.current && Number.isFinite(audioRef.current.duration) && audioRef.current.duration > 0) {
            setTotalDuration(Math.round(audioRef.current.duration));
          }
        }}
        preload="metadata"
      />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={togglePlay}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full shadow transition cursor-pointer ${
            isMe
              ? 'bg-white text-emerald-900 hover:bg-emerald-50'
              : 'bg-[#1f5943] text-white hover:bg-emerald-900'
          }`}
          title={isPlaying ? 'Pause' : 'Écouter'}
        >
          {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between text-[11px] mb-1.5 font-medium">
            <span className="flex items-center gap-1 font-bold">
              <Volume2 size={13} /> Message vocal
            </span>
            <span className="font-mono text-[10px] opacity-80">
              {isPlaying ? formatSecs(currentTime) : formatSecs(displayDuration)}
            </span>
          </div>

          <div
            className="h-2.5 w-full rounded-full bg-black/15 overflow-hidden cursor-pointer"
            onClick={(e) => {
              if (!audioRef.current || !displayDuration) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const clickPos = (e.clientX - rect.left) / rect.width;
              audioRef.current.currentTime = clickPos * displayDuration;
            }}
            title="Cliquer pour naviguer dans l'audio"
          >
            <div
              className={`h-full rounded-full transition-all duration-150 ${
                isMe ? 'bg-white' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(3, progressPercent))}%` }}
            />
          </div>
        </div>
      </div>

      {audioError && (
        <p className="mt-2 text-[10px] text-red-300">
          Lecture audio bloquée par le navigateur. Utilisez le lecteur standard ci-dessous.
        </p>
      )}

      <div className="mt-2 pt-1.5 border-t border-black/10 flex items-center justify-between text-[10px]">
        <button
          type="button"
          onClick={() => setShowNative(!showNative)}
          className="opacity-75 hover:opacity-100 underline cursor-pointer"
        >
          {showNative ? 'Masquer lecteur standard' : 'Lecteur standard (volume/vitesse)'}
        </button>
      </div>

      {showNative && (
        <div className="mt-2">
          <audio controls src={src} className="w-full h-8" preload="auto" />
        </div>
      )}
    </div>
  );
}

export function DiscussionPage() {
  const { user } = useAuth();
  const { selectedSalonId, navigateTo } = useNavigation();
  const [salons, setSalons] = useState<Salon[]>([]);
  const [activeSalonId, setActiveSalonId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);

  // Image upload state
  const [selectedImage, setSelectedImage] = useState<{
    file: File;
    previewUrl: string;
    base64: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lightbox for full size image viewing
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastScrolledMessageIdRef = useRef<string | null>(null);

  // Direct messages & Friends state
  const [showNewDirectModal, setShowNewDirectModal] = useState(false);
  const [friendsList, setFriendsList] = useState<Array<{ id: string; username: string; displayName: string }>>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [memberSearchResults, setMemberSearchResults] = useState<Array<{ id: string; username: string; displayName: string }>>([]);
  const [searchingMembers, setSearchingMembers] = useState(false);
  const [sidebarFilter, setSidebarFilter] = useState('');

  // Fetch accepted friends when direct chat modal opens
  useEffect(() => {
    if (!showNewDirectModal) return;
    let active = true;
    setLoadingFriends(true);
    apiRequest<{ success: boolean; data: any[] }>('/users/friends')
      .then((res) => {
        if (!active) return;
        const accepted = res.data
          .filter((f) => f.status === 'ACCEPTED')
          .map((f) => f.user);
        setFriendsList(accepted);
      })
      .catch((err) => console.warn('Friends load error:', err))
      .finally(() => {
        if (active) setLoadingFriends(false);
      });

    return () => {
      active = false;
    };
  }, [showNewDirectModal]);

  // Search members
  useEffect(() => {
    if (!showNewDirectModal || !memberSearchQuery.trim()) {
      setMemberSearchResults([]);
      return;
    }

    let active = true;
    setSearchingMembers(true);
    const timer = setTimeout(async () => {
      try {
        const res = await apiRequest<{ success: boolean; data: Array<{ id: string; username: string; displayName: string }> }>(
          `/users/search?q=${encodeURIComponent(memberSearchQuery.trim())}`
        );
        if (active) {
          setMemberSearchResults(res.data.filter((u) => u.id !== user?.id));
        }
      } catch (err) {
        console.warn('Member search error:', err);
      } finally {
        if (active) setSearchingMembers(false);
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [showNewDirectModal, memberSearchQuery, user?.id]);

  const startDirectChatWithUser = async (targetUserId: string) => {
    try {
      setNotice('');
      const res = await apiRequest<{ success: boolean; data: Salon }>('/salons/direct', {
        method: 'POST',
        body: JSON.stringify({ recipientId: targetUserId }),
      });
      const conv = res.data;
      setSalons((prev) => {
        if (prev.some((s) => s.id === conv.id)) return prev;
        return [conv, ...prev];
      });
      setActiveSalonId(conv.id);
      setShowNewDirectModal(false);
      setMemberSearchQuery('');
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Erreur lors du démarrage du tête-à-tête.');
    }
  };

  // Load chat salons with real-time sync every 4s
  useEffect(() => {
    let active = true;

    const fetchSalons = () => {
      apiRequest<{ success: boolean; data: Salon[] }>('/salons')
        .then((res) => {
          if (!active) return;
          const chatSalons = res.data.filter((s) => s.type === 'CHAT' && s.currentUserIsMember);
          setSalons(chatSalons);

          if (selectedSalonId && chatSalons.some((s) => s.id === selectedSalonId)) {
            setActiveSalonId(selectedSalonId);
          } else if (chatSalons.length > 0 && !activeSalonId) {
            setActiveSalonId(chatSalons[0].id);
          }
        })
        .catch((err) => {
          if (active) setNotice(err instanceof Error ? err.message : 'Erreur de chargement des salons.');
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    };

    fetchSalons();
    const salonsInterval = window.setInterval(fetchSalons, 4000);

    return () => {
      active = false;
      window.clearInterval(salonsInterval);
    };
  }, [selectedSalonId]);

  // Load messages for active salon with real-time sync every 2.5s
  useEffect(() => {
    if (!activeSalonId) {
      setMessages([]);
      return;
    }

    let active = true;
    setLoadingMessages(true);

    const fetchMessages = async (silent = false) => {
      try {
        if (!silent) setLoadingMessages(true);
        const res = await apiRequest<{ success: boolean; data: Message[] }>(`/salons/${activeSalonId}/messages`);
        if (active) {
          setMessages((prev) => {
            if (prev.length === res.data.length && prev[prev.length - 1]?.id === res.data[res.data.length - 1]?.id) {
              return prev;
            }
            return res.data;
          });
          setNotice('');
        }
      } catch (err) {
        if (active && !silent) {
          setNotice(err instanceof Error ? err.message : 'Impossible de récupérer les messages.');
        }
      } finally {
        if (active && !silent) setLoadingMessages(false);
      }
    };

    void fetchMessages(false);
    const interval = window.setInterval(() => {
      void fetchMessages(true);
    }, 2500);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [activeSalonId]);

  // Auto-scroll only when a new message is appended or image is selected
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg) return;

    if (lastMsg.id !== lastScrolledMessageIdRef.current || selectedImage) {
      lastScrolledMessageIdRef.current = lastMsg.id;
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, selectedImage]);

  const activeSalon = salons.find((s) => s.id === activeSalonId);

  // Handle Image Selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 12 * 1024 * 1024) {
      setNotice('L’image ne doit pas dépasser 12 Mo.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage({
        file,
        previewUrl: URL.createObjectURL(file),
        base64: reader.result as string,
      });
      setNotice('');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const removeSelectedImage = () => {
    if (selectedImage) {
      URL.revokeObjectURL(selectedImage.previewUrl);
      setSelectedImage(null);
    }
  };

  // Voice recording handlers
  const startRecording = async () => {
    try {
      setNotice('');
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setNotice('L’enregistrement audio n’est pas disponible sur ce navigateur.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const supportedMime = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
      ].find((type) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) || '';

      const mediaRecorder = new MediaRecorder(stream, supportedMime ? { mimeType: supportedMime } : undefined);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingDuration(0);

      recordingTimerRef.current = window.setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch {
      setNotice('Microphone inaccessible. Veuillez autoriser l’accès au micro dans votre navigateur.');
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
    setIsRecording(false);
    setRecordingDuration(0);
    audioChunksRef.current = [];
  };

  const sendVoiceRecording = async () => {
    if (!mediaRecorderRef.current) return;
    const duration = recordingDuration;

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }

    mediaRecorderRef.current.onstop = async () => {
      mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop());
      const mime = mediaRecorderRef.current?.mimeType || 'audio/webm';
      const audioBlob = new Blob(audioChunksRef.current, { type: mime });
      audioChunksRef.current = [];
      setIsRecording(false);
      setRecordingDuration(0);

      if (audioBlob.size === 0) {
        setNotice('Enregistrement audio vide. Veuillez parler plus fort dans le micro.');
        return;
      }

      try {
        setSending(true);
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Data = reader.result as string;
          const uploadRes = await apiRequest<{ success: boolean; data: { url: string } }>('/upload', {
            method: 'POST',
            body: JSON.stringify({
              data: base64Data,
              type: 'audio',
              extension: 'webm',
            }),
          });

          const msgRes = await apiRequest<{ success: boolean; data: Message }>(`/salons/${activeSalonId}/messages`, {
            method: 'POST',
            body: JSON.stringify({
              content: '',
              mediaUrl: uploadRes.data.url,
              mediaType: 'audio',
              duration,
            }),
          });

          setMessages((prev) => [...prev, msgRes.data]);
        };
      } catch (err) {
        setNotice(err instanceof Error ? err.message : 'Échec lors de l’envoi du message vocal.');
      } finally {
        setSending(false);
      }
    };

    mediaRecorderRef.current.stop();
  };

  // Send message (text and/or image)
  const sendMessage = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    const text = content.trim();
    if (!activeSalonId || (!text && !selectedImage) || sending) return;

    try {
      setSending(true);
      let mediaUrl: string | undefined = undefined;

      if (selectedImage) {
        const ext = selectedImage.file.name.split('.').pop() || 'png';
        const uploadRes = await apiRequest<{ success: boolean; data: { url: string } }>('/upload', {
          method: 'POST',
          body: JSON.stringify({
            data: selectedImage.base64,
            type: 'image',
            extension: ext,
          }),
        });
        mediaUrl = uploadRes.data.url;
      }

      const res = await apiRequest<{ success: boolean; data: Message }>(`/salons/${activeSalonId}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          content: text,
          mediaUrl,
          mediaType: mediaUrl ? 'image' : undefined,
        }),
      });

      setMessages((prev) => [...prev, res.data]);
      setContent('');
      removeSelectedImage();
      setNotice('');
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Le message n’a pas pu être envoyé.');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

  const formatMessageTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    const time = new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);

    if (isToday) return `Aujourd'hui à ${time}`;

    const dateStr = new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'short',
    }).format(date);

    return `${dateStr} à ${time}`;
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center rounded-2xl bg-white border border-slate-200">
        <p className="text-sm text-slate-500 animate-pulse">Chargement de votre espace de discussion…</p>
      </div>
    );
  }

  if (salons.length === 0) {
    return (
      <div className="rounded-2xl border border-emerald-100 bg-white p-10 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
          <MessageCircle size={28} />
        </div>
        <h2 className="mt-4 text-xl font-bold text-slate-800">Aucune discussion active</h2>
        <p className="mt-2 max-w-md mx-auto text-sm text-slate-600">
          Échangez dans les salons de la communauté ou discutez en toute confidentialité en tête-à-tête avec vos amis.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => navigateTo('salons')}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 transition cursor-pointer"
          >
            <Sparkles size={16} /> Explorer les salons
          </button>
          <button
            type="button"
            onClick={() => setShowNewDirectModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#1f5943] px-5 py-2.5 text-sm font-bold text-white shadow-xs hover:bg-[#184634] transition cursor-pointer"
          >
            <Lock size={15} /> Démarrer un tête-à-tête
          </button>
        </div>
      </div>
    );
  }

  const groupSalons = salons.filter(
    (s) => !s.isDirect && (!sidebarFilter || s.name.toLowerCase().includes(sidebarFilter.toLowerCase()))
  );
  const directSalons = salons.filter(
    (s) =>
      s.isDirect &&
      (!sidebarFilter ||
        (s.directRecipient?.displayName || s.name).toLowerCase().includes(sidebarFilter.toLowerCase()) ||
        (s.directRecipient?.username || '').toLowerCase().includes(sidebarFilter.toLowerCase()))
  );

  return (
    <>
      {/* Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm animate-fadeIn"
          onClick={() => setLightboxImage(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/40 transition cursor-pointer"
          >
            <X size={20} />
          </button>
          <img
            src={lightboxImage}
            alt="Plein écran"
            className="max-h-[90vh] max-w-[95vw] rounded-xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* New Direct Chat Modal */}
      {showNewDirectModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-fadeIn"
          onClick={() => setShowNewDirectModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                  <Lock size={16} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Nouveau tête-à-tête</h3>
                  <p className="text-[11px] text-slate-500">Discussion 1-à-1 privée & confidentielle</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNewDirectModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Member search bar */}
            <div className="mt-4 relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher un membre par nom ou pseudo…"
                value={memberSearchQuery}
                onChange={(e) => setMemberSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs focus:bg-white focus:border-emerald-600 focus:outline-none"
              />
            </div>

            {/* Content: Friends or Search Results */}
            <div className="mt-4 max-h-72 overflow-y-auto space-y-2 pr-1">
              {memberSearchQuery.trim() ? (
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Résultats de recherche
                  </div>
                  {searchingMembers ? (
                    <div className="py-6 text-center text-xs text-slate-400 animate-pulse">
                      Recherche en cours…
                    </div>
                  ) : memberSearchResults.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-500">
                      Aucun membre trouvé pour « {memberSearchQuery} ».
                    </div>
                  ) : (
                    memberSearchResults.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 hover:bg-emerald-50/50 hover:border-emerald-200 transition"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1f5943] font-bold text-xs text-white shadow-xs">
                            {member.displayName.slice(0, 1).toUpperCase()}
                          </div>
                          <div className="min-w-0 truncate">
                            <div className="font-bold text-xs text-slate-900 truncate">{member.displayName}</div>
                            <div className="text-[10px] text-slate-500 truncate">@{member.username}</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => void startDirectChatWithUser(member.id)}
                          className="shrink-0 rounded-lg bg-[#1f5943] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#184634] shadow-2xs transition cursor-pointer"
                        >
                          Discuter
                        </button>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Mes amis
                  </div>
                  {loadingFriends ? (
                    <div className="py-6 text-center text-xs text-slate-400 animate-pulse">
                      Chargement des amis…
                    </div>
                  ) : friendsList.length === 0 ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
                      <p className="text-xs text-slate-600 font-medium">Vous n'avez pas encore d'amis connectés.</p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Utilisez la barre de recherche ci-dessus pour trouver un membre par son nom.
                      </p>
                    </div>
                  ) : (
                    friendsList.map((friend) => (
                      <div
                        key={friend.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white p-2.5 hover:bg-emerald-50/50 hover:border-emerald-200 transition"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="relative shrink-0">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1f5943] font-bold text-xs text-white shadow-2xs">
                              {friend.displayName.slice(0, 1).toUpperCase()}
                            </div>
                            <div className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 border border-white" />
                          </div>
                          <div className="min-w-0 truncate">
                            <div className="font-bold text-xs text-slate-900 truncate">{friend.displayName}</div>
                            <div className="text-[10px] text-slate-500 truncate">@{friend.username}</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => void startDirectChatWithUser(friend.id)}
                          className="shrink-0 rounded-lg bg-[#1f5943] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#184634] shadow-2xs transition cursor-pointer"
                        >
                          Discuter
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="h-[calc(100vh-140px)] min-h-[580px] rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col md:flex-row overflow-hidden animate-fadeIn">
        {/* Channels Sidebar */}
        <div className="w-full md:w-68 md:border-r border-slate-200 bg-[#f7f9f6] flex flex-col shrink-0">
          {/* Sidebar Top Search Filter */}
          <div className="p-3 border-b border-slate-200/80">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={sidebarFilter}
                onChange={(e) => setSidebarFilter(e.target.value)}
                placeholder="Filtrer salons ou amis…"
                className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-2.5 py-1.5 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-4">
            {/* Section 1: Direct Messages (Tête-à-tête) */}
            <div>
              <div className="flex items-center justify-between px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Lock size={12} className="text-emerald-700" />
                  Tête-à-tête ({directSalons.length})
                </span>
                <button
                  type="button"
                  onClick={() => setShowNewDirectModal(true)}
                  className="flex items-center gap-1 text-[10px] font-bold text-white bg-emerald-700 hover:bg-emerald-800 px-2 py-0.5 rounded-md transition cursor-pointer"
                  title="Démarrer un nouveau message direct"
                >
                  <Plus size={11} /> Nouveau
                </button>
              </div>

              {directSalons.length === 0 ? (
                <div className="px-2 py-3 rounded-xl border border-dashed border-slate-200 bg-white text-center">
                  <p className="text-[11px] text-slate-500">Aucun message direct.</p>
                  <button
                    type="button"
                    onClick={() => setShowNewDirectModal(true)}
                    className="mt-1 text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer"
                  >
                    + Lancer un tête-à-tête
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  {directSalons.map((salon) => {
                    const isSelected = salon.id === activeSalonId;
                    const recipientName = salon.directRecipient?.displayName || salon.name;
                    const initial = recipientName.slice(0, 1).toUpperCase();

                    return (
                      <button
                        key={salon.id}
                        type="button"
                        onClick={() => setActiveSalonId(salon.id)}
                        className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#1f5943] text-white shadow-sm'
                            : 'text-slate-700 hover:bg-slate-200/60'
                        }`}
                      >
                        <div className="relative shrink-0">
                          <div
                            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                              isSelected ? 'bg-white text-emerald-900 shadow-xs' : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {initial}
                          </div>
                          <div className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 border border-white" />
                        </div>
                        <div className="min-w-0 flex-1 truncate">
                          <div className="font-bold truncate">{recipientName}</div>
                          <div className={`text-[10px] truncate ${isSelected ? 'text-emerald-100' : 'text-slate-400'}`}>
                            @{salon.directRecipient?.username || 'direct'}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Section 2: Group Salons */}
            <div>
              <div className="flex items-center justify-between px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Hash size={12} className="text-emerald-700" />
                  Salons de groupe ({groupSalons.length})
                </span>
                <button
                  type="button"
                  onClick={() => navigateTo('salons')}
                  className="text-[10px] text-emerald-700 hover:underline cursor-pointer"
                  title="Explorer d'autres salons"
                >
                  Explorer
                </button>
              </div>

              {groupSalons.length === 0 ? (
                <div className="px-2 py-3 rounded-xl border border-dashed border-slate-200 bg-white text-center">
                  <p className="text-[11px] text-slate-500">Aucun salon de groupe rejoint.</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {groupSalons.map((salon) => {
                    const isSelected = salon.id === activeSalonId;
                    return (
                      <button
                        key={salon.id}
                        type="button"
                        onClick={() => setActiveSalonId(salon.id)}
                        className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs font-medium transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#1f5943] text-white shadow-sm'
                            : 'text-slate-700 hover:bg-slate-200/60'
                        }`}
                      >
                        <Hash size={15} className={isSelected ? 'text-white' : 'text-slate-400'} />
                        <div className="min-w-0 flex-1 truncate">
                          <div className="font-bold truncate">{salon.name}</div>
                          <div className={`text-[10px] truncate ${isSelected ? 'text-emerald-100' : 'text-slate-400'}`}>
                            {salon.members.length} participants
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="p-3 border-t border-slate-200 bg-white">
            <button
              type="button"
              onClick={() => navigateTo('salons')}
              className="w-full rounded-lg border border-slate-200 py-1.5 text-center text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              + Rejoindre un autre salon
            </button>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-white">
          {/* Chat Header */}
          <div className="h-14 border-b border-slate-200 px-5 flex items-center justify-between shrink-0 bg-white/80 backdrop-blur-sm">
            {activeSalon?.isDirect ? (
              /* Direct 1-on-1 Header */
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative shrink-0">
                  {activeSalon.directRecipient?.avatarUrl ? (
                    <img
                      src={activeSalon.directRecipient.avatarUrl}
                      alt=""
                      className="h-9 w-9 rounded-full object-cover shadow-xs"
                    />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1f5943] text-white font-bold text-sm shadow-xs">
                      {(activeSalon.directRecipient?.displayName || activeSalon.name).slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-white" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-slate-900 truncate">
                      {activeSalon.directRecipient?.displayName || activeSalon.name}
                    </h2>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                      <Lock size={10} /> Tête-à-tête privé
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate">
                    @{activeSalon.directRecipient?.username || 'utilisateur'} · <span className="text-emerald-700 font-medium">En ligne</span>
                  </p>
                </div>
              </div>
            ) : (
              /* Group Salon Header */
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs">
                  #
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-slate-900 truncate">
                    {activeSalon?.name ?? 'Discussion'}
                  </h2>
                  {activeSalon?.description && (
                    <p className="text-[11px] text-slate-500 truncate max-w-md">
                      {activeSalon.description}
                    </p>
                  )}
                </div>
              </div>
            )}

            {activeSalon?.isDirect ? (
              <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
                <ShieldCheck size={14} className="text-emerald-700" />
                <span className="hidden sm:inline">Confidentiel</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Users size={14} className="text-emerald-700" />
                <span>{activeSalon?.members.length ?? 0} membres</span>
              </div>
            )}
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/50">
            {loadingMessages ? (
              <div className="flex h-full items-center justify-center text-xs text-slate-400 animate-pulse">
                Chargement des messages…
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-slate-400">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 mb-2">
                  <MessageCircle size={22} className="text-slate-400" />
                </div>
                <p className="font-semibold text-slate-600">Aucun message pour l'instant</p>
                <p className="text-xs text-slate-400 max-w-xs mt-1">
                  Partagez une idée, envoyez une photo ou enregistrez un message vocal !
                </p>
              </div>
            ) : (
              messages.map((message, index) => {
                const isMe = message.author.id === user?.id;
                const prevMessage = messages[index - 1];
                const isSameAuthor = prevMessage && prevMessage.author.id === message.author.id;
                const initial = message.author.displayName.slice(0, 1).toUpperCase();

                return (
                  <div
                    key={message.id}
                    className={`flex gap-3 items-end ${isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isMe && (
                      message.author.avatarUrl ? (
                        <img
                          src={message.author.avatarUrl}
                          alt=""
                          className={`h-8 w-8 shrink-0 rounded-xl object-cover shadow-xs ${isSameAuthor ? 'invisible' : ''}`}
                        />
                      ) : (
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl font-bold text-xs shadow-xs ${
                            isSameAuthor ? 'invisible' : 'bg-[#1f5943] text-white'
                          }`}
                          title={message.author.displayName}
                        >
                          {initial}
                        </div>
                      )
                    )}

                    <div className={`max-w-[82%] sm:max-w-[70%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      {!isSameAuthor && (
                        <div className="flex items-center gap-2 mb-1 px-1">
                          <span className="text-[11px] font-bold text-slate-700">
                            {isMe ? 'Vous' : message.author.displayName}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {formatMessageTime(message.createdAt)}
                          </span>
                        </div>
                      )}

                      {/* Content rendering based on mediaType */}
                      {message.mediaType === 'audio' && message.mediaUrl ? (
                        <VoiceMessagePlayer
                          src={message.mediaUrl}
                          duration={message.duration}
                          isMe={isMe}
                        />
                      ) : message.mediaType === 'image' && message.mediaUrl ? (
                        <div
                          className={`rounded-2xl p-2 shadow-xs ${
                            isMe ? 'bg-[#1f5943] text-white rounded-br-xs' : 'bg-white border border-slate-200/80 rounded-bl-xs'
                          }`}
                        >
                          <div className="relative group overflow-hidden rounded-xl">
                            <img
                              src={normalizeMediaUrl(message.mediaUrl)}
                              alt="Photo partagée"
                              className="max-h-72 w-auto max-w-full rounded-xl object-cover cursor-pointer hover:opacity-90 transition"
                              onClick={() => setLightboxImage(normalizeMediaUrl(message.mediaUrl))}
                            />
                            <button
                              type="button"
                              onClick={() => setLightboxImage(normalizeMediaUrl(message.mediaUrl))}
                              className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-lg bg-black/60 text-white opacity-0 group-hover:opacity-100 transition cursor-pointer"
                              title="Agrandir"
                            >
                              <ZoomIn size={14} />
                            </button>
                          </div>
                          {message.content && (
                            <p className="mt-2 px-1 text-xs sm:text-sm whitespace-pre-wrap break-words">
                              {message.content}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div
                          className={`rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed shadow-xs break-words ${
                            isMe
                              ? 'bg-[#1f5943] text-white rounded-br-xs'
                              : 'bg-white border border-slate-200/80 text-slate-800 rounded-bl-xs'
                          }`}
                        >
                          {message.content}
                        </div>
                      )}
                    </div>

                    {isMe && (
                      user?.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt=""
                          className={`h-8 w-8 shrink-0 rounded-xl object-cover shadow-xs ${isSameAuthor ? 'invisible' : ''}`}
                        />
                      ) : (
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl font-bold text-xs bg-[#1f5943] text-white shadow-xs ${
                            isSameAuthor ? 'invisible' : ''
                          }`}
                          title="Vous"
                        >
                          {initial}
                        </div>
                      )
                    )}
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Image preview before sending */}
          {selectedImage && (
            <div className="p-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <img
                  src={selectedImage.previewUrl}
                  alt="Aperçu"
                  className="h-14 w-14 rounded-lg object-cover border border-slate-300"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 block truncate max-w-xs">
                    {selectedImage.file.name}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {(selectedImage.file.size / 1024).toFixed(1)} Ko · Prêt à être envoyé
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={removeSelectedImage}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-white transition cursor-pointer"
                title="Supprimer l'image"
              >
                <X size={18} />
              </button>
            </div>
          )}

          {/* Voice recording live toolbar */}
          {isRecording ? (
            <div className="p-4 border-t border-slate-200 bg-red-50/60 flex items-center justify-between gap-4 animate-fadeIn">
              <div className="flex items-center gap-3">
                <span className="flex h-4 w-4 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-red-600" />
                </span>
                <span className="text-xs font-bold text-red-900">
                  Enregistrement vocal en cours…
                </span>
                <span className="font-mono text-xs font-black text-red-700 bg-red-100 px-2 py-0.5 rounded-md">
                  {Math.floor(recordingDuration / 60)}:{String(recordingDuration % 60).padStart(2, '0')}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={cancelRecording}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-red-600 transition cursor-pointer"
                >
                  <Trash2 size={14} /> Annuler
                </button>
                <button
                  type="button"
                  onClick={() => void sendVoiceRecording()}
                  disabled={sending}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-emerald-800 transition cursor-pointer"
                >
                  <Send size={14} /> Envoyer le vocal
                </button>
              </div>
            </div>
          ) : (
            /* Standard input bar */
            <div className="p-3 sm:p-4 border-t border-slate-200 bg-white">
              {notice && (
                <p className="mb-2 text-xs text-red-600 bg-red-50 p-2 rounded-lg">{notice}</p>
              )}

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageSelect}
              />

              <form onSubmit={sendMessage} className="flex items-center gap-2">
                {/* Photo button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-emerald-700 transition cursor-pointer"
                  title="Envoyer une image"
                >
                  <ImageIcon size={19} />
                </button>

                {/* Voice record button */}
                <button
                  type="button"
                  onClick={() => void startRecording()}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition cursor-pointer"
                  title="Enregistrer un message vocal"
                >
                  <Mic size={19} />
                </button>

                {/* Text input */}
                <textarea
                  rows={1}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    selectedImage
                      ? 'Ajouter une légende à l’image… (Entrée pour envoyer)'
                      : activeSalon?.isDirect
                      ? `Écrire à ${activeSalon.directRecipient?.displayName || activeSalon.name} en privé… (Entrée pour envoyer)`
                      : `Écrire dans #${activeSalon?.name ?? 'discussion'}… (Entrée pour envoyer)`
                  }
                  className="flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 max-h-32"
                />

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={sending || (!content.trim() && !selectedImage)}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-white shadow transition hover:bg-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  title="Envoyer"
                >
                  <Send size={18} />
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
