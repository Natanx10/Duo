import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addDays, addMonths, addWeeks, endOfMonth, endOfWeek, isSameDay, isSameMonth,
  isToday, parseISO, startOfMonth, startOfWeek, subDays, subMonths, subWeeks,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Loader2, Heart, CheckSquare, Square } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  createRoutineException, deleteRoutine,
  fetchCategories, fetchEventsInRange, fetchPartnerProfile, fetchProfile, fetchRoutineExceptions, fetchRoutines,
  fetchTodosWithCalendarInRange, toggleTodoComplete, updateEvent, updateTodo,
  type Category, type EventRow, type Profile, type Routine, type RoutineException, type Todo,
} from "@/lib/data";
import {
  BUSINESS_END_HOUR, BUSINESS_START_HOUR, DAY_START_HOUR, HOURS,
  DENSITY_HOUR_HEIGHT, type CalendarDensity, loadCalendarDensity,
  eventHeight, eventTopOffset, eventsForDay, fmt, formatTime, getMonthGrid,
  getWeekDays, routineHeight, routineTopOffset, routinesForDay,
} from "@/lib/calendar-utils";
import { useUiPrefs, animClass, loadDayZoom, loadWeekZoom, saveDayZoom, saveWeekZoom, DAY_ZOOM_MIN, DAY_ZOOM_MAX, WEEK_ZOOM_MIN, WEEK_ZOOM_MAX } from "@/lib/ui-prefs";
import { EventDialog } from "@/components/EventDialog";
import { TodoDialog } from "@/routes/_app.todos";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

type ViewMode = "day" | "week" | "month";

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
  user_id: string;
  raw: EventRow | Todo;
};

function todoToCalendarItem(t: Todo): CalendarItem {
  const start = new Date(t.due_at!);
  const end = new Date(start.getTime() + (t.duration_minutes ?? 30) * 60_000);
  return {
    id: `todo-${t.id}`,
    kind: "todo",
    title: t.title,
    starts_at: start.toISOString(),
    ends_at: end.toISOString(),
    category_id: t.category_id,
    is_shared: t.is_shared,
    priority: t.priority,
    is_completed: t.is_completed,
    user_id: t.user_id,
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
    user_id: e.user_id,
    raw: e,
  };
}

export const Route = createFileRoute("/_app/calendar")({
  component: CalendarPage,
  head: () => ({ meta: [{ title: "Agenda — Duo" }] }),
});

