/**
 * Web Notifications (push local) — funciona no app publicado em HTTPS,
 * com permissão concedida pelo usuário.
 *
 * Estratégia híbrida:
 * 1. setTimeout para notificações enquanto a aba está aberta
 * 2. Service Worker showNotification para melhor compatibilidade
 * 3. Persiste lembretes no localStorage para re-agendar ao reabrir a aba
 * 4. Usa visibilitychange para reagendar quando a aba volta ao foco
 */

export type ScheduledReminder = {
  id: string;
  title: string;
  body?: string;
  /** "HH:MM" 24h, hora local */
  remindTime?: string | null;
  /** dias 0..6 (dom..sáb). Se vazio/undefined => todos os dias */
  daysOfWeek?: number[] | null;
  /** ISO datetime (uso single-shot) */
  remindAt?: string | null;
};

const TIMERS = new Map<string, number>();
const STORAGE_KEY = "duo:scheduled-reminders";

export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (!isNotificationSupported()) return "unsupported";
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!isNotificationSupported()) return "unsupported";
  if (Notification.permission === "granted" || Notification.permission === "denied") {
    return Notification.permission;
  }
  try {
    const result = await Notification.requestPermission();
    return result;
  } catch {
    return "denied";
  }
}

export async function subscribeToPushNotifications(userId: string) {
  if (!isNotificationSupported() || !("serviceWorker" in navigator)) return null;
  
  try {
    const permission = await requestNotificationPermission();
    if (permission !== "granted") return null;

    const registration = await navigator.serviceWorker.ready;
    const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    if (!publicKey) {
      console.warn("VAPID public key não configurada.");
      return null;
    }

    // Convert Base64URL string to Uint8Array
    const padding = '='.repeat((4 - publicKey.length % 4) % 4);
    const base64 = (publicKey + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: outputArray
    });

    const { savePushSubscription } = await import("./data");
    await savePushSubscription(userId, subscription);
    return subscription;
  } catch (error) {
    console.error("Erro ao assinar push notifications:", error);
    return null;
  }
}

function nextOccurrence(time: string, days?: number[] | null): Date | null {
  const [hh, mm] = time.split(":").map((n) => parseInt(n, 10));
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  const allowed = days && days.length > 0 ? new Set(days) : new Set([0, 1, 2, 3, 4, 5, 6]);
  const now = new Date();
  for (let offset = 0; offset < 8; offset++) {
    const d = new Date(now);
    d.setDate(now.getDate() + offset);
    d.setHours(hh, mm, 0, 0);
    if (d.getTime() <= now.getTime()) continue;
    if (allowed.has(d.getDay())) return d;
  }
  return null;
}

export function clearScheduledReminder(id: string) {
  const t = TIMERS.get(id);
  if (t !== undefined) {
    window.clearTimeout(t);
    TIMERS.delete(id);
  }
}

export function clearAllScheduledReminders() {
  for (const t of TIMERS.values()) window.clearTimeout(t);
  TIMERS.clear();
}

async function fire(reminder: ScheduledReminder) {
  if (!isNotificationSupported() || Notification.permission !== "granted") return;
  
  try {
    // Prefer Service Worker notification (works even when tab is in background)
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(reminder.title, {
        body: reminder.body ?? "Lembrete do Duo 💜",
        tag: `reminder-${reminder.id}`,
        icon: "/pwa-192x192.png",
        badge: "/pwa-192x192.png",
        vibrate: [200, 100, 200],
        requireInteraction: true,
      });
      return;
    }
  } catch {
    // fallback to basic Notification
  }
  
  try {
    const n = new Notification(reminder.title, {
      body: reminder.body ?? "Lembrete do Duo 💜",
      tag: `reminder-${reminder.id}`,
      silent: false,
    });
    window.setTimeout(() => n.close(), 15_000);
  } catch {
    /* ignore */
  }
}

/** Persist reminders to localStorage so they survive page reloads */
function persistReminders(reminders: ScheduledReminder[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
  } catch { /* ignore */ }
}

/** Load persisted reminders from localStorage */
function loadPersistedReminders(): ScheduledReminder[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

export function scheduleReminder(reminder: ScheduledReminder) {
  if (!isNotificationSupported() || Notification.permission !== "granted") return;
  clearScheduledReminder(reminder.id);

  let target: Date | null = null;
  if (reminder.remindTime) {
    target = nextOccurrence(reminder.remindTime, reminder.daysOfWeek);
  } else if (reminder.remindAt) {
    const d = new Date(reminder.remindAt);
    if (d.getTime() > Date.now()) target = d;
  }
  if (!target) return;

  const delay = Math.min(target.getTime() - Date.now(), 2_000_000_000);
  const handle = window.setTimeout(() => {
    fire(reminder);
    // se for recorrente (tem remindTime), reagenda
    if (reminder.remindTime) scheduleReminder(reminder);
    else clearScheduledReminder(reminder.id);
  }, delay);
  TIMERS.set(reminder.id, handle);
}

export function scheduleAll(reminders: ScheduledReminder[]) {
  clearAllScheduledReminders();
  persistReminders(reminders);
  for (const r of reminders) scheduleReminder(r);
}

/** Re-schedule reminders from localStorage (call on page load/visibility change) */
export function rescheduleFromStorage() {
  const reminders = loadPersistedReminders();
  if (reminders.length > 0) {
    clearAllScheduledReminders();
    for (const r of reminders) scheduleReminder(r);
  }
}

// Auto re-schedule when tab becomes visible again
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      rescheduleFromStorage();
    }
  });
}
