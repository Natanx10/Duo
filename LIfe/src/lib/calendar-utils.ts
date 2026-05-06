/* ── Calendar helpers ── */
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addDays,
  format,
  isSameDay,
  parseISO,
} from "date-fns";
import { ptBR } from "date-fns/locale";

export const DAY_START_HOUR = 5;   // 05:00
export const DAY_END_HOUR = 22;    // 22:00 (last visible hour)
/** Default px per hour. Use density-aware helpers below for runtime values. */
export const HOUR_HEIGHT = 52;
export const TOTAL_HOURS = DAY_END_HOUR - DAY_START_HOUR;

/** Density modes that control vertical spacing of the day/week grid. */
export type CalendarDensity = "compact" | "comfortable";
export const DENSITY_HOUR_HEIGHT: Record<CalendarDensity, number> = {
  compact: 44,
  comfortable: 64,
};

const DENSITY_STORAGE_KEY = "duo:calendar-density";
export function loadCalendarDensity(): CalendarDensity {
  if (typeof window === "undefined") return "compact";
  const v = window.localStorage.getItem(DENSITY_STORAGE_KEY);
  return v === "comfortable" || v === "compact" ? v : "compact";
}
export function saveCalendarDensity(d: CalendarDensity) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DENSITY_STORAGE_KEY, d);
}
/** Highlighted business window for visual banding */
export const BUSINESS_START_HOUR = 8;
export const BUSINESS_END_HOUR = 18;

export const HOURS = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => DAY_START_HOUR + i);

export function getWeekDays(date: Date): Date[] {
  const start = startOfWeek(date, { weekStartsOn: 0 });
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function getMonthGrid(date: Date): Date[] {
  const start = startOfWeek(startOfMonth(date), { weekStartsOn: 0 });
  const end = endOfWeek(endOfMonth(date), { weekStartsOn: 0 });
  return eachDayOfInterval({ start, end });
}

export function fmt(date: Date | string, pattern: string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, pattern, { locale: ptBR });
}

export function eventTopOffset(start: Date, hourHeight: number = HOUR_HEIGHT): number {
  const minutes = (start.getHours() - DAY_START_HOUR) * 60 + start.getMinutes();
  return (minutes / 60) * hourHeight;
}

export function eventHeight(start: Date, end: Date, hourHeight: number = HOUR_HEIGHT): number {
  const minutes = (end.getTime() - start.getTime()) / 60000;
  return Math.max((minutes / 60) * hourHeight, 24);
}

export function isInDayRange(d: Date): boolean {
  return d.getHours() >= DAY_START_HOUR && d.getHours() <= DAY_END_HOUR;
}

export function eventsForDay<T extends { starts_at: string }>(events: T[], day: Date): T[] {
  return events
    .filter((e) => isSameDay(parseISO(e.starts_at), day))
    .sort((a, b) => parseISO(a.starts_at).getTime() - parseISO(b.starts_at).getTime());
}

export function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export const PRIORITY_LABELS = ["", "Normal", "Importante", "Urgente"];
export const PRESET_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e",
  "#f59e0b", "#10b981", "#06b6d4", "#3b82f6",
  "#14b8a6", "#a855f7", "#eab308",
];

export const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
export const WEEKDAY_FULL = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

/** Convert "HH:MM" or "HH:MM:SS" to fractional hours (e.g. "5:30" -> 5.5). */
export function timeToHours(t: string): number {
  const [h, m] = t.split(":");
  return Number(h) + Number(m ?? 0) / 60;
}

/** Top offset in px for a routine block on a given day. */
export function routineTopOffset(startTime: string, hourHeight: number = HOUR_HEIGHT): number {
  const hours = timeToHours(startTime) - DAY_START_HOUR;
  return Math.max(0, hours * hourHeight);
}

/** Height in px between two times. */
export function routineHeight(startTime: string, endTime: string, hourHeight: number = HOUR_HEIGHT): number {
  const s = timeToHours(startTime);
  const e = timeToHours(endTime);
  return Math.max((e - s) * hourHeight, 24);
}

