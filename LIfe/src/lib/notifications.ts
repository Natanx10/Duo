/**
 * Web Notifications (local push) for the published HTTPS app.
 *
 * Hybrid strategy:
 * 1. setTimeout for notifications while the app is open.
 * 2. Service Worker showNotification for better background support.
 * 3. Persist reminders in localStorage to reschedule after reload.
 * 4. Reschedule when the tab becomes visible again.
 */

export type ScheduledReminder = {
  id: string;
  title: string;
  body?: string;
  /** "HH:MM" 24h, local time */
  remindTime?: string | null;
  /** days 0..6 (sun..sat). Empty/undefined means every day */
  daysOfWeek?: number[] | null;
  /** ISO datetime for one-shot reminders */
  remindAt?: string | null;
};

const TIMERS = new Map<string, number>();
const STORAGE_KEY = "duo:scheduled-reminders";
const NOTIFICATION_ICON = "/pwa-192x192.png";
const NOTIFICATION_BADGE = "/pwa-192x192.png";
const DEFAULT_NOTIFICATION_TITLE = "Lembrete do Duo";
const DEFAULT_NOTIFICATION_BODY = "Você tem um compromisso agendado.";

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
      console.warn("VAPID public key nao configurada.");
      return null;
    }

    const padding = "=".repeat((4 - publicKey.length % 4) % 4);
    const base64 = (publicKey + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: outputArray,
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

  const title = reminder.title?.trim() || DEFAULT_NOTIFICATION_TITLE;
  const body = reminder.body?.trim() || DEFAULT_NOTIFICATION_BODY;

  try {
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        body,
        tag: `reminder-${reminder.id}`,
        icon: NOTIFICATION_ICON,
        badge: NOTIFICATION_BADGE,
        vibrate: [120, 60, 120],
        requireInteraction: true,
        renotify: true,
        silent: false,
        timestamp: Date.now(),
        data: {
          reminderId: reminder.id,
          url: "/calendar",
        },
      } as NotificationOptions);
      return;
    }
  } catch {
    // Fallback to basic Notification below.
  }

  try {
    const n = new Notification(title, {
      body,
      tag: `reminder-${reminder.id}`,
      icon: NOTIFICATION_ICON,
      badge: NOTIFICATION_BADGE,
      silent: false,
    });
    window.setTimeout(() => n.close(), 15_000);
  } catch {
    /* ignore */
  }
}

function persistReminders(reminders: ScheduledReminder[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
  } catch {
    /* ignore */
  }
}

function loadPersistedReminders(): ScheduledReminder[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
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

export function rescheduleFromStorage() {
  const reminders = loadPersistedReminders();
  if (reminders.length > 0) {
    clearAllScheduledReminders();
    for (const r of reminders) scheduleReminder(r);
  }
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      rescheduleFromStorage();
    }
  });
}
