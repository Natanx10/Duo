import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addDays, addMonths, addWeeks, endOfMonth, endOfWeek, isSameDay, isSameMonth,
  isToday, parseISO, startOfMonth, startOfWeek, subDays, subMonths, subWeeks,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Loader2, Heart, CheckSquare } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  createRoutineException, deleteRoutine,
  updateEvent, updateRoutine, updateTodo,
  type Category, type EventRow, type Profile, type Routine, type RoutineException, type Todo,
} from "@/lib/data";
import { 
  useProfile, usePartnerProfile, useEvents, useTodosInRange, useCategories, 
  useRoutines, useRoutineExceptions, useApiMutation, QUERY_KEYS 
} from "@/hooks/useData";
import { useQueryClient } from "@tanstack/react-query";
import {
  BUSINESS_END_HOUR, BUSINESS_START_HOUR, DAY_END_HOUR, DAY_START_HOUR, HOURS,
  DENSITY_HOUR_HEIGHT, type CalendarDensity, loadCalendarDensity,
  eventHeight, eventTopOffset, eventsForDay, fmt, formatTime, getMonthGrid,
  getWeekDays, routineHeight, routineTopOffset, routinesForDay,
  WEEKDAY_LABELS,
} from "@/lib/calendar-utils";
import {
  useUiPrefs, particleVars, animClass, loadImportantTaskAnim, loadImportantEventAnim, loadCoupleAnim,
  loadDayZoom, loadWeekZoom, saveDayZoom, saveWeekZoom, DAY_ZOOM_MIN, DAY_ZOOM_MAX, WEEK_ZOOM_MIN, WEEK_ZOOM_MAX,
} from "@/lib/ui-prefs";
import { resolveItemEffective, shouldShowTuner } from "@/components/InlineParticleTuner";
import { EventDialog } from "@/components/EventDialog";
import { RoutineDialog } from "@/components/RoutineDialog";
import { TodoDialog } from "@/routes/_app.todos";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

type ViewMode = "day" | "week" | "month";
const LONG_PRESS_DRAG_DELAY_MS = 520;
const LONG_PRESS_MOVE_TOLERANCE_PX = 10;

/** Unified item rendered on the calendar grid (event or scheduled todo). */
export type CalendarItem = {
  id: string;
  kind: "event" | "todo";
  title: string;
  starts_at: string;
  ends_at: string;
  category_id: string | null;
  is_shared: boolean;
  priority: number;
  is_completed?: boolean;
  user_id: string | null;
  raw: EventRow | Todo;
};

function normalizeText(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function inferItemOwnerSide(
  item: CalendarItem,
  categories: Category[],
  userId: string | null,
  partnerId: string | null,
  mine: Profile | null,
  partner: Profile | null,
): "mine" | "partner" | "unknown" {
  if (item.user_id && partnerId && item.user_id === partnerId) return "partner";
  if (item.user_id && userId && item.user_id === userId) return "mine";

  const title = normalizeText(item.title);
  const mineName = normalizeText(mine?.display_name);
  const partnerName = normalizeText(partner?.display_name);
  if (partnerName && title.includes(partnerName)) return "partner";
  if (mineName && title.includes(mineName)) return "mine";

  const category = categories.find((c) => c.id === item.category_id);
  const categoryName = normalizeText(category?.name);
  if (partnerName && categoryName.includes(partnerName)) return "partner";
  if (mineName && categoryName.includes(mineName)) return "mine";

  const categoryColor = (category?.color ?? "").toLowerCase();
  const mineColor = (mine?.color ?? "").toLowerCase();
  const partnerColor = (partner?.color ?? "").toLowerCase();
  if (categoryColor && partnerColor && categoryColor === partnerColor) return "partner";
  if (categoryColor && mineColor && categoryColor === mineColor) return "mine";

  return "unknown";
}

function capitalizeFirst(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDayHeader(date: Date): string {
  const weekday = capitalizeFirst(fmt(date, "EEEE").replace(/-feira$/i, ""));
  const month = capitalizeFirst(fmt(date, "MMMM"));
  return `${weekday}, ${fmt(date, "dd")}/${month}`;
}

function timeStringToMinutes(time: string): number {
  const [h = "0", m = "0"] = time.split(":");
  return Number(h) * 60 + Number(m);
}

function minutesToTimeString(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, totalMinutes));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
}

function snapDeltaMinutes(deltaY: number, hourHeight: number): number {
  return Math.round((deltaY / hourHeight) * 2) * 30;
}

function findCalendarColumnFromPoint(clientX: number, clientY: number): HTMLElement | null {
  const columns = Array.from(document.querySelectorAll<HTMLElement>("[data-calendar-day]"));
  const directHit = columns.find((column) => {
    const rect = column.getBoundingClientRect();
    return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
  });
  if (directHit) return directHit;

  const el = document.elementFromPoint(clientX, clientY);
  return el?.closest<HTMLElement>("[data-calendar-day]") ?? null;
}

function calendarDropFromPoint(clientX: number, clientY: number, hourHeight: number): { day: Date; hour: number; minute: number } | null {
  const column = findCalendarColumnFromPoint(clientX, clientY);
  const iso = column?.dataset.calendarDay;
  if (!column || !iso) return null;
  const rect = column.getBoundingClientRect();
  const y = Math.max(0, Math.min(rect.height, clientY - rect.top));
  const snapped = snapDeltaMinutes(y, hourHeight);
  const total = Math.max(DAY_START_HOUR * 60, Math.min((DAY_END_HOUR + 1) * 60 - 30, DAY_START_HOUR * 60 + snapped));
  return {
    day: new Date(iso),
    hour: Math.floor(total / 60),
    minute: total % 60,
  };
}

function routineOwnerSide(
  routine: Routine,
  userId: string | null,
  partnerId: string | null,
  mine: Profile | null,
  partner: Profile | null,
): "mine" | "partner" {
  const ownerId = (routine as any).user_id ?? null;
  if (ownerId && partnerId && ownerId === partnerId) return "partner";
  if (ownerId && userId && ownerId === userId) return "mine";

  const title = normalizeText((routine as any).title);
  const mineName = normalizeText(mine?.display_name);
  const partnerName = normalizeText(partner?.display_name);
  if (partnerName && title.includes(partnerName)) return "partner";
  if (mineName && title.includes(mineName)) return "mine";

  const routineColor = ((routine as any).color ?? "").toLowerCase();
  const mineColor = (mine?.color ?? "").toLowerCase();
  const partnerColor = (partner?.color ?? "").toLowerCase();
  if (routineColor && partnerColor && routineColor === partnerColor) return "partner";
  if (routineColor && mineColor && routineColor === mineColor) return "mine";

  if (/\blayslla\b/.test(title)) return "partner";
  if (/\bnat[aã]\b|\bnata\b/.test(title)) return "mine";

  return "mine";
}

type LaneLayout = { lane: number; laneCount: number };

function itemsOverlap(a: CalendarItem, b: CalendarItem): boolean {
  const aStart = new Date(a.starts_at).getTime();
  const aEnd = new Date(a.ends_at).getTime();
  const bStart = new Date(b.starts_at).getTime();
  const bEnd = new Date(b.ends_at).getTime();
  return aStart < bEnd && aEnd > bStart;
}

function splitPersonalItemsBySide(
  dayItems: CalendarItem[],
  categories: Category[],
  userId: string | null,
  partnerId: string | null,
  mineProfile: Profile | null,
  partnerProfile: Profile | null,
): { mine: CalendarItem[]; partner: CalendarItem[]; shared: CalendarItem[] } {
  const shared: CalendarItem[] = [];
  const mine: CalendarItem[] = [];
  const partner: CalendarItem[] = [];
  const unknown: CalendarItem[] = [];

  for (const item of dayItems) {
    const side = inferItemOwnerSide(item, categories, userId, partnerId, mineProfile, partnerProfile);
    if (item.is_shared && item.kind === "todo") {
      shared.push(item);
    } else if (item.is_shared && item.kind === "event" && side === "unknown") {
      unknown.push(item);
    } else if (side === "mine") mine.push(item);
    else if (side === "partner") partner.push(item);
    else unknown.push(item);
  }

  for (const item of unknown.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())) {
    const mineConflicts = mine.filter((it) => itemsOverlap(it, item)).length;
    const partnerConflicts = partner.filter((it) => itemsOverlap(it, item)).length;
    if (partnerConflicts < mineConflicts) {
      partner.push(item);
    } else if (mineConflicts < partnerConflicts) {
      mine.push(item);
    } else if (partner.length < mine.length) {
      partner.push(item);
    } else {
      mine.push(item);
    }
  }

  return { mine, partner, shared };
}