/** Filter routines applicable to a given date (by weekday). */
export function routinesForDay<T extends { day_of_week: number }>(routines: T[], day: Date): T[] {
  return routines.filter((r) => r.day_of_week === day.getDay());
}

/** Format "HH:MM:SS" into "HH:MM". */
export function formatTime(t: string): string {
  return t.slice(0, 5);
}

/** Compute free-time stats for today given events + routines. */
export function freeMinutesToday(
  busyRanges: Array<{ start: Date; end: Date }>,
  windowStartHour = DAY_START_HOUR,
  windowEndHour = DAY_END_HOUR
): number {
  const totalMin = (windowEndHour - windowStartHour) * 60;
  const today = new Date();
  const winStart = new Date(today);
  winStart.setHours(windowStartHour, 0, 0, 0);
  const winEnd = new Date(today);
  winEnd.setHours(windowEndHour, 0, 0, 0);

  // Clip and merge ranges
  const ranges = busyRanges
    .map((r) => ({
      s: Math.max(r.start.getTime(), winStart.getTime()),
      e: Math.min(r.end.getTime(), winEnd.getTime()),
    }))
    .filter((r) => r.e > r.s)
    .sort((a, b) => a.s - b.s);

  let busyMin = 0;
  let cursor = winStart.getTime();
  for (const r of ranges) {
    const s = Math.max(r.s, cursor);
    if (r.e > s) {
      busyMin += (r.e - s) / 60000;
      cursor = r.e;
    }
  }
  return Math.max(0, Math.round(totalMin - busyMin));
}

/** Build today's busy ranges from events and routines. */
export function buildTodayBusyRanges(
  events: Array<{ starts_at: string; ends_at: string }>,
  routines: Array<{ day_of_week: number; start_time: string; end_time: string }>,
  today = new Date()
): Array<{ start: Date; end: Date }> {
  const dow = today.getDay();
  const fromRoutines = routines
    .filter((r) => r.day_of_week === dow)
    .map((r) => {
      const [sh, sm] = r.start_time.split(":").map(Number);
      const [eh, em] = r.end_time.split(":").map(Number);
      const s = new Date(today); s.setHours(sh, sm ?? 0, 0, 0);
      const e = new Date(today); e.setHours(eh, em ?? 0, 0, 0);
      return { start: s, end: e };
    });
  const fromEvents = events
    .filter((e) => {
      const s = new Date(e.starts_at);
      return s.getFullYear() === today.getFullYear()
        && s.getMonth() === today.getMonth()
        && s.getDate() === today.getDate();
    })
    .map((e) => ({ start: new Date(e.starts_at), end: new Date(e.ends_at) }));
  return [...fromRoutines, ...fromEvents];
}

/** Detect if a new event range conflicts with existing events or routines on the same date. */
export function detectConflicts(
  start: Date,
  end: Date,
  events: Array<{ id: string; title: string; starts_at: string; ends_at: string }>,
  routines: Array<{ id: string; title: string; day_of_week: number; start_time: string; end_time: string }>
): Array<{ kind: "event" | "routine"; id: string; title: string }> {
  const conflicts: Array<{ kind: "event" | "routine"; id: string; title: string }> = [];
  const dayStart = new Date(start); dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(start); dayEnd.setHours(23, 59, 59, 999);

  for (const e of events) {
    const es = new Date(e.starts_at);
    const ee = new Date(e.ends_at);
    if (es < dayEnd && ee > dayStart && es < end && ee > start) {
      conflicts.push({ kind: "event", id: e.id, title: e.title });
    }
  }
  const dow = start.getDay();
  for (const r of routines) {
    if (r.day_of_week !== dow) continue;
    const [sh, sm] = r.start_time.split(":").map(Number);
    const [eh, em] = r.end_time.split(":").map(Number);
    const rs = new Date(start); rs.setHours(sh, sm ?? 0, 0, 0);
    const re = new Date(start); re.setHours(eh, em ?? 0, 0, 0);
    if (rs < end && re > start) {
      conflicts.push({ kind: "routine", id: r.id, title: r.title });
    }
  }
  return conflicts;
}
