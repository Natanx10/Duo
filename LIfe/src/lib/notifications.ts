/**
 * Web Notifications (push local) — funciona no app publicado em HTTPS,
 * com permissão concedida pelo usuário. Não depende de Service Worker
 * para notificações enquanto a aba está aberta.
 *
 * Para um lembrete recorrente diário (HH:MM em dias da semana),
 * agendamos o próximo disparo via setTimeout. Quando dispara,
 * reagendamos para o próximo. Persistimos nada além de localStorage
 * para feedback de "permissão pedida".
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

function fire(reminder: ScheduledReminder) {
  if (!isNotificationSupported() || Notification.permission !== "granted") return;
  try {
    const n = new Notification(reminder.title, {
      body: reminder.body ?? "Lembrete do Duo",
      tag: `reminder-${reminder.id}`,
      silent: false,
    });
    // auto-close após 10s para não acumular
    window.setTimeout(() => n.close(), 10_000);
  } catch {
    /* ignore */
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

  // Math.min para não estourar setTimeout (~24.8 dias). Reagendamos a cada disparo.
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
  for (const r of reminders) scheduleReminder(r);
}
