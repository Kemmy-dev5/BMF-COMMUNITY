/**
 * Notification Signal Utility for Mobile and Desktop
 * - Physical Phone Vibration via navigator.vibrate()
 * - Elegant Web Audio chime tone (no external MP3 asset dependency)
 * - Native System Web Notification (Service Worker or Notification API)
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!audioCtx) {
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    void audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Play a crisp, gentle double-chime notification sound using Web Audio API synthesis
 */
export function playNotificationSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // First bell tone (high chime: 784Hz / G5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(783.99, now);
    gain1.gain.setValueAtTime(0.25, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.36);

    // Second bell tone slightly higher (1046.5Hz / C6) after 100ms
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1046.5, now + 0.1);
    gain2.gain.setValueAtTime(0.3, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.56);
  } catch (err) {
    console.warn('Notification audio playback failed:', err);
  }
}

/**
 * Trigger physical device vibration on mobile smartphones
 * Pattern: vibrate 200ms, pause 100ms, vibrate 250ms, pause 80ms, vibrate 300ms
 */
export function vibratePhone(pattern: number[] = [200, 100, 250, 80, 300]) {
  try {
    if (typeof window !== 'undefined' && 'vibrate' in navigator && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern);
      return true;
    }
  } catch (err) {
    console.warn('Vibration not supported or failed:', err);
  }
  return false;
}

/**
 * Request notification permissions from the user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch {
    return Notification.permission;
  }
}

/**
 * Signal the phone with full sensory alert:
 * 1. Physical phone vibration
 * 2. Gentle audible notification sound
 * 3. System mobile notification (via Service Worker or Notification API)
 */
export async function signalPhoneNotification(options: {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, unknown>;
}) {
  // 1. Phone vibration
  vibratePhone([250, 120, 250, 120, 350]);

  // 2. Play acoustic chime
  playNotificationSound();

  // 3. System Push / Web Notification
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        if (registration && registration.showNotification) {
          await registration.showNotification(options.title, {
            body: options.body,
            icon: options.icon || '/icons/icon-192.png',
            badge: options.badge || '/icons/icon-192.png',
            vibrate: [250, 120, 250, 120, 350],
            tag: 'bmf-notification',
            renotify: true,
            data: options.data,
          } as NotificationOptions);
          return;
        }
      }

      // Fallback to desktop / mobile Notification constructor
      new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/icons/icon-192.png',
        badge: options.badge || '/icons/icon-192.png',
      });
    } catch (err) {
      console.warn('System notification display failed:', err);
    }
  }
}