function buildLaneLayout(items: CalendarItem[]): Map<string, LaneLayout> {
  const map = new Map<string, LaneLayout>();
  if (items.length <= 1) {
    items.forEach((it) => map.set(it.id, { lane: 0, laneCount: 1 }));
    return map;
  }

  const sorted = [...items].sort((a, b) => {
    const sa = new Date(a.starts_at).getTime();
    const sb = new Date(b.starts_at).getTime();
    if (sa !== sb) return sa - sb;
    return new Date(a.ends_at).getTime() - new Date(b.ends_at).getTime();
  });

  let group: CalendarItem[] = [];
  let groupMaxEnd = -Infinity;
  const flushGroup = () => {
    if (group.length === 0) return;
    const laneEnds: number[] = [];
    const laneById = new Map<string, number>();
    let maxLanes = 0;
    for (const it of group) {
      const s = new Date(it.starts_at).getTime();
      const e = new Date(it.ends_at).getTime();
      let lane = laneEnds.findIndex((end) => end <= s);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(e);
      } else {
        laneEnds[lane] = e;
      }
      laneById.set(it.id, lane);
      maxLanes = Math.max(maxLanes, laneEnds.length);
    }
    for (const it of group) {
      map.set(it.id, { lane: laneById.get(it.id) ?? 0, laneCount: Math.max(1, maxLanes) });
    }
    group = [];
    groupMaxEnd = -Infinity;
  };

  for (const it of sorted) {
    const s = new Date(it.starts_at).getTime();
    const e = new Date(it.ends_at).getTime();
    if (group.length === 0) {
      group = [it];
      groupMaxEnd = e;
      continue;
    }
    if (s < groupMaxEnd) {
      group.push(it);
      groupMaxEnd = Math.max(groupMaxEnd, e);
    } else {
      flushGroup();
      group = [it];
      groupMaxEnd = e;
    }
  }
  flushGroup();
  return map;
}

function todoToCalendarItem(t: Todo): CalendarItem {
  const start = new Date(t.due_at!);
  const end = new Date(start.getTime() + (t.duration_minutes ?? 30) * 60_000);
  const isShared = Boolean((t as any).is_shared);
  return {
    id: `todo-${t.id}`,
    kind: "todo",
    title: t.title,
    starts_at: start.toISOString(),
    ends_at: end.toISOString(),
    category_id: t.category_id,
    is_shared: isShared,
    priority: t.priority,
    is_completed: t.is_completed,
    user_id: (t as any).user_id ?? null,
    raw: t,
  };
}

function eventToCalendarItem(e: EventRow): CalendarItem {
  return {
    id: `event-${e.id}`,
    kind: "event",
    title: e.title,
    starts_at: e.starts_at,
    ends_at: e.ends_at,
    category_id: e.category_id,
    is_shared: e.is_shared,
    priority: e.priority,
    user_id: (e as any).user_id ?? null,
    raw: e,
  };
}

export const Route = createFileRoute("/_app/calendar")({
  component: CalendarPage,
  head: () => ({ meta: [{ title: "Agenda - Duo" }] }),
});

