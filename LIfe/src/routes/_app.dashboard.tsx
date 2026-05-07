import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { addDays, addHours, isAfter, isToday, parseISO, startOfDay, endOfDay } from "date-fns";
import { Heart, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchCategories, fetchEventsInRange, fetchProfile, fetchRoutineExceptions, fetchRoutines, fetchTodos,
  toggleTodoComplete, fetchStickers, type Category, type EventRow, type Profile, type Routine, type RoutineException, type Todo,
} from "@/lib/data";
import { routinesForDay } from "@/lib/calendar-utils";
import { EventDialog } from "@/components/EventDialog";
import { TodoDialog } from "@/routes/_app.todos";

import couplePardoBranca from "@/assets/couple-pardo-branca.png";

// Prefs
import { useUiPrefs, animClass, particleVars, resolveHeroImage, activeIllustrationCropStyle, type BuiltInIllustrationId, saveCustomIllustrations } from "@/lib/ui-prefs";

// Dashboard Components
import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { ConflictsList } from "@/components/dashboard/ConflictsList";
import { ImportantEventsList } from "@/components/dashboard/ImportantEventsList";
import { DashboardTodosList } from "@/components/dashboard/DashboardTodosList";
import { TodayRoutinesList } from "@/components/dashboard/TodayRoutinesList";
import { UpcomingEventsList } from "@/components/dashboard/UpcomingEventsList";
import { DashboardQuickActions } from "@/components/dashboard/DashboardQuickActions";

export const Route = createFileRoute("/_app/dashboard")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Início — Duo" }] }),
});