function CalendarPage() {
  const { user } = useAuth();
  const ui = useUiPrefs();
  const [view, setView] = useState<ViewMode>("day");
  const [density, setDensity] = useState<CalendarDensity>("compact");
  // Zoom multiplier — funciona em dia E semana (pinch / ctrl+wheel) — persistido em localStorage
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
    view === "week" ? Math.max(20, Math.round(baseHourHeight * weekZoom)) :
    view === "day"  ? Math.max(20, Math.round(baseHourHeight * dayZoom))  :
    baseHourHeight;
  const [cursor, setCursor] = useState<Date>(new Date());
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [rawEvents, setRawEvents] = useState<EventRow[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [routineExceptions, setRoutineExceptions] = useState<RoutineException[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [partnerProfile, setPartnerProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [todoDialogOpen, setTodoDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventRow | null>(null);
  const [presetDate, setPresetDate] = useState<Date | undefined>();
  const [presetHour, setPresetHour] = useState<number | undefined>();
  const [routineActionDialog, setRoutineActionDialog] = useState<{ routine: Routine; date: Date } | null>(null);

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

  const reload = useCallback(async () => {
    if (!user) return;
    const startISO = new Date(new Date(range.start).setHours(0, 0, 0, 0)).toISOString();
    const endISO = new Date(new Date(range.end).setHours(23, 59, 59, 999)).toISOString();
    const [evs, todos, cats, profile, rts, exceptions] = await Promise.all([
      fetchEventsInRange(startISO, endISO),
      fetchTodosWithCalendarInRange(startISO, endISO),
      fetchCategories(),
      fetchProfile(user.id),
      fetchRoutines(),
      fetchRoutineExceptions(),
    ]);
    setItems([...evs.map(eventToCalendarItem), ...todos.map(todoToCalendarItem)]);
    setRawEvents(evs);
    setRoutines(rts);
    setRoutineExceptions(exceptions);
    setCategories(cats);
    setCoupleId(profile?.couple_id ?? null);
    setMyProfile(profile);
    if (profile?.couple_id) {
      const partner = await fetchPartnerProfile(profile.couple_id, user.id);
      setPartnerProfile(partner);
    } else {
      setPartnerProfile(null);
    }
    setLoading(false);
  }, [user, range]);

  useEffect(() => { reload(); }, [reload]);

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
    if (view === "day") return fmt(cursor, "EEEE, dd 'de' MMMM");
    if (view === "week") {
      const s = startOfWeek(cursor, { weekStartsOn: 0 });
      const e = endOfWeek(cursor, { weekStartsOn: 0 });
      return `${fmt(s, "dd MMM")} – ${fmt(e, "dd MMM")}`;
    }
    return fmt(cursor, "MMMM yyyy");
  }, [view, cursor]);

  const openCreate = (date?: Date, hour?: number) => {
    setTodoDialogOpen(false);
    setEditingEvent(null);
    setPresetDate(date);
    setPresetHour(hour);
    setDialogOpen(true);
  };

  const openTodoCreate = () => {
    setDialogOpen(false);
    setEditingEvent(null);
    setTodoDialogOpen(true);
  };

  const handleEventDialogChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      // Clear edit state when closing so next open is clean
      setEditingEvent(null);
      setPresetDate(undefined);
      setPresetHour(undefined);
    }
  };

  const openItem = async (item: CalendarItem) => {
    if (item.kind === "event") {
      setTodoDialogOpen(false);
      setEditingEvent(item.raw as EventRow);
      setPresetDate(undefined);
      setPresetHour(undefined);
      setDialogOpen(true);
    } else {
      const todo = item.raw as Todo;
      try {
        await toggleTodoComplete(todo.id, !todo.is_completed);
        toast.success(todo.is_completed ? "Tarefa reaberta" : "Tarefa concluída ✅");
        reload();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro");
      }
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

      // Optimistic UI
      setItems((prev) =>
        prev.map((it) =>
          it.id === item.id
            ? { ...it, starts_at: newStart.toISOString(), ends_at: newEnd.toISOString() }
            : it
        )
      );

      if (item.kind === "event") {
        const ev = item.raw as EventRow;
        await updateEvent(ev.id, {
          starts_at: newStart.toISOString(),
          ends_at: newEnd.toISOString(),
        });
      } else {
        const td = item.raw as Todo;
        await updateTodo(td.id, { due_at: newStart.toISOString() });
      }
      toast.success("Reagendado para " + fmt(newStart, "dd/MM HH:mm"));
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao reagendar");
      reload();
    }
  };

  const openRoutine = (routine: Routine, date: Date) => {
    setRoutineActionDialog({ routine, date });
  };

  const handleRoutineSkipDay = async () => {
    if (!routineActionDialog || !user) return;
    const { routine, date } = routineActionDialog;
    try {
      await createRoutineException(routine.id, user.id, date);
      toast.success("Rotina ignorada nesse dia");
      setRoutineActionDialog(null);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    }
  };

  const handleRoutineDeleteSeries = async () => {
    if (!routineActionDialog) return;
    const { routine } = routineActionDialog;
    try {
      await deleteRoutine(routine.id);
      toast.success("Rotina removida");
      setRoutineActionDialog(null);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    }
  };

  return (
    <div className="px-4 pt-6 animate-fade-in">
      {/* Header */}
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold capitalize tracking-tight">{headerLabel}</h1>
          <button
            onClick={() => setCursor(new Date())}
            className="mt-0.5 text-xs font-medium text-primary"
          >
            Hoje
          </button>
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
            {v === "day" ? "Dia" : v === "week" ? "Semana" : "Mês"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {partnerProfile && (view === "day" || view === "week") && (
            <RoutineLegend mine={myProfile} partner={partnerProfile} />
          )}
          {view === "day" ? (
            <DayView day={cursor} items={items} routines={routines} routineExceptions={routineExceptions} categories={categories} userId={user?.id ?? null} partnerId={partnerProfile?.id ?? null} hourHeight={hourHeight} ui={ui} onSlotClick={openCreate} onItemClick={openItem} onRoutineClick={openRoutine} onReschedule={rescheduleItem} dayZoom={dayZoom} setDayZoom={setDayZoom} />
          ) : view === "week" ? (
            <WeekView cursor={cursor} items={items} routines={routines} routineExceptions={routineExceptions} categories={categories} userId={user?.id ?? null} partnerId={partnerProfile?.id ?? null} hourHeight={hourHeight} ui={ui} onSlotClick={openCreate} onItemClick={openItem} onRoutineClick={openRoutine} setView={setView} setCursor={setCursor} onReschedule={rescheduleItem} weekZoom={weekZoom} setWeekZoom={setWeekZoom} />
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
        onSaved={reload}
      />
      <TodoDialog
        open={todoDialogOpen}
        onOpenChange={setTodoDialogOpen}
        todo={null}
        categories={categories}
        coupleId={coupleId}
        onSaved={reload}
      />

      <AlertDialog open={!!routineActionDialog} onOpenChange={(v) => !v && setRoutineActionDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rotina recorrente</AlertDialogTitle>
            <AlertDialogDescription>
              "{routineActionDialog?.routine.title}" se repete toda semana. O que você quer fazer?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
            <AlertDialogAction
              onClick={handleRoutineSkipDay}
              className="w-full bg-warning text-warning-foreground hover:bg-warning/90"
            >
              Pular só este dia
            </AlertDialogAction>
            {routineActionDialog && user && routineActionDialog.routine.user_id === user.id && (
              <AlertDialogAction
                onClick={handleRoutineDeleteSeries}
                className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir toda a rotina
              </AlertDialogAction>
            )}
            <AlertDialogCancel className="w-full mt-0">Cancelar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

type UiPrefs = ReturnType<typeof useUiPrefs>;

/* ── DAY VIEW (single column, hour blocks 5h-23h) ── */
function DayView({ day, items, routines, routineExceptions, categories, userId, partnerId, hourHeight, ui, onSlotClick, onItemClick, onRoutineClick, onReschedule, dayZoom, setDayZoom }: {
  day: Date; items: CalendarItem[]; routines: Routine[]; routineExceptions: RoutineException[]; categories: Category[];
  userId: string | null; partnerId: string | null; hourHeight: number; ui: UiPrefs;
  onSlotClick: (d: Date, h: number) => void;
  onItemClick: (i: CalendarItem) => void;
  onRoutineClick: (r: Routine, d: Date) => void;
  onReschedule: (item: CalendarItem, day: Date, hour: number, minute?: number) => void;
  dayZoom: number;
  setDayZoom: React.Dispatch<React.SetStateAction<number>>;
}) {
  const dayItems = eventsForDay(items, day);
  const dayRoutines = filterRoutinesByExceptions(routinesForDay(routines, day), routineExceptions, day);
  const hasPartner = !!partnerId;
  const mineRoutines = dayRoutines.filter((r) => r.user_id === userId);
  const partnerRoutines = dayRoutines.filter((r) => r.user_id === partnerId);
  const mineItems = dayItems.filter((it) => !it.is_shared && it.user_id === userId);
  const partnerItems = dayItems.filter((it) => !it.is_shared && it.user_id === partnerId);
  const sharedItems = dayItems.filter((it) => it.is_shared);
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
    const item = items.find((it) => it.id === id);
    if (!item) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const minute = offsetY > rect.height / 2 ? 30 : 0;
    setDragOverHour(null);
    onReschedule(item, day, h, minute);
  };

  // Scale hour-label typography with zoom so labels and half-hour marks stay perfectly aligned
  const labelFontPx = Math.max(9, Math.min(14, Math.round(hourHeight * 0.22)));
  const labelLineH  = `${Math.round(hourHeight * 0.9)}px`;
  return (
    <div ref={scrollRef} className="overflow-auto rounded-2xl border bg-card shadow-sm" style={{ maxHeight: "65vh" }} onWheel={onWheel} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <div className="relative min-w-[18rem]" style={{ height: HOURS.length * hourHeight }}>
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
              {/* half-hour mark — scales with zoom */}
              <span
                className="pointer-events-none absolute left-11 right-0 border-t border-dashed border-border/30"
                style={{ top: hourHeight / 2 }}
              />
            </button>
          );
        })}

        {/* Routines + items split by person if couple */}
        {hasPartner ? (
          <>
            {/* Mine column */}
            <div className="absolute left-12 right-[calc(50%+0.375rem)] top-0 bottom-0">
              {mineRoutines.map((r) => (
                <RoutineBlock hourHeight={hourHeight} key={r.id} routine={r} onClick={() => onRoutineClick(r, day)} />
              ))}
              {mineItems.map((it) => (
                <ItemBlock ui={ui} hourHeight={hourHeight} key={it.id} item={it} categories={categories} onClick={onItemClick} draggable />
              ))}
            </div>
            <div className="pointer-events-none absolute bottom-0 left-1/2 top-0 w-px bg-border/50" />
            {/* Partner column */}
            <div className="absolute left-[calc(50%+0.375rem)] right-3 top-0 bottom-0">
              {partnerRoutines.map((r) => (
                <RoutineBlock hourHeight={hourHeight} key={r.id} routine={r} onClick={() => onRoutineClick(r, day)} />
              ))}
              {partnerItems.map((it) => (
                <ItemBlock ui={ui} hourHeight={hourHeight} key={it.id} item={it} categories={categories} onClick={onItemClick} draggable />
              ))}
            </div>
            {/* Shared items span both columns */}
            <div className="absolute left-12 right-3 top-0 bottom-0 pointer-events-none">
              {sharedItems.map((it) => (
                <div key={it.id} className="pointer-events-auto">
                  <ItemBlock ui={ui} hourHeight={hourHeight} item={it} categories={categories} onClick={onItemClick} draggable />
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="absolute left-12 right-3 top-0 bottom-0">
            {dayRoutines.map((r) => (
              <RoutineBlock hourHeight={hourHeight} key={r.id} routine={r} onClick={() => onRoutineClick(r, day)} />
            ))}
            {dayItems.map((it) => (
              <ItemBlock ui={ui} hourHeight={hourHeight} key={it.id} item={it} categories={categories} onClick={onItemClick} draggable />
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

/* ── WEEK VIEW ── */
function WeekView({
  cursor, items, routines, routineExceptions, categories, userId, partnerId, hourHeight, ui, onSlotClick, onItemClick, onRoutineClick, setView, setCursor, onReschedule, weekZoom, setWeekZoom,
}: {
  cursor: Date; items: CalendarItem[]; routines: Routine[]; routineExceptions: RoutineException[]; categories: Category[];
  userId: string | null; partnerId: string | null; hourHeight: number; ui: UiPrefs;
  onSlotClick: (d: Date, h: number) => void;
  onItemClick: (i: CalendarItem) => void;
  onRoutineClick: (r: Routine, d: Date) => void;
  setView: (v: ViewMode) => void; setCursor: (d: Date) => void;
  onReschedule: (item: CalendarItem, day: Date, hour: number, minute?: number) => void;
  weekZoom: number;
  setWeekZoom: React.Dispatch<React.SetStateAction<number>>;
}) {
  const days = getWeekDays(cursor);
  const hasPartner = !!partnerId;
  const scrollRef = useRef<HTMLDivElement>(null);
  const pinchStateRef = useRef<{ initialDist: number; initialZoom: number } | null>(null);
  const [dragOver, setDragOver] = useState<{ dayKey: string; h: number; m: number } | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = Math.max(0, (8 - DAY_START_HOUR) * hourHeight);
      // Ao abrir a semana, rolar horizontalmente até o dia atual
      const todayIdx = days.findIndex((d) => isToday(d));
      if (todayIdx >= 0) {
        const colPx = ui.weekColWidth * 16; // rem → px aprox
        scrollRef.current.scrollLeft = Math.max(0, todayIdx * colPx - colPx / 2);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor]);

  const handleDrop = (e: React.DragEvent, d: Date, h: number) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/calendar-item");
    const item = items.find((it) => it.id === id);
    if (!item) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const minute = offsetY > rect.height / 2 ? 30 : 0;
    setDragOver(null);
    onReschedule(item, d, h, minute);
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
        style={{ maxHeight: "65vh" }}
        onWheel={onWheel}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div style={{ minWidth: `${ui.weekColWidth * 7 + 2.5}rem` }}>
          {/* Day headers — opaco, sem transparência; coluna de hora sticky */}
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
                  className={`flex flex-col items-center gap-0.5 px-1 py-1.5 transition-colors hover:bg-muted ${
                    today ? "bg-primary/10" : ""
                  }`}
                >
                  <span
                    className="block w-full text-center text-[11px] font-semibold uppercase leading-tight tracking-wide text-muted-foreground break-words hyphens-auto"
                    style={{ wordBreak: "break-word" }}
                  >
                    {fmt(d, "EEEE")}
                  </span>
                  <span className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold tabular-nums ${
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
            {/* Hour labels column — sticky horizontal, escala com o zoom */}
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
              const mineRoutines = dayRoutines.filter((r) => r.user_id === userId);
              const partnerRoutines = dayRoutines.filter((r) => r.user_id === partnerId);
              const mineItems = dayItems.filter((it) => !it.is_shared && it.user_id === userId);
              const partnerItems = dayItems.filter((it) => !it.is_shared && it.user_id === partnerId);
              const sharedItems = dayItems.filter((it) => it.is_shared);
              const todayCol = isToday(d);
              const dayKey = d.toISOString();
              return (
                <div key={dayKey} className={`relative border-l border-border/60 ${todayCol ? "bg-primary/5" : ""}`}>
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
                  {hasPartner ? (
                    <>
                      {/* Mine */}
                      <div className="absolute inset-y-0 left-0.5 right-[calc(50%+0.25rem)]">
                        {mineRoutines.map((r) => (
                          <RoutineBlock hourHeight={hourHeight} key={r.id} routine={r} compact onClick={() => onRoutineClick(r, d)} />
                        ))}
                        {mineItems.map((it) => (
                          <ItemBlock ui={ui} hourHeight={hourHeight} key={it.id} item={it} categories={categories} onClick={onItemClick} compact draggable />
                        ))}
                      </div>
                      {/* Partner */}
                      <div className="absolute inset-y-0 left-[calc(50%+0.25rem)] right-0.5">
                        {partnerRoutines.map((r) => (
                          <RoutineBlock hourHeight={hourHeight} key={r.id} routine={r} compact onClick={() => onRoutineClick(r, d)} />
                        ))}
                        {partnerItems.map((it) => (
                          <ItemBlock ui={ui} hourHeight={hourHeight} key={it.id} item={it} categories={categories} onClick={onItemClick} compact draggable />
                        ))}
                      </div>
                      {/* Shared spans full width */}
                      {sharedItems.map((it) => (
                        <ItemBlock ui={ui} hourHeight={hourHeight} key={it.id} item={it} categories={categories} onClick={onItemClick} compact draggable />
                      ))}
                    </>
                  ) : (
                    <div className="absolute inset-0">
                      {dayRoutines.map((r) => (
                        <RoutineBlock hourHeight={hourHeight} key={r.id} routine={r} compact onClick={() => onRoutineClick(r, d)} />
                      ))}
                      {dayItems.map((it) => (
                        <ItemBlock ui={ui} hourHeight={hourHeight} key={it.id} item={it} categories={categories} onClick={onItemClick} compact draggable />
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

/* ── MONTH VIEW ── */
function MonthView({ cursor, items, routines, routineExceptions, categories, onDayClick, onItemClick }: {
  cursor: Date; items: CalendarItem[]; routines: Routine[]; routineExceptions: RoutineException[]; categories: Category[];
  onDayClick: (d: Date) => void;
  onItemClick: (i: CalendarItem) => void;
}) {
  const days = getMonthGrid(cursor);
  return (
    <div className="rounded-2xl border bg-card overflow-hidden">
      <div className="grid grid-cols-7 border-b bg-muted/30 text-center text-[10px] font-medium uppercase text-muted-foreground">
        {["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map((d) => (
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
                      {it.kind === "todo" ? "✓ " : ""}{it.title}
                    </button>
                  );
                })}
                {dayItems.length > 2 && (
                  <span className="text-[9px] text-muted-foreground">+{dayItems.length - 2}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── ITEM BLOCK (event or todo) ── */
function ItemBlock({ item, categories, onClick, compact, draggable, hourHeight, ui }: {
  item: CalendarItem; categories: Category[];
  onClick: (i: CalendarItem) => void; compact?: boolean; draggable?: boolean; hourHeight: number;
  ui: UiPrefs;
}) {
  const start = parseISO(item.starts_at);
  const end = parseISO(item.ends_at);
  const cat = categories.find((c) => c.id === item.category_id);
  const color = cat?.color ?? (item.priority === 3 ? "#ef4444" : item.priority === 2 ? "#f59e0b" : "#6366f1");
  const top = eventTopOffset(start, hourHeight);
  const height = eventHeight(start, end, hourHeight);
  const isTodo = item.kind === "todo";
  const done = item.is_completed;
  const isImportant = item.priority >= 2 && !done;
  const isCouple = item.is_shared && !done;
  const animationClass = [
    isImportant ? animClass(ui.important) : "",
    isCouple ? animClass(ui.couple) : "",
  ].filter(Boolean).join(" ");
  const [isDragging, setIsDragging] = useState(false);
  const isShort = height < 32;
  const padPx = isShort ? "2px 6px" : `${ui.itemPadding}px`;

  const InnerContent = (
    <div className={`flex w-full ${isShort ? "flex-row items-center justify-between" : (compact ? "flex-col items-center justify-center" : "flex-col items-start")}`}>
      <div className={`flex items-center gap-1.5 min-w-0 ${isShort ? "flex-1" : ""}`}>
        {isTodo ? (
          done ? (
            <CheckSquare className="h-3 w-3 shrink-0" style={{ color }} fill="currentColor" />
          ) : (
            <Square className="h-3 w-3 shrink-0" style={{ color }} />
          )
        ) : item.is_shared ? (
          <Heart className="h-3 w-3 shrink-0" style={{ color }} fill="currentColor" />
        ) : null}
        <p
          className={`truncate font-bold leading-none ${isShort ? "text-[11px]" : (compact ? "text-[10px]" : "text-[13px]")} ${done ? "line-through opacity-70" : ""}`}
          style={{ color, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
        >
          {item.title}
        </p>
      </div>
      {!compact && !isShort && (
        <p className="mt-0.5 truncate text-[11px] font-medium tabular-nums text-muted-foreground opacity-80">
          {fmt(start, "HH:mm")}–{fmt(end, "HH:mm")}
        </p>
      )}
      {isShort && !compact && (
        <span className="shrink-0 text-[9px] font-semibold tabular-nums text-muted-foreground opacity-60">
          {fmt(start, "HH:mm")}
        </span>
      )}
    </div>
  );

  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(item); }}
      draggable={draggable}
      onDragStart={(e) => {
        if (!draggable) return;
        e.dataTransfer.setData("text/calendar-item", item.id);
        e.dataTransfer.effectAllowed = "move";
        setIsDragging(true);
      }}
      onDragEnd={() => setIsDragging(false)}
      title={draggable ? "Arraste para reagendar" : undefined}
      className={`absolute left-1 right-1 rounded-lg text-left shadow-sm transition-all hover:shadow-md ${
        isTodo ? "border border-dashed" : "border-l-[3px]"
      } ${done ? "opacity-60" : ""} ${compact ? "overflow-hidden" : ""} ${draggable ? "cursor-grab active:cursor-grabbing" : ""} ${isDragging ? "opacity-40 ring-2 ring-primary" : ""} ${animationClass}`}
      style={{
        top: top + 2,
        height: Math.max(20, height - 4),
        borderColor: isTodo ? color : undefined,
        borderLeftColor: !isTodo ? color : undefined,
        backgroundColor: `color-mix(in oklab, ${color} ${isTodo ? 14 : 22}%, var(--card))`,
        clipPath: !compact ? "inset(0 round 0.5rem)" : undefined,
      }}
    >
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
          style={{ padding: padPx, maxHeight: Math.max(0, height - 8) }}
        >
          {InnerContent}
        </div>
      )}
      {item.priority >= 2 && (
        <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: item.priority === 3 ? "#ef4444" : "#f59e0b" }} />
      )}
    </button>
  );
}

/* ── ROUTINE BLOCK (translucent background, recurring) ── */
function RoutineBlock({ routine, compact, onClick, hourHeight }: { routine: Routine; compact?: boolean; onClick?: () => void; hourHeight: number }) {
  const top = routineTopOffset(routine.start_time, hourHeight);
  const height = routineHeight(routine.start_time, routine.end_time, hourHeight);
  const isShort = height < 28;
  const showRange = !compact && height >= 36;
  
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
          {formatTime(routine.start_time)}–{formatTime(routine.end_time)}
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
      onClick={onClick ? (e) => { e.stopPropagation(); onClick(); } : undefined}
      disabled={!onClick}
      title={onClick ? "Rotina recorrente — clique para editar" : undefined}
      className={`absolute left-1 right-1 rounded-md text-left ${compact ? "overflow-hidden" : ""} ${onClick ? "cursor-pointer hover:brightness-110" : "cursor-default"}`}
      style={{
        top: top + 2,
        height: Math.max(20, height - 4),
        backgroundColor: `color-mix(in oklab, ${routine.color} 18%, transparent)`,
        borderLeft: `3px solid ${routine.color}`,
        clipPath: !compact ? "inset(0 round 0.375rem)" : undefined,
      }}
    >
      {compact ? (
        <div className="flex h-full w-full items-center justify-center px-1.5 py-1">{Inner}</div>
      ) : (
        <div className="sticky top-2 px-1.5 py-1" style={{ maxHeight: Math.max(0, height - 8) }}>
          {Inner}
        </div>
      )}
    </button>
  );
}

/* ── ROUTINE LEGEND (couple side-by-side) ── */
function RoutineLegend({ mine, partner }: { mine: Profile | null; partner: Profile }) {
  return (
    <div className="mb-3 flex items-center justify-center gap-3 rounded-xl border bg-card/60 px-3 py-2 text-xs">
      <div className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: mine?.color ?? "var(--primary)" }} />
        <span className="font-medium">{mine?.display_name ?? "Você"}</span>
      </div>
      <span className="text-muted-foreground">·</span>
      <div className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: partner.color }} />
        <span className="font-medium">{partner.display_name}</span>
      </div>
    </div>
  );
}

/* ── NOW LINE ── */
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