function CalendarPage() {
  const { user } = useAuth();
  const ui = useUiPrefs();
  const [view, setView] = useState<ViewMode>("day");
  const [density, setDensity] = useState<CalendarDensity>("compact");
  // Zoom multiplier â€” funciona em dia E semana (pinch / ctrl+wheel) â€” persistido em localStorage
  const [weekZoom, _setWeekZoom] = useState<number>(() => (typeof window === "undefined" ? 1 : loadWeekZoom()));
  const [dayZoom, _setDayZoom]   = useState<number>(() => (typeof window === "undefined" ? 1 : loadDayZoom()));
  const setWeekZoom: React.Dispatch<React.SetStateAction<number>> = (v) => {
    _setWeekZoom((prev) => {
      const next = typeof v === "function" ? (v as (p: number) => number)(prev) : v;
      const clamped = Math.min(WEEK_ZOOM_MAX, Math.max(WEEK_ZOOM_MIN, next));
      saveWeekZoom(clamped);
      return clamped;
    });
  };
  const setDayZoom: React.Dispatch<React.SetStateAction<number>> = (v) => {
    _setDayZoom((prev) => {
      const next = typeof v === "function" ? (v as (p: number) => number)(prev) : v;
      const clamped = Math.min(DAY_ZOOM_MAX, Math.max(DAY_ZOOM_MIN, next));
      saveDayZoom(clamped);
      return clamped;
    });
  };
  const baseHourHeight = DENSITY_HOUR_HEIGHT[density];
  const hourHeight =
    view === "week" ? Math.max(16, Math.round(baseHourHeight * weekZoom)) :
    view === "day"  ? Math.max(14, Math.round(baseHourHeight * dayZoom))  :
    baseHourHeight;
  const [cursor, setCursor] = useState<Date>(new Date());
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [todoDialogOpen, setTodoDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any | null>(null);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);
  const [presetDate, setPresetDate] = useState<Date | undefined>();
  const [presetHour, setPresetHour] = useState<number | undefined>();
  const [routineActionDialog, setRoutineActionDialog] = useState<{ routine: any; date: Date } | null>(null);
  const [routineDialogOpen, setRoutineDialogOpen] = useState(false);

  const range = useMemo(() => {
    if (view === "day") return { start: cursor, end: cursor };
    if (view === "week") {
      const s = startOfWeek(cursor, { weekStartsOn: 0 });
      return { start: s, end: endOfWeek(cursor, { weekStartsOn: 0 }) };
    }
    return {
      start: startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 }),
      end: endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 }),
    };
  }, [view, cursor]);

  const startISO = useMemo(() => new Date(new Date(range.start).setHours(0, 0, 0, 0)).toISOString(), [range]);
  const endISO = useMemo(() => new Date(new Date(range.end).setHours(23, 59, 59, 999)).toISOString(), [range]);

  const { data: profile } = useProfile(user?.id);
  const { data: partnerProfile } = usePartnerProfile(profile?.couple_id, user?.id);
  const coupleId = profile?.couple_id ?? null;
  const { data: rawEvents = [], error: eventsError } = useEvents(startISO, endISO, coupleId, user?.id);
  const { data: rawTodos = [], error: todosError } = useTodosInRange(startISO, endISO, coupleId, user?.id);
  const { data: routines = [], error: routinesError } = useRoutines(coupleId, user?.id);
  const { data: routineExceptions = [], error: routineExceptionsError } = useRoutineExceptions(coupleId, user?.id);
  const { data: categories = [] } = useCategories(coupleId, user?.id);

  const loading = !profile && !!user;
  const dataError = eventsError || todosError || routinesError || routineExceptionsError;

  useEffect(() => {
    if (!dataError) return;
    const msg = dataError instanceof Error ? dataError.message : "Falha ao carregar dados da agenda";
    toast.error(msg);
  }, [dataError]);

  const items = useMemo(() => [
    ...rawEvents.map(eventToCalendarItem),
    ...rawTodos.map(todoToCalendarItem)
  ], [rawEvents, rawTodos]);

  const updateEventMutation = useApiMutation(
    ({ id, payload }: { id: string; payload: any }) => updateEvent(id, payload),
    [QUERY_KEYS.events]
  );

  const updateTodoMutation = useApiMutation(
    ({ id, payload }: { id: string; payload: any }) => updateTodo(id, payload),
    [QUERY_KEYS.todos]
  );

  const updateRoutineMutation = useApiMutation(
    ({ id, payload }: { id: string; payload: any }) => updateRoutine(id, payload),
    [QUERY_KEYS.routines]
  );

  const skipRoutineMutation = useApiMutation(
    ({ routineId, userId, date }: { routineId: string; userId: string; date: Date }) => createRoutineException(routineId, userId, date),
    [QUERY_KEYS.routineExceptions]
  );

  const deleteRoutineMutation = useApiMutation(
    (id: string) => deleteRoutine(id),
    [QUERY_KEYS.routines]
  );



  // Load + sync density preference from localStorage (controlled in /profile).
  useEffect(() => {
    setDensity(loadCalendarDensity());
    const onStorage = (e: StorageEvent) => {
      if (e.key === "duo:calendar-density") setDensity(loadCalendarDensity());
    };
    const onCustom = () => setDensity(loadCalendarDensity());
    window.addEventListener("storage", onStorage);
    window.addEventListener("duo:density-change", onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("duo:density-change", onCustom);
    };
  }, []);

  const navigate = (dir: 1 | -1) => {
    if (view === "day") setCursor((c) => (dir > 0 ? addDays(c, 1) : subDays(c, 1)));
    else if (view === "week") setCursor((c) => (dir > 0 ? addWeeks(c, 1) : subWeeks(c, 1)));
    else setCursor((c) => (dir > 0 ? addMonths(c, 1) : subMonths(c, 1)));
  };

  const headerLabel = useMemo(() => {
    if (view === "day") return formatDayHeader(cursor);
    if (view === "week") {
      const s = startOfWeek(cursor, { weekStartsOn: 0 });
      const e = endOfWeek(cursor, { weekStartsOn: 0 });
      return `${fmt(s, "dd MMM")} - ${fmt(e, "dd MMM")}`;
    }
    return fmt(cursor, "MMMM yyyy");
  }, [view, cursor]);
  const showTodayLabel = view === "day"
    ? isToday(cursor)
    : view === "week"
      ? getWeekDays(cursor).some(isToday)
      : false;

  const openCreate = (date?: Date, hour?: number) => {
    setTodoDialogOpen(false);
    setEditingEvent(null);
    setEditingTodo(null);
    setPresetDate(date);
    setPresetHour(hour);
    setDialogOpen(true);
  };

  const openTodoCreate = () => {
    setDialogOpen(false);
    setEditingEvent(null);
    setEditingTodo(null);
    setTodoDialogOpen(true);
  };

  const handleEventDialogChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      // Clear edit state when closing so next open is clean
      setEditingEvent(null);
      setEditingTodo(null);
      setPresetDate(undefined);
      setPresetHour(undefined);
    }
  };

  const openItem = async (item: CalendarItem) => {
    if (item.kind === "event") {
      setTodoDialogOpen(false);
      setEditingEvent(item.raw as any);
      setEditingTodo(null);
      setPresetDate(undefined);
      setPresetHour(undefined);
      setDialogOpen(true);
    } else {
      setDialogOpen(false);
      setEditingEvent(null);
      setEditingTodo(item.raw as Todo);
      setTodoDialogOpen(true);
    }
  };

  /** Reschedule an item (event or todo) to a new day + hour (with optional minute offset). */
  const rescheduleItem = async (item: CalendarItem, targetDay: Date, targetHour: number, targetMinute = 0) => {
    try {
      const oldStart = parseISO(item.starts_at);
      const oldEnd = parseISO(item.ends_at);
      const durationMs = oldEnd.getTime() - oldStart.getTime();
      const newStart = new Date(targetDay);
      newStart.setHours(targetHour, targetMinute, 0, 0);
      const newEnd = new Date(newStart.getTime() + durationMs);

      if (item.kind === "event") {
        const ev = item.raw as any;
        await updateEventMutation.mutateAsync({
          id: ev.id,
          payload: { starts_at: newStart.toISOString(), ends_at: newEnd.toISOString() }
        });
      } else {
        const td = item.raw as any;
        await updateTodoMutation.mutateAsync({
          id: td.id,
          payload: { due_at: newStart.toISOString() }
        });
      }
      toast.success("Reagendado para " + fmt(newStart, "dd/MM HH:mm"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao reagendar");
    }
  };

  const resizeItem = async (item: CalendarItem, edge: "start" | "end", deltaMinutes: number) => {
    if (deltaMinutes === 0 || item.kind !== "event") return;
    try {
      const oldStart = parseISO(item.starts_at);
      const oldEnd = parseISO(item.ends_at);
      let newStart = oldStart;
      let newEnd = oldEnd;
      if (edge === "start") {
        newStart = new Date(oldStart.getTime() + deltaMinutes * 60_000);
        if (newStart.getTime() >= oldEnd.getTime() - 30 * 60_000) {
          newStart = new Date(oldEnd.getTime() - 30 * 60_000);
        }
      } else {
        newEnd = new Date(oldEnd.getTime() + deltaMinutes * 60_000);
        if (newEnd.getTime() <= oldStart.getTime() + 30 * 60_000) {
          newEnd = new Date(oldStart.getTime() + 30 * 60_000);
        }
      }
      const ev = item.raw as any;
      await updateEventMutation.mutateAsync({
        id: ev.id,
        payload: { starts_at: newStart.toISOString(), ends_at: newEnd.toISOString() }
      });
      toast.success("Horario atualizado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao alterar horario");
    }
  };

  const rescheduleRoutine = async (routine: Routine, targetDay: Date, targetHour: number, targetMinute = 0) => {
    try {
      const oldStart = timeStringToMinutes(routine.start_time);
      const oldEnd = timeStringToMinutes(routine.end_time);
      const duration = Math.max(30, oldEnd - oldStart);
      const newStartMinutes = targetHour * 60 + targetMinute;
      const newEndMinutes = Math.min(23 * 60 + 59, newStartMinutes + duration);
      await updateRoutineMutation.mutateAsync({
        id: routine.id,
        payload: {
          day_of_week: targetDay.getDay(),
          start_time: minutesToTimeString(newStartMinutes),
          end_time: minutesToTimeString(newEndMinutes),
        },
      });
      toast.success("Rotina movida");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao mover rotina");
    }
  };

  const resizeRoutine = async (routine: Routine, edge: "start" | "end", deltaMinutes: number) => {
    if (deltaMinutes === 0) return;
    try {
      const start = timeStringToMinutes(routine.start_time);
      const end = timeStringToMinutes(routine.end_time);
      let nextStart = start;
      let nextEnd = end;
      if (edge === "start") {
        nextStart = Math.max(DAY_START_HOUR * 60, start + deltaMinutes);
        nextStart = Math.min(nextStart, end - 30);
      } else {
        nextEnd = Math.min((DAY_END_HOUR + 1) * 60 - 1, end + deltaMinutes);
        nextEnd = Math.max(nextEnd, start + 30);
      }
      await updateRoutineMutation.mutateAsync({
        id: routine.id,
        payload: {
          start_time: minutesToTimeString(nextStart),
          end_time: minutesToTimeString(nextEnd),
        },
      });
      toast.success("Horario da rotina atualizado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao alterar rotina");
    }
  };

  const openRoutine = (routine: Routine, date: Date) => {
    setRoutineActionDialog({ routine, date });
  };

  const handleRoutineSkipDay = async () => {
    if (!routineActionDialog || !user) return;
    const { routine, date } = routineActionDialog;
    try {
      await skipRoutineMutation.mutateAsync({ routineId: routine.id, userId: user.id, date });
      toast.success("Rotina ignorada nesse dia");
      setRoutineActionDialog(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    }
  };

  const handleRoutineEdit = () => {
    if (!routineActionDialog) return;
    setEditingRoutine(routineActionDialog.routine as Routine);
    setRoutineActionDialog(null);
    setRoutineDialogOpen(true);
  };

  const handleRoutineDeleteSeries = async () => {
    if (!routineActionDialog) return;
    const { routine } = routineActionDialog;
    try {
      await deleteRoutineMutation.mutateAsync(routine.id);
      toast.success("Rotina removida");
      setRoutineActionDialog(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    }
  };

  return (
    <div className="px-4 pt-6 animate-fade-in">
      {/* Header */}
      <header className="mb-4 flex min-w-0 items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="truncate whitespace-nowrap text-xl font-bold tracking-tight sm:text-2xl">{headerLabel}</h1>
          {showTodayLabel && (
            <div className="mt-0.5 text-xs font-medium text-primary">
              Hoje
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => navigate(-1)} className="tap-target rounded-xl hover:bg-muted">
            <ChevronLeft className="mx-auto h-5 w-5" />
          </button>
          <button onClick={() => navigate(1)} className="tap-target rounded-xl hover:bg-muted">
            <ChevronRight className="mx-auto h-5 w-5" />
          </button>
        </div>
      </header>

      {/* View switcher */}
      <div className="mb-3 grid grid-cols-3 rounded-xl bg-muted p-1">
        {(["day", "week", "month"] as ViewMode[]).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`rounded-lg py-2 text-sm font-medium capitalize transition-all ${
              view === v ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            {v === "day" ? "Dia" : v === "week" ? "Semana" : "Mes"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {dataError && (
            <div className="mb-3 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              Falha ao carregar agenda. Faca login novamente e tente recarregar.
            </div>
          )}
          {(coupleId || partnerProfile) && (view === "day" || view === "week") && (
            <RoutineLegend mine={profile ?? null} partner={partnerProfile || { display_name: "Parceiro(a)", color: "#888" } as any} />
          )}
          {view === "day" ? (
            <DayView day={cursor} items={items} routines={routines} routineExceptions={routineExceptions} categories={categories} userId={user?.id ?? null} partnerId={partnerProfile?.id ?? null} coupleId={coupleId} mineProfile={profile ?? null} partnerProfile={partnerProfile ?? null} hourHeight={hourHeight} ui={ui} onSlotClick={openCreate} onItemClick={openItem} onRoutineClick={openRoutine} onReschedule={rescheduleItem} onItemResize={resizeItem} onRoutineReschedule={rescheduleRoutine} onRoutineResize={resizeRoutine} dayZoom={dayZoom} setDayZoom={setDayZoom} />
          ) : view === "week" ? (
            <WeekView cursor={cursor} items={items} routines={routines} routineExceptions={routineExceptions} categories={categories} userId={user?.id ?? null} partnerId={partnerProfile?.id ?? null} coupleId={coupleId} mineProfile={profile ?? null} partnerProfile={partnerProfile ?? null} hourHeight={hourHeight} ui={ui} onSlotClick={openCreate} onItemClick={openItem} onRoutineClick={openRoutine} setView={setView} setCursor={setCursor} onReschedule={rescheduleItem} onItemResize={resizeItem} onRoutineReschedule={rescheduleRoutine} onRoutineResize={resizeRoutine} weekZoom={weekZoom} setWeekZoom={setWeekZoom} />
          ) : (
            <MonthView cursor={cursor} items={items} routines={routines} routineExceptions={routineExceptions} categories={categories} onDayClick={(d) => { setCursor(d); setView("day"); }} onItemClick={openItem} />
          )}
        </>
      )}

      {/* Quick actions: criar compromisso e tarefa */}
      <section className="mt-4 mb-24 space-y-2">
        <Button
          onClick={() => openCreate(cursor)}
          className="h-12 w-full gradient-primary text-primary-foreground"
        >
          <Plus className="mr-1.5 h-4 w-4" /> Criar compromisso
        </Button>
        <Button
          onClick={openTodoCreate}
          variant="outline"
          className="h-12 w-full border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary"
        >
          <CheckSquare className="mr-1.5 h-4 w-4" /> Criar tarefa
        </Button>
      </section>

      <EventDialog
        open={dialogOpen}
        onOpenChange={handleEventDialogChange}
        defaultDate={presetDate}
        defaultHour={presetHour}
        event={editingEvent}
        categories={categories}
        coupleId={coupleId}
        existingEvents={rawEvents}
        routines={routines}
        onSaved={() => {
          setDialogOpen(false);
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.events });
        }}
      />
      <TodoDialog
        open={todoDialogOpen}
        onOpenChange={(open) => {
          setTodoDialogOpen(open);
          if (!open) setEditingTodo(null);
        }}
        todo={editingTodo}
        categories={categories}
        coupleId={coupleId}
        onSaved={() => {
          setTodoDialogOpen(false);
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.todos });
        }}
      />
      <RoutineDialog
        open={routineDialogOpen}
        onOpenChange={(open) => {
          setRoutineDialogOpen(open);
          if (!open) setEditingRoutine(null);
        }}
        routine={editingRoutine}
        coupleId={coupleId}
        onSaved={() => {
          setRoutineDialogOpen(false);
          setEditingRoutine(null);
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.routines });
        }}
      />

      <AlertDialog open={!!routineActionDialog} onOpenChange={(v) => !v && setRoutineActionDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Evento recorrente</AlertDialogTitle>
            <AlertDialogDescription>
              "{routineActionDialog?.routine.title}" se repete toda semana. O que voc{"\u00ea"} quer fazer?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
            <AlertDialogAction
              onClick={handleRoutineEdit}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Editar evento
            </AlertDialogAction>
            <AlertDialogAction
              onClick={handleRoutineSkipDay}
              className="w-full bg-warning text-warning-foreground hover:bg-warning/90"
            >
              Pular s{"\u00f3"} este dia
            </AlertDialogAction>
            <AlertDialogAction
              onClick={handleRoutineDeleteSeries}
              className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir S{"\u00e9"}rie
            </AlertDialogAction>
            <AlertDialogCancel className="w-full mt-0">Cancelar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

type UiPrefs = ReturnType<typeof useUiPrefs>;

/* â”€â”€ DAY VIEW (single column, hour blocks 5h-23h) â”€â”€ */
function DayView({ day, items, routines, routineExceptions, categories, userId, partnerId, coupleId, mineProfile, partnerProfile, hourHeight, ui, onSlotClick, onItemClick, onRoutineClick, onReschedule, onItemResize, onRoutineReschedule, onRoutineResize, dayZoom, setDayZoom }: {
  day: Date; items: CalendarItem[]; routines: Routine[]; routineExceptions: RoutineException[]; categories: Category[];
  userId: string | null; partnerId: string | null; coupleId: string | null; mineProfile: Profile | null; partnerProfile: Profile | null; hourHeight: number; ui: UiPrefs;
  onSlotClick: (d: Date, h: number) => void;
  onItemClick: (i: CalendarItem) => void;
  onRoutineClick: (r: Routine, d: Date) => void;
  onReschedule: (item: CalendarItem, day: Date, hour: number, minute?: number) => void;
  onItemResize: (item: CalendarItem, edge: "start" | "end", deltaMinutes: number) => void;
  onRoutineReschedule: (routine: Routine, day: Date, hour: number, minute?: number) => void;
  onRoutineResize: (routine: Routine, edge: "start" | "end", deltaMinutes: number) => void;
  dayZoom: number;
  setDayZoom: React.Dispatch<React.SetStateAction<number>>;
}) {
  const dayItems = eventsForDay(items, day);
  const dayRoutines = filterRoutinesByExceptions(routinesForDay(routines, day), routineExceptions, day);
  const isCouple = !!coupleId;
  const sharedRoutines = dayRoutines.filter((r) => Boolean((r as any).is_shared));
  const mineRoutines = dayRoutines.filter((r) => !(r as any).is_shared && routineOwnerSide(r, userId, partnerId, mineProfile, partnerProfile) === "mine");
  const partnerRoutines = dayRoutines.filter((r) => !(r as any).is_shared && routineOwnerSide(r, userId, partnerId, mineProfile, partnerProfile) === "partner");
  const splitItems = useMemo(
    () => splitPersonalItemsBySide(dayItems, categories, userId, partnerId, mineProfile, partnerProfile),
    [dayItems, categories, userId, partnerId, mineProfile, partnerProfile],
  );
  const { mine: mineItems, partner: partnerItems, shared: sharedItems } = splitItems;
  const mineLaneLayout = useMemo(() => buildLaneLayout(mineItems), [mineItems]);
  const partnerLaneLayout = useMemo(() => buildLaneLayout(partnerItems), [partnerItems]);
  const sharedLaneLayout = useMemo(() => buildLaneLayout(sharedItems), [sharedItems]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pinchStateRef = useRef<{ initialDist: number; initialZoom: number } | null>(null);
  const [dragOverHour, setDragOverHour] = useState<{ h: number; m: number } | null>(null);

  const onWheel = (e: React.WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    setDayZoom((z) => {
      const next = z - e.deltaY * 0.002;
      return Math.min(1.8, Math.max(0.5, +next.toFixed(2)));
    });
  };
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 2) return;
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    pinchStateRef.current = { initialDist: Math.hypot(dx, dy), initialZoom: dayZoom };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length !== 2 || !pinchStateRef.current) return;
    e.preventDefault();
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    const dist = Math.hypot(dx, dy);
    const ratio = dist / pinchStateRef.current.initialDist;
    setDayZoom(Math.min(1.8, Math.max(0.5, +(pinchStateRef.current.initialZoom * ratio).toFixed(2))));
  };
  const onTouchEnd = () => { pinchStateRef.current = null; };

  useEffect(() => {
    if (scrollRef.current && isToday(day)) {
      const h = new Date().getHours();
      scrollRef.current.scrollTop = Math.max(0, (h - DAY_START_HOUR - 1) * hourHeight);
    }
  }, [day]);

  const handleDrop = (e: React.DragEvent, h: number) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/calendar-item");
    const routineId = e.dataTransfer.getData("text/calendar-routine");
    const item = items.find((it) => it.id === id);
    const routine = dayRoutines.find((r) => r.id === routineId);
    if (!item && !routine) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const minute = offsetY > rect.height / 2 ? 30 : 0;
    setDragOverHour(null);
    if (item) onReschedule(item, day, h, minute);
    if (routine) onRoutineReschedule(routine, day, h, minute);
  };

  // Scale hour-label typography with zoom so labels and half-hour marks stay perfectly aligned
  const labelFontPx = Math.max(9, Math.min(14, Math.round(hourHeight * 0.22)));
  const labelLineH  = `${Math.round(hourHeight * 0.9)}px`;
  return (
    <div ref={scrollRef} className="overflow-auto rounded-2xl border bg-card shadow-sm" style={{ maxHeight: "78vh" }} onWheel={onWheel} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <div className="relative min-w-[18rem]" data-calendar-day={day.toISOString()} style={{ height: HOURS.length * hourHeight }}>
        {/* Hour rows + business-hours band */}
        {HOURS.map((h, i) => {
          const inBusiness = h >= BUSINESS_START_HOUR && h < BUSINESS_END_HOUR;
          const isOver = dragOverHour?.h === h;
          return (
            <button
              key={h}
              onClick={() => onSlotClick(day, h)}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                const offsetY = e.clientY - rect.top;
                setDragOverHour({ h, m: offsetY > rect.height / 2 ? 30 : 0 });
              }}
              onDragLeave={() => setDragOverHour((cur) => (cur?.h === h ? null : cur))}
              onDrop={(e) => handleDrop(e, h)}
              className={`absolute left-0 right-0 flex items-start border-t text-left transition-colors hover:bg-primary/5 ${
                inBusiness ? "border-border/70 bg-muted/20" : "border-border/40"
              } ${isOver ? "bg-primary/15 ring-1 ring-primary/40" : ""}`}
              style={{ top: i * hourHeight, height: hourHeight }}
            >
              <span
                className="sticky left-0 w-11 shrink-0 pt-0.5 text-center font-semibold tabular-nums text-muted-foreground"
                style={{ fontSize: `${labelFontPx}px`, lineHeight: labelLineH }}
              >
                {String(h).padStart(2, "0")}
              </span>
              {/* half-hour mark â€” scales with zoom */}
              <span
                className="pointer-events-none absolute left-11 right-0 border-t border-dashed border-border/30"
                style={{ top: hourHeight / 2 }}
              />
            </button>
          );
        })}

        {/* Routines + items split by person if couple */}
        {isCouple ? (
          <>
            <div className="absolute left-12 right-3 top-0 bottom-0">
              {/* Mine column */}
              <div className="absolute inset-y-0 left-0 right-[calc(50%+0.25rem)]">
              {mineRoutines.map((r) => (
                <RoutineBlock hourHeight={hourHeight} key={r.id} routine={r} onClick={() => onRoutineClick(r, day)} onMoveDrop={onRoutineReschedule} onResize={onRoutineResize} draggable />
              ))}
              {mineItems.map((it) => (
                <ItemBlock ui={ui} hourHeight={hourHeight} key={it.id} item={it} categories={categories} onClick={onItemClick} onMoveDrop={onReschedule} onResize={onItemResize} draggable laneIndex={mineLaneLayout.get(it.id)?.lane ?? 0} laneCount={mineLaneLayout.get(it.id)?.laneCount ?? 1} />
              ))}
              </div>
              <div className="pointer-events-none absolute bottom-0 left-1/2 top-0 w-px bg-border/50" />
              {/* Partner column */}
              <div className="absolute inset-y-0 left-[calc(50%+0.25rem)] right-0">
              {partnerRoutines.map((r) => (
                <RoutineBlock hourHeight={hourHeight} key={r.id} routine={r} onClick={() => onRoutineClick(r, day)} onMoveDrop={onRoutineReschedule} onResize={onRoutineResize} draggable />
              ))}
              {partnerItems.map((it) => (
                <ItemBlock ui={ui} hourHeight={hourHeight} key={it.id} item={it} categories={categories} onClick={onItemClick} onMoveDrop={onReschedule} onResize={onItemResize} draggable laneIndex={partnerLaneLayout.get(it.id)?.lane ?? 0} laneCount={partnerLaneLayout.get(it.id)?.laneCount ?? 1} />
              ))}
              </div>
            </div>
            <div className="absolute left-12 right-3 top-0 bottom-0 pointer-events-none">
              {sharedRoutines.map((r) => (
                <div key={r.id} className="pointer-events-auto">
                  <RoutineBlock hourHeight={hourHeight} routine={r} onClick={() => onRoutineClick(r, day)} onMoveDrop={onRoutineReschedule} onResize={onRoutineResize} draggable />
                </div>
              ))}
              {sharedItems.map((it) => (
                <div key={it.id} className="pointer-events-auto">
                  <ItemBlock ui={ui} hourHeight={hourHeight} item={it} categories={categories} onClick={onItemClick} onMoveDrop={onReschedule} onResize={onItemResize} draggable laneIndex={sharedLaneLayout.get(it.id)?.lane ?? 0} laneCount={sharedLaneLayout.get(it.id)?.laneCount ?? 1} />
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="absolute left-12 right-3 top-0 bottom-0">
            {dayRoutines.map((r) => (
              <RoutineBlock hourHeight={hourHeight} key={r.id} routine={r} onClick={() => onRoutineClick(r, day)} onMoveDrop={onRoutineReschedule} onResize={onRoutineResize} draggable />
            ))}
            {dayItems.map((it) => (
              <ItemBlock ui={ui} hourHeight={hourHeight} key={it.id} item={it} categories={categories} onClick={onItemClick} onMoveDrop={onReschedule} onResize={onItemResize} draggable />
            ))}
          </div>
        )}

        {isToday(day) && <NowLine hourHeight={hourHeight} />}
      </div>
    </div>
  );
}

/** Filter routine instances by excluding those with an exception for the given date. */
function filterRoutinesByExceptions(
  routines: Routine[],
  exceptions: RoutineException[],
  day: Date
): Routine[] {
  const pad = (n: number) => String(n).padStart(2, "0");
  const dayStr = `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`;
  const excludedIds = new Set(
    exceptions.filter((e) => e.exception_date === dayStr).map((e) => e.routine_id)
  );
  return routines.filter((r) => !excludedIds.has(r.id));
}

/* â”€â”€ WEEK VIEW â”€â”€ */
function WeekView({
  cursor, items, routines, routineExceptions, categories, userId, partnerId, coupleId, mineProfile, partnerProfile, hourHeight, ui, onSlotClick, onItemClick, onRoutineClick, setView, setCursor, onReschedule, onItemResize, onRoutineReschedule, onRoutineResize, weekZoom, setWeekZoom,
}: {
  cursor: Date; items: CalendarItem[]; routines: Routine[]; routineExceptions: RoutineException[]; categories: Category[];
  userId: string | null; partnerId: string | null; coupleId: string | null; mineProfile: Profile | null; partnerProfile: Profile | null; hourHeight: number; ui: UiPrefs;
  onSlotClick: (d: Date, h: number) => void;
  onItemClick: (i: CalendarItem) => void;
  onRoutineClick: (r: Routine, d: Date) => void;
  setView: (v: ViewMode) => void; setCursor: (d: Date) => void;
  onReschedule: (item: CalendarItem, day: Date, hour: number, minute?: number) => void;
  onItemResize: (item: CalendarItem, edge: "start" | "end", deltaMinutes: number) => void;
  onRoutineReschedule: (routine: Routine, day: Date, hour: number, minute?: number) => void;
  onRoutineResize: (routine: Routine, edge: "start" | "end", deltaMinutes: number) => void;
  weekZoom: number;
  setWeekZoom: React.Dispatch<React.SetStateAction<number>>;
}) {
  const days = getWeekDays(cursor);
  const isCouple = !!coupleId;
  const scrollRef = useRef<HTMLDivElement>(null);
  const pinchStateRef = useRef<{ initialDist: number; initialZoom: number } | null>(null);
  const [dragOver, setDragOver] = useState<{ dayKey: string; h: number; m: number } | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = Math.max(0, (8 - DAY_START_HOUR) * hourHeight);
      // Ao abrir a semana, rolar horizontalmente atÃ© o dia atual
      const todayIdx = days.findIndex((d) => isToday(d));
      if (todayIdx >= 0) {
        const colPx = ui.weekColWidth * 16; // rem â†’ px aprox
        const viewport = scrollRef.current.clientWidth;
        const targetCenter = 2.5 * 16 + todayIdx * colPx + colPx / 2;
        scrollRef.current.scrollLeft = Math.max(0, targetCenter - viewport / 2);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor]);

  const handleDrop = (e: React.DragEvent, d: Date, h: number) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/calendar-item");
    const routineId = e.dataTransfer.getData("text/calendar-routine");
    const item = items.find((it) => it.id === id);
    const routine = routines.find((r) => r.id === routineId);
    if (!item && !routine) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const minute = offsetY > rect.height / 2 ? 30 : 0;
    setDragOver(null);
    if (item) onReschedule(item, d, h, minute);
    if (routine) onRoutineReschedule(routine, d, h, minute);
  };

  // Pinch-to-zoom + ctrl+wheel to zoom
  const onWheel = (e: React.WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    setWeekZoom((z) => {
      const next = z - e.deltaY * 0.002;
      return Math.min(1.6, Math.max(0.5, +next.toFixed(2)));
    });
  };
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 2) return;
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    pinchStateRef.current = { initialDist: Math.hypot(dx, dy), initialZoom: weekZoom };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length !== 2 || !pinchStateRef.current) return;
    e.preventDefault();
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    const dist = Math.hypot(dx, dy);
    const ratio = dist / pinchStateRef.current.initialDist;
    const next = pinchStateRef.current.initialZoom * ratio;
    setWeekZoom(Math.min(1.6, Math.max(0.5, +next.toFixed(2))));
  };
  const onTouchEnd = () => { pinchStateRef.current = null; };

  return (
    <div className="rounded-2xl border bg-card overflow-hidden shadow-sm">
      <div
        ref={scrollRef}
        className="overflow-auto"
        style={{ maxHeight: "78vh" }}
        onWheel={onWheel}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div style={{ minWidth: `${ui.weekColWidth * 7 + 2.5}rem` }}>
          {/* Day headers â€” opaco, sem transparÃªncia; coluna de hora sticky */}
          <div
            className="sticky top-0 z-30 grid border-b bg-card shadow-sm"
            style={{ gridTemplateColumns: `2.5rem repeat(7, minmax(${ui.weekColWidth}rem, 1fr))` }}
          >
            <div className="sticky left-0 z-10 bg-card" />
            {days.map((d) => {
              const today = isToday(d);
              return (
                <button
                  key={d.toISOString()}
                  onClick={() => { setCursor(d); setView("day"); }}
                  className={`flex items-center justify-center gap-1 px-1 py-1 transition-colors hover:bg-muted ${
                    today ? "bg-primary/10" : ""
                  }`}
                >
                  <span
                    className="text-[11px] font-semibold uppercase leading-tight tracking-wide text-muted-foreground"
                    style={{ wordBreak: "break-word" }}
                  >
                    {WEEKDAY_LABELS[d.getDay()]}
                  </span>
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold tabular-nums ${
                    today ? "gradient-primary text-primary-foreground shadow" : "text-foreground"
                  }`}>
                    {fmt(d, "d")}
                  </span>
                </button>
              );
            })}
          </div>

          <div
            className="relative grid"
            style={{
              gridTemplateColumns: `2.5rem repeat(7, minmax(${ui.weekColWidth}rem, 1fr))`,
              height: HOURS.length * hourHeight,
            }}
          >
            {/* Hour labels column â€” sticky horizontal, escala com o zoom */}
            <div className="sticky left-0 z-20 row-start-1 border-r border-border/60 bg-card relative">
              {HOURS.map((h, i) => {
                const wkLabel = Math.max(8, Math.min(13, Math.round(hourHeight * 0.2)));
                return (
                  <div key={h} className="absolute left-0 right-0 border-t border-border/50 pt-px text-center font-semibold tabular-nums text-muted-foreground"
                    style={{ top: i * hourHeight, height: hourHeight, fontSize: `${wkLabel}px`, lineHeight: `${Math.round(hourHeight * 0.85)}px` }}>
                    {String(h).padStart(2, "0")}
                  </div>
                );
              })}
            </div>
            {/* Day columns */}
            {days.map((d) => {
              const dayItems = eventsForDay(items, d);
              const dayRoutines = filterRoutinesByExceptions(routinesForDay(routines, d), routineExceptions, d);
              const sharedRoutines = dayRoutines.filter((r) => Boolean((r as any).is_shared));
              const mineRoutines = dayRoutines.filter((r) => !(r as any).is_shared && routineOwnerSide(r, userId, partnerId, mineProfile, partnerProfile) === "mine");
              const partnerRoutines = dayRoutines.filter((r) => !(r as any).is_shared && routineOwnerSide(r, userId, partnerId, mineProfile, partnerProfile) === "partner");
              const { mine: mineItems, partner: partnerItems, shared: sharedItems } = splitPersonalItemsBySide(dayItems, categories, userId, partnerId, mineProfile, partnerProfile);
              const mineLaneLayout = buildLaneLayout(mineItems);
              const partnerLaneLayout = buildLaneLayout(partnerItems);
              const sharedLaneLayout = buildLaneLayout(sharedItems);
              const todayCol = isToday(d);
              const dayKey = d.toISOString();
              return (
                <div key={dayKey} data-calendar-day={d.toISOString()} className={`relative border-l border-border/60 ${todayCol ? "bg-primary/5" : ""}`}>
                  {HOURS.map((h, i) => {
                    const inBusiness = h >= BUSINESS_START_HOUR && h < BUSINESS_END_HOUR;
                    const isOver = dragOver?.dayKey === dayKey && dragOver.h === h;
                    return (
                      <button
                        key={h}
                        onClick={() => onSlotClick(d, h)}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "move";
                          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                          const offsetY = e.clientY - rect.top;
                          setDragOver({ dayKey, h, m: offsetY > rect.height / 2 ? 30 : 0 });
                        }}
                        onDragLeave={() => setDragOver((cur) => (cur?.dayKey === dayKey && cur.h === h ? null : cur))}
                        onDrop={(e) => handleDrop(e, d, h)}
                        aria-label={`${fmt(d, "dd MMM")} ${h}h`}
                        className={`absolute left-0 right-0 border-t transition-colors hover:bg-primary/5 ${
                          inBusiness ? "border-border/50 bg-muted/15" : "border-border/30"
                        } ${isOver ? "bg-primary/15 ring-1 ring-primary/40" : ""}`}
                        style={{ top: i * hourHeight, height: hourHeight }}
                      />
                    );
                  })}
                  {isCouple ? (
                    <>
                      {/* Mine */}
                      <div className="absolute inset-y-0 left-0.5 right-[calc(50%+0.25rem)]">
                        {mineRoutines.map((r) => (
                          <RoutineBlock hourHeight={hourHeight} key={r.id} routine={r} compact onClick={() => onRoutineClick(r, d)} onMoveDrop={onRoutineReschedule} onResize={onRoutineResize} draggable />
                        ))}
                        {mineItems.map((it) => (
                          <ItemBlock ui={ui} hourHeight={hourHeight} key={it.id} item={it} categories={categories} onClick={onItemClick} onMoveDrop={onReschedule} onResize={onItemResize} compact draggable laneIndex={mineLaneLayout.get(it.id)?.lane ?? 0} laneCount={mineLaneLayout.get(it.id)?.laneCount ?? 1} />
                        ))}
                      </div>
                      {/* Partner */}
                      <div className="absolute inset-y-0 left-[calc(50%+0.25rem)] right-0.5">
                        {partnerRoutines.map((r) => (
                          <RoutineBlock hourHeight={hourHeight} key={r.id} routine={r} compact onClick={() => onRoutineClick(r, d)} onMoveDrop={onRoutineReschedule} onResize={onRoutineResize} draggable />
                        ))}
                        {partnerItems.map((it) => (
                          <ItemBlock ui={ui} hourHeight={hourHeight} key={it.id} item={it} categories={categories} onClick={onItemClick} onMoveDrop={onReschedule} onResize={onItemResize} compact draggable laneIndex={partnerLaneLayout.get(it.id)?.lane ?? 0} laneCount={partnerLaneLayout.get(it.id)?.laneCount ?? 1} />
                        ))}
                      </div>
                      {sharedRoutines.map((r) => (
                        <RoutineBlock hourHeight={hourHeight} key={r.id} routine={r} compact onClick={() => onRoutineClick(r, d)} onMoveDrop={onRoutineReschedule} onResize={onRoutineResize} draggable />
                      ))}
                      {sharedItems.map((it) => (
                        <ItemBlock ui={ui} hourHeight={hourHeight} key={it.id} item={it} categories={categories} onClick={onItemClick} onMoveDrop={onReschedule} onResize={onItemResize} compact draggable laneIndex={sharedLaneLayout.get(it.id)?.lane ?? 0} laneCount={sharedLaneLayout.get(it.id)?.laneCount ?? 1} />
                      ))}
                    </>
                  ) : (
                    <div className="absolute inset-0">
                      {dayRoutines.map((r) => (
                        <RoutineBlock hourHeight={hourHeight} key={r.id} routine={r} compact onClick={() => onRoutineClick(r, d)} onMoveDrop={onRoutineReschedule} onResize={onRoutineResize} draggable />
                      ))}
                      {dayItems.map((it) => (
                        <ItemBlock ui={ui} hourHeight={hourHeight} key={it.id} item={it} categories={categories} onClick={onItemClick} onMoveDrop={onReschedule} onResize={onItemResize} compact draggable />
                      ))}
                    </div>
                  )}
                  {isToday(d) && <NowLine hourHeight={hourHeight} />}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* â”€â”€ MONTH VIEW â”€â”€ */
function MonthView({ cursor, items, routines, routineExceptions, categories, onDayClick, onItemClick }: {
  cursor: Date; items: CalendarItem[]; routines: Routine[]; routineExceptions: RoutineException[]; categories: Category[];
  onDayClick: (d: Date) => void;
  onItemClick: (i: CalendarItem) => void;
}) {
  const days = getMonthGrid(cursor);
  return (
    <div className="rounded-2xl border bg-card overflow-hidden">
      <div className="grid grid-cols-7 border-b bg-muted/30 text-center text-[10px] font-medium uppercase text-muted-foreground">
        {["Dom","Seg","Ter","Qua","Qui","Sex","Sab"].map((d) => (
          <div key={d} className="py-2">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d) => {
          const inMonth = isSameMonth(d, cursor);
          const today = isToday(d);
          const dayItems = eventsForDay(items, d);
          const dayRoutines = filterRoutinesByExceptions(routinesForDay(routines, d), routineExceptions, d);
          return (
            <div
              key={d.toISOString()}
              onClick={() => onDayClick(d)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter") onDayClick(d); }}
              className={`relative flex aspect-square cursor-pointer flex-col items-center gap-0.5 border-b border-r p-1.5 text-left transition-colors hover:bg-muted/40 ${
                !inMonth ? "opacity-40" : ""
              }`}
            >
              <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                today ? "gradient-primary text-primary-foreground" : ""
              }`}>
                {fmt(d, "d")}
              </span>
              {dayRoutines.length > 0 && (
                <div className="flex gap-0.5">
                  {dayRoutines.slice(0, 3).map((r) => (
                    <span key={r.id} className="h-1 w-1 rounded-full" style={{ backgroundColor: r.color }} />
                  ))}
                </div>
              )}
              <div className="flex w-full flex-1 flex-col gap-0.5 overflow-hidden">
                {dayItems.slice(0, 2).map((it) => {
                  const cat = categories.find((c) => c.id === it.category_id);
                  return (
                    <button
                      type="button"
                      key={it.id}
                      onClick={(e) => { e.stopPropagation(); onItemClick(it); }}
                      className={`truncate rounded px-1 py-px text-left text-[9px] font-medium text-white hover:brightness-110 ${it.is_completed ? "line-through opacity-70" : ""}`}
                      style={{ backgroundColor: cat?.color ?? "var(--primary)" }}
                    >
                      <span className="inline-flex min-w-0 items-center gap-1">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white/90" />
                        <span className="truncate">{it.title}</span>
                      </span>
                    </button>
                  );
                })}
                {dayItems.length > 2 && (
      <span className="text-muted-foreground">/</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* â”€â”€ ITEM BLOCK (event or todo) â”€â”€ */
function ItemBlock({ item, categories, onClick, onMoveDrop, onResize, compact, draggable, hourHeight, ui, laneIndex = 0, laneCount = 1 }: {
  item: CalendarItem; categories: Category[];
  onClick: (i: CalendarItem) => void;
  onMoveDrop?: (item: CalendarItem, day: Date, hour: number, minute?: number) => void;
  onResize?: (item: CalendarItem, edge: "start" | "end", deltaMinutes: number) => void;
  compact?: boolean; draggable?: boolean; hourHeight: number;
  ui: UiPrefs;
  laneIndex?: number; laneCount?: number;
}) {
  const start = parseISO(item.starts_at);
  const end = parseISO(item.ends_at);
  const cat = categories.find((c) => c.id === item.category_id);
  const color = cat?.color ?? (item.priority === 3 ? "#ef4444" : item.priority === 2 ? "#f59e0b" : "#6366f1");
  const top = eventTopOffset(start, hourHeight);
  const height = eventHeight(start, end, hourHeight);
  const isTodo = item.kind === "todo";
  const done = item.is_completed;
  const durationHours = Math.max(0, (end.getTime() - start.getTime()) / 36e5);
  const showTime = !(isTodo && durationHours < 4);
  const isImportant = item.priority >= 2 && !done;
  const isCouple = item.is_shared && !done;
  const animationClass = [
    isImportant ? animClass(ui.important) : "",
    isCouple ? animClass(ui.couple) : "",
  ].filter(Boolean).join(" ");
  const [isDragging, setIsDragging] = useState(false);
  const blockHeight = Math.max(20, height - 4);
  const isTiny = blockHeight < 24;
  const isShort = blockHeight < 38;
  const inlineLayout = compact || isShort;
  const padPx = isTiny ? "1px 4px" : isShort ? "2px 5px" : `${ui.itemPadding}px`;
  
  const category = item.is_shared ? "couple" : "important";
  const p = resolveItemEffective(item.id, category);
  const laneGapPct = 2;
  const boundedLaneCount = Math.max(1, laneCount);
  const boundedLaneIndex = Math.max(0, Math.min(laneIndex, boundedLaneCount - 1));
  const laneWidthPct = boundedLaneCount === 1 ? 100 : (100 - laneGapPct * (boundedLaneCount + 1)) / boundedLaneCount;
  const laneLeftPct = boundedLaneCount === 1 ? 0 : laneGapPct + boundedLaneIndex * (laneWidthPct + laneGapPct);
  const canResize = item.kind === "event" && !!onResize;
  const suppressClickRef = useRef(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [resizePreview, setResizePreview] = useState<{ edge: "start" | "end"; delta: number } | null>(null);
  const resizeDeltaPx = resizePreview ? (resizePreview.delta / 60) * hourHeight : 0;
  const renderedTop = top + 2 + (resizePreview?.edge === "start" ? resizeDeltaPx : 0);
  const renderedHeight = Math.max(
    20,
    blockHeight +
      (resizePreview?.edge === "end" ? resizeDeltaPx : 0) -
      (resizePreview?.edge === "start" ? resizeDeltaPx : 0),
  );

  const startMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!draggable || (e.target as HTMLElement).closest("[data-resize-handle]")) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const target = e.currentTarget;
    let dragActive = false;
    let canceled = false;
    let lastX = startX;
    let lastY = startY;
    const finish = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.clearTimeout(holdTimer);
      if (dragActive) target.releasePointerCapture?.(e.pointerId);
    };
    const onMove = (ev: PointerEvent) => {
      lastX = ev.clientX;
      lastY = ev.clientY;
      const movedX = Math.abs(lastX - startX);
      const movedY = Math.abs(lastY - startY);
      if (!dragActive) {
        if (movedX > LONG_PRESS_MOVE_TOLERANCE_PX || movedY > LONG_PRESS_MOVE_TOLERANCE_PX) {
          canceled = true;
          window.clearTimeout(holdTimer);
        }
        return;
      }
      ev.preventDefault();
      setDragOffset({ x: lastX - startX, y: lastY - startY });
    };
    const onUp = (ev: PointerEvent) => {
      const shouldDrop = dragActive;
      finish();
      setIsDragging(false);
      setDragOffset(null);
      if (!shouldDrop) return;
      suppressClickRef.current = true;
      window.setTimeout(() => { suppressClickRef.current = false; }, 120);
      const drop = calendarDropFromPoint(ev.clientX, ev.clientY, hourHeight);
      if (drop) onMoveDrop?.(item, drop.day, drop.hour, drop.minute);
    };
    const onCancel = () => {
      finish();
      setIsDragging(false);
      setDragOffset(null);
    };
    const holdTimer = window.setTimeout(() => {
      if (canceled) return;
      dragActive = true;
      target.setPointerCapture?.(e.pointerId);
      setIsDragging(true);
      setDragOffset({ x: lastX - startX, y: lastY - startY });
    }, LONG_PRESS_DRAG_DELAY_MS);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
  };

  const startResize = (edge: "start" | "end") => (e: React.PointerEvent<HTMLSpanElement>) => {
    if (!canResize) return;
    e.preventDefault();
    e.stopPropagation();
    const startY = e.clientY;
    const onMove = (ev: PointerEvent) => {
      ev.preventDefault();
      setResizePreview({ edge, delta: snapDeltaMinutes(ev.clientY - startY, hourHeight) });
    };
    const onUp = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      const delta = snapDeltaMinutes(ev.clientY - startY, hourHeight);
      setResizePreview(null);
      if (delta !== 0) onResize?.(item, edge, delta);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const InnerContent = (
    <div className={`flex h-full w-full min-w-0 overflow-hidden ${isTodo ? "flex-col items-center justify-center text-center" : inlineLayout ? "flex-row items-center gap-1" : "flex-col items-start"}`}>
      <div className={`flex min-w-0 items-center ${isTodo ? "w-full justify-center" : inlineLayout ? "flex-1 gap-1" : "w-full gap-1.5"}`}>
        {!isTodo && item.is_shared ? (
          <Heart className="h-3 w-3 shrink-0" style={{ color }} fill="currentColor" />
        ) : null}
        <p
          className={`min-w-0 flex-1 truncate font-bold ${isTiny ? "text-[9px] leading-none" : inlineLayout ? "text-[10px] leading-none" : "text-[13px] leading-tight"} ${done ? "line-through opacity-70" : ""}`}
          style={{ color, textAlign: isTodo ? "center" : undefined }}
        >
          {item.title}
        </p>
      </div>
      {showTime && (inlineLayout && !isTodo ? (
        <span className="shrink-0 text-[8px] font-semibold tabular-nums text-muted-foreground opacity-70">
          {fmt(start, "HH:mm")}
        </span>
      ) : (
        <p className={`mt-0.5 truncate text-[11px] font-medium tabular-nums text-muted-foreground opacity-80 ${isTodo ? "w-full text-center" : ""}`}>
          {fmt(start, "HH:mm")}-{fmt(end, "HH:mm")}
        </p>
      ))}
    </div>
  );

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        if (suppressClickRef.current) return;
        onClick(item);
      }}
      draggable={false}
      onPointerDown={startMove}
      onDragStart={(e) => {
        if (!draggable) return;
        e.dataTransfer.setData("text/calendar-item", item.id);
        e.dataTransfer.effectAllowed = "move";
        setIsDragging(true);
      }}
      onDragEnd={() => setIsDragging(false)}
      title={`${item.title} - ${fmt(start, "HH:mm")}-${fmt(end, "HH:mm")}${draggable ? " - Arraste para reagendar" : ""}`}
      className={`absolute z-20 left-1 right-1 rounded-lg text-left shadow-sm transition-all hover:shadow-md ${
        isTodo ? "border" : "border-l-[3px]"
      } ${done ? "opacity-60" : ""} overflow-hidden ${draggable ? "cursor-grab active:cursor-grabbing" : ""} ${isDragging ? "opacity-40 ring-2 ring-primary" : ""} ${animationClass}`}
      style={{
        top: renderedTop,
        height: renderedHeight,
        left: boundedLaneCount === 1 ? "4px" : `${laneLeftPct}%`,
        width: boundedLaneCount === 1 ? undefined : `${laneWidthPct}%`,
        right: boundedLaneCount === 1 ? "4px" : "auto",
        borderColor: isTodo ? color : undefined,
        borderLeftColor: !isTodo ? color : undefined,
        backgroundColor: `color-mix(in oklab, ${color} ${isTodo ? 14 : 22}%, var(--card))`,
        clipPath: !compact ? "inset(0 round 0.5rem)" : undefined,
        touchAction: draggable ? "none" : undefined,
        transform: dragOffset ? `translate(${dragOffset.x}px, ${dragOffset.y}px)` : undefined,
        ...particleVars(p.intensity, p.density, p.brightness),
      }}
    >
      {canResize && (
        <>
          <span
            data-resize-handle
            className="absolute left-0 right-0 top-0 z-30 h-4 cursor-ns-resize rounded-t-lg bg-transparent hover:bg-primary/25"
            onPointerDown={startResize("start")}
            aria-hidden="true"
          />
          <span
            data-resize-handle
            className="absolute bottom-0 left-0 right-0 z-30 h-4 cursor-ns-resize rounded-b-lg bg-transparent hover:bg-primary/25"
            onPointerDown={startResize("end")}
            aria-hidden="true"
          />
        </>
      )}
      {compact ? (
        <div
          className="flex h-full w-full items-center justify-center"
          style={{ padding: padPx }}
        >
          {InnerContent}
        </div>
      ) : (
        <div
          className="sticky top-2"
          style={{ padding: padPx, maxHeight: Math.max(0, renderedHeight - 4) }}
        >
          {InnerContent}
        </div>
      )}
      {!isTodo && item.priority >= 2 && (
        <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: item.priority === 3 ? "#ef4444" : "#f59e0b" }} />
      )}
    </button>
  );
}

/* â”€â”€ ROUTINE BLOCK (translucent background, recurring) â”€â”€ */
function RoutineBlock({ routine, compact, onClick, onMoveDrop, onResize, draggable, hourHeight }: {
  routine: Routine;
  compact?: boolean;
  onClick?: () => void;
  onMoveDrop?: (routine: Routine, day: Date, hour: number, minute?: number) => void;
  onResize?: (routine: Routine, edge: "start" | "end", deltaMinutes: number) => void;
  draggable?: boolean;
  hourHeight: number;
}) {
  const top = routineTopOffset(routine.start_time, hourHeight);
  const height = routineHeight(routine.start_time, routine.end_time, hourHeight);
  const isShort = height < 28;
  const showRange = !compact && height >= 36;
  const [isDragging, setIsDragging] = useState(false);
  const canResize = !!onResize;
  const suppressClickRef = useRef(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [resizePreview, setResizePreview] = useState<{ edge: "start" | "end"; delta: number } | null>(null);
  const blockHeight = Math.max(20, height - 4);
  const resizeDeltaPx = resizePreview ? (resizePreview.delta / 60) * hourHeight : 0;
  const renderedTop = top + 2 + (resizePreview?.edge === "start" ? resizeDeltaPx : 0);
  const renderedHeight = Math.max(
    20,
    blockHeight +
      (resizePreview?.edge === "end" ? resizeDeltaPx : 0) -
      (resizePreview?.edge === "start" ? resizeDeltaPx : 0),
  );

  const startMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!draggable || (e.target as HTMLElement).closest("[data-resize-handle]")) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const target = e.currentTarget;
    let dragActive = false;
    let canceled = false;
    let lastX = startX;
    let lastY = startY;
    const finish = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.clearTimeout(holdTimer);
      if (dragActive) target.releasePointerCapture?.(e.pointerId);
    };
    const onMove = (ev: PointerEvent) => {
      lastX = ev.clientX;
      lastY = ev.clientY;
      const movedX = Math.abs(lastX - startX);
      const movedY = Math.abs(lastY - startY);
      if (!dragActive) {
        if (movedX > LONG_PRESS_MOVE_TOLERANCE_PX || movedY > LONG_PRESS_MOVE_TOLERANCE_PX) {
          canceled = true;
          window.clearTimeout(holdTimer);
        }
        return;
      }
      ev.preventDefault();
      setDragOffset({ x: lastX - startX, y: lastY - startY });
    };
    const onUp = (ev: PointerEvent) => {
      const shouldDrop = dragActive;
      finish();
      setIsDragging(false);
      setDragOffset(null);
      if (!shouldDrop) return;
      suppressClickRef.current = true;
      window.setTimeout(() => { suppressClickRef.current = false; }, 120);
      const drop = calendarDropFromPoint(ev.clientX, ev.clientY, hourHeight);
      if (drop) onMoveDrop?.(routine, drop.day, drop.hour, drop.minute);
    };
    const onCancel = () => {
      finish();
      setIsDragging(false);
      setDragOffset(null);
    };
    const holdTimer = window.setTimeout(() => {
      if (canceled) return;
      dragActive = true;
      target.setPointerCapture?.(e.pointerId);
      setIsDragging(true);
      setDragOffset({ x: lastX - startX, y: lastY - startY });
    }, LONG_PRESS_DRAG_DELAY_MS);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
  };

  const startResize = (edge: "start" | "end") => (e: React.PointerEvent<HTMLSpanElement>) => {
    if (!canResize) return;
    e.preventDefault();
    e.stopPropagation();
    const startY = e.clientY;
    const onMove = (ev: PointerEvent) => {
      ev.preventDefault();
      setResizePreview({ edge, delta: snapDeltaMinutes(ev.clientY - startY, hourHeight) });
    };
    const onUp = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      const delta = snapDeltaMinutes(ev.clientY - startY, hourHeight);
      setResizePreview(null);
      if (delta !== 0) onResize?.(routine, edge, delta);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const Inner = (
    <div className={`flex w-full ${isShort ? "flex-row items-center justify-between" : "flex-col items-center justify-center"} px-1`}>
      <p
        className={`truncate font-semibold leading-tight break-words hyphens-auto ${compact || isShort ? "text-[10px]" : "text-[12px]"}`}
        style={{ color: `color-mix(in oklab, ${routine.color} 85%, var(--foreground))`, wordBreak: "break-word", overflowWrap: "anywhere" }}
      >
        {routine.title}
      </p>
      {showRange && !isShort && (
        <p className="truncate font-mono text-[10px] opacity-70" style={{ color: `color-mix(in oklab, ${routine.color} 75%, var(--foreground))` }}>
          {formatTime(routine.start_time)}-{formatTime(routine.end_time)}
        </p>
      )}
      {isShort && !compact && (
        <span className="text-[9px] font-bold opacity-40 tabular-nums" style={{ color: routine.color }}>
          {formatTime(routine.start_time)}
        </span>
      )}
    </div>
  );

  return (
    <button
      type="button"
      onClick={onClick ? (e) => {
        e.stopPropagation();
        if (suppressClickRef.current) return;
        onClick();
      } : undefined}
      draggable={false}
      onPointerDown={startMove}
      onDragStart={(e) => {
        if (!draggable) return;
        e.dataTransfer.setData("text/calendar-routine", routine.id);
        e.dataTransfer.effectAllowed = "move";
        setIsDragging(true);
      }}
      onDragEnd={() => setIsDragging(false)}
      disabled={!onClick}
      title={onClick ? "Rotina recorrente - clique para editar, arraste para mover" : undefined}
      className={`absolute z-10 left-1 right-1 rounded-md text-left ${compact ? "overflow-hidden" : ""} ${onClick ? "cursor-pointer hover:brightness-110" : "cursor-default"} ${draggable ? "cursor-grab active:cursor-grabbing" : ""} ${isDragging ? "opacity-40 ring-2 ring-primary" : ""}`}
      style={{
        top: renderedTop,
        height: renderedHeight,
        backgroundColor: `color-mix(in oklab, ${routine.color} 18%, transparent)`,
        borderLeft: `3px solid ${routine.color}`,
        clipPath: !compact ? "inset(0 round 0.375rem)" : undefined,
        touchAction: draggable ? "none" : undefined,
        transform: dragOffset ? `translate(${dragOffset.x}px, ${dragOffset.y}px)` : undefined,
      }}
    >
      {canResize && (
        <>
          <span
            data-resize-handle
            className="absolute left-0 right-0 top-0 z-30 h-4 cursor-ns-resize rounded-t-md bg-transparent hover:bg-primary/25"
            onPointerDown={startResize("start")}
            aria-hidden="true"
          />
          <span
            data-resize-handle
            className="absolute bottom-0 left-0 right-0 z-30 h-4 cursor-ns-resize rounded-b-md bg-transparent hover:bg-primary/25"
            onPointerDown={startResize("end")}
            aria-hidden="true"
          />
        </>
      )}
      {compact ? (
        <div className="flex h-full w-full items-center justify-center px-1.5 py-1">{Inner}</div>
      ) : (
        <div className="sticky top-2 px-1.5 py-1" style={{ maxHeight: Math.max(0, renderedHeight - 4) }}>
          {Inner}
        </div>
      )}
    </button>
  );
}
/* -- ROUTINE LEGEND (couple side-by-side) â”€â”€ */
function RoutineLegend({ mine, partner }: { mine: Profile | null; partner: Profile }) {
  return (
    <div className="mb-3 flex items-center justify-center gap-3 rounded-xl border bg-card/60 px-3 py-2 text-xs">
      <div className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: mine?.color ?? "var(--primary)" }} />
        <span className="font-medium">{mine?.display_name ?? "Voce"}</span>
      </div>
      <span className="text-muted-foreground">/</span>
      <div className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: partner.color }} />
        <span className="font-medium">{partner.display_name}</span>
      </div>
    </div>
  );
}

/* â”€â”€ NOW LINE â”€â”€ */
function NowLine({ hourHeight }: { hourHeight: number }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  if (now.getHours() < DAY_START_HOUR) return null;
  const top = eventTopOffset(now, hourHeight);
  const label = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return (
    <div className="pointer-events-none absolute left-0 right-0 z-20 flex items-center" style={{ top }}>
      <span className="ml-0.5 rounded-md bg-destructive px-1 py-px text-[9px] font-bold tabular-nums text-destructive-foreground shadow">
        {label}
      </span>
      <span className="h-0.5 flex-1 bg-destructive" />
    </div>
  );
}