function Dashboard() {
  const { user } = useAuth();
  const ui = useUiPrefs();
  const emptyAnim = animClass(ui.empty);
  const importantTaskAnim = animClass(ui.importantTask);
  const importantEventAnim = animClass(ui.importantEvent);
  const coupleAnim = animClass(ui.couple);
  
  const heroImageSrc = resolveHeroImage({
    sticker: ui.sticker,
    illustration: ui.illustration,
    customStickers: ui.customStickers,
    customIllustrations: ui.customIllustrations,
    builtInIllustrations: { "pardo-branca": couplePardoBranca, "couple": couplePardoBranca } as any,
  });
  const heroFallbackSrc = couplePardoBranca;
  const heroAppliesTo = (t: "hero" | "empty" | "login") => ui.heroTargets.includes(t);
  const heroSrcFor = (t: "hero" | "empty" | "login") => (heroAppliesTo(t) ? heroImageSrc : heroFallbackSrc);
  const heroCropFor = (t: "hero" | "empty" | "login") =>
    heroAppliesTo(t) ? activeIllustrationCropStyle(ui.illustration, ui.customIllustrations) : { objectFit: "contain" as const, objectPosition: "center" as const };
  const heroScale = ui.heroScale;
  
  const particlesImpStyle = particleVars(ui.particlesImportant.intensity, ui.particlesImportant.density);
  const particlesCplStyle = particleVars(ui.particlesCouple.intensity, ui.particlesCouple.density);
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [routineExceptions, setRoutineExceptions] = useState<RoutineException[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [todoDialogOpen, setTodoDialogOpen] = useState(false);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  }, []);

  const reload = useCallback(async () => {
    if (!user) return;
    const [p, evs, ts, rts, cats, excs] = await Promise.all([
      fetchProfile(user.id),
      fetchEventsInRange(startOfDay(new Date()).toISOString(), endOfDay(addDays(new Date(), 7)).toISOString()),
      fetchTodos(),
      fetchRoutines(),
      fetchCategories(),
      fetchRoutineExceptions(),
    ]);
    
    if (p?.couple_id) {
      try {
        const stickers = await fetchStickers(p.couple_id);
        const illustrations = stickers.map(s => ({
          id: s.id,
          label: s.label || "Figurinha",
          dataUrl: s.image_url,
          crop: { zoom: 1, offsetX: 0, offsetY: 0 }
        }));
        // Preserva o crop (zoom/pan) se a figurinha já existia no localStorage
        const existing = JSON.parse(localStorage.getItem("duo:custom-illustrations") || "[]");
        const merged = illustrations.map(ill => {
          const ex = existing.find((e: any) => e.id === ill.id);
          if (ex && ex.crop) return { ...ill, crop: ex.crop };
          return ill;
        });
        saveCustomIllustrations(merged);
      } catch (err) {
        console.error("Erro ao carregar figurinhas do casal", err);
      }
    }

    setProfile(p);
    setEvents(evs);
    setTodos(ts);
    setRoutines(rts);
    setCategories(cats);
    setRoutineExceptions(excs);
    setLoading(false);
  }, [user]);

  useEffect(() => { reload(); }, [reload]);

  const handleToggleTodo = async (t: Todo) => {
    try {
      await toggleTodoComplete(t.id, !t.is_completed);
      toast.success(t.is_completed ? "Reaberta" : "Concluída ✓");
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    }
  };

  const now = new Date();
  const todayEvents = events.filter((e) => isToday(parseISO(e.starts_at)));
  const futureSorted = events.filter((e) => isAfter(parseISO(e.ends_at), now));
  const nextEvent = futureSorted[0];
  const upcoming = (nextEvent ? futureSorted.slice(1) : futureSorted).slice(0, 5);
  const importantEvents = events.filter((e) => e.priority >= 2 && isAfter(parseISO(e.ends_at), now)).slice(0, 3);
  
  const todayDateStr = (() => {
    const d = now;
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  })();
  const skippedTodayIds = new Set(
    routineExceptions.filter((e) => e.exception_date === todayDateStr).map((e) => e.routine_id)
  );
  const todayRoutines = routinesForDay(routines, now).filter((r) => !skippedTodayIds.has(r.id));

  const horizon = addHours(now, 48);
  const dashboardTodos = todos
    .filter((t) => !t.is_completed)
    .filter((t) => {
      if (!t.due_at) return false;
      const d = parseISO(t.due_at);
      return d <= horizon;
    })
    .sort((a, b) => {
      const ad = a.due_at ? parseISO(a.due_at).getTime() : 0;
      const bd = b.due_at ? parseISO(b.due_at).getTime() : 0;
      return ad - bd;
    })
    .slice(0, 5);

  const conflictsToday = useMemo(() => {
    const list: Array<{ event: EventRow; routine: Routine }> = [];
    const dow = now.getDay();
    const dayRoutines = routines.filter((r) => r.day_of_week === dow && !skippedTodayIds.has(r.id));
    for (const ev of todayEvents) {
      const es = parseISO(ev.starts_at);
      const ee = parseISO(ev.ends_at);
      for (const r of dayRoutines) {
        const [sh, sm] = r.start_time.split(":").map(Number);
        const [eh, em] = r.end_time.split(":").map(Number);
        const rs = new Date(now); rs.setHours(sh, sm ?? 0, 0, 0);
        const re = new Date(now); re.setHours(eh, em ?? 0, 0, 0);
        if (rs < ee && re > es) list.push({ event: ev, routine: r });
      }
    }
    return list.slice(0, 2);
  }, [events, routines, todayEvents, now, skippedTodayIds]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 animate-fade-in">
      <header className="mb-6">
        <p className="text-sm text-muted-foreground">{greeting},</p>
        <h1 className="text-3xl font-bold tracking-tight">{profile?.display_name ?? "você"}</h1>
      </header>

      {!profile?.couple_id && (
        <Link
          to="/profile"
          className="mb-5 flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 transition-all hover:bg-primary/10"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
            <Heart className="h-5 w-5 text-primary" fill="currentColor" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">Vincule seu par</p>
            <p className="text-xs text-muted-foreground">Compartilhe compromissos em conjunto</p>
          </div>
        </Link>
      )}

      <DashboardHero 
        nextEvent={nextEvent}
        emptyAnim={emptyAnim}
        heroScale={heroScale}
        heroSrcFor={heroSrcFor}
        heroFallbackSrc={heroFallbackSrc}
        heroCropFor={heroCropFor}
        todayEventsCount={todayEvents.length}
        dashboardTodosCount={dashboardTodos.length}
      />

      <ConflictsList conflictsToday={conflictsToday} />

      <ImportantEventsList 
        importantEvents={importantEvents}
        categories={categories}
        importantEventAnim={importantEventAnim}
        coupleAnim={coupleAnim}
        particlesImpStyle={particlesImpStyle}
        particlesCplStyle={particlesCplStyle}
      />

      <DashboardTodosList 
        dashboardTodos={dashboardTodos}
        now={now}
        importantTaskAnim={importantTaskAnim}
        coupleAnim={coupleAnim}
        particlesImpStyle={particlesImpStyle}
        particlesCplStyle={particlesCplStyle}
        onToggleTodo={handleToggleTodo}
      />

      <TodayRoutinesList todayRoutines={todayRoutines} />

      <UpcomingEventsList 
        upcoming={upcoming}
        categories={categories}
        heroScale={heroScale}
        heroSrcFor={heroSrcFor}
        heroFallbackSrc={heroFallbackSrc}
        heroCropFor={heroCropFor}
      />

      <DashboardQuickActions 
        onOpenEventDialog={() => { setTodoDialogOpen(false); setDialogOpen(true); }}
        onOpenTodoDialog={() => { setDialogOpen(false); setTodoDialogOpen(true); }}
      />

      <EventDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        categories={categories}
        coupleId={profile?.couple_id ?? null}
        existingEvents={events}
        routines={routines}
        onSaved={reload}
      />
      <TodoDialog
        open={todoDialogOpen}
        onOpenChange={setTodoDialogOpen}
        todo={null}
        categories={categories}
        coupleId={profile?.couple_id ?? null}
        onSaved={reload}
      />
    </div>
  );
}
