import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { addDays, addHours, isAfter, isToday, parseISO, startOfDay, endOfDay } from "date-fns";
import { Heart, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
  toggleTodoComplete,
  type EventRow, type Routine,
} from "@/lib/data";
import { 
  useProfile, useEvents, useTodos, useRoutines, useCategories, 
  useRoutineExceptions, useReminders, useStickers, useApiMutation, QUERY_KEYS 
} from "@/hooks/useData";
import { useQueryClient } from "@tanstack/react-query";
import { routinesForDay } from "@/lib/calendar-utils";
import { EventDialog } from "@/components/EventDialog";
import { TodoDialog } from "@/routes/_app.todos";
import { describeReminderBody, scheduleAll } from "@/lib/notifications";

import couplePardoBranca from "@/assets/couple-pardo-branca.png";

// Prefs
import { useUiPrefs, animClass, particleVars, resolveHeroImage, activeIllustrationCropStyle, type BuiltInIllustrationId, type HeroTarget, saveCustomIllustrations } from "@/lib/ui-prefs";

// Dashboard Components
import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { ConflictsList } from "@/components/dashboard/ConflictsList";
import { ImportantEventsList } from "@/components/dashboard/ImportantEventsList";
import { DashboardTodosList } from "@/components/dashboard/DashboardTodosList";
import { TodayRoutinesList } from "@/components/dashboard/TodayRoutinesList";
import { UpcomingEventsList } from "@/components/dashboard/UpcomingEventsList";
import { DashboardQuickActions } from "@/components/dashboard/DashboardQuickActions";
import type { DashboardScheduleItem } from "@/components/dashboard/types";

import stickerCats from "@/assets/sticker-cats.png";
import stickerCoffeeMug from "@/assets/sticker-coffee-mug.png";
import stickerHeart from "@/assets/sticker-heart.png";
import stickerPlanet from "@/assets/sticker-planet.png";
import stickerStar from "@/assets/sticker-star.png";

export const Route = createFileRoute("/_app/dashboard")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Início — Duo" }] }),
});

function Dashboard() {
  const { user } = useAuth();
  const ui = useUiPrefs();
  const queryClient = useQueryClient();
  const emptyAnim = animClass(ui.empty);
  const importantTaskAnim = animClass(ui.importantTask);
  const importantEventAnim = animClass(ui.importantEvent);
  const coupleAnim = animClass(ui.couple);
  
  const builtInStickers = {
    "cats": stickerCats,
    "coffee-mug": stickerCoffeeMug,
    "heart": stickerHeart,
    "planet": stickerPlanet,
    "star": stickerStar,
  } as any;

  const builtInIllustrations = { "pardo-branca": couplePardoBranca, "couple": couplePardoBranca, ...builtInStickers } as any;
  const heroFallbackSrc = couplePardoBranca;
  const heroAppliesTo = (t: HeroTarget) => Boolean(ui.heroTargetIllustrations[t]);
  const illustrationFor = (t: HeroTarget) => ui.heroTargetIllustrations[t] ?? ui.illustration;
  const heroSrcFor = (t: HeroTarget) => {
    if (!heroAppliesTo(t)) return heroFallbackSrc;
    return resolveHeroImage({
      sticker: "none",
      illustration: illustrationFor(t),
      customStickers: ui.customStickers,
      customIllustrations: ui.customIllustrations,
      builtInIllustrations,
    });
  };
  const heroCropFor = (t: HeroTarget) =>
    heroAppliesTo(t) ? activeIllustrationCropStyle(illustrationFor(t), ui.customIllustrations) : { objectFit: "contain" as const, objectPosition: "center" as const };
  const heroScale = ui.heroScale;
  
  const particlesImpStyle = particleVars(ui.particlesImportant.intensity, ui.particlesImportant.density, ui.particlesImportant.brightness, ui.particlesImportant.color);
  const particlesCplStyle = particleVars(ui.particlesCouple.intensity, ui.particlesCouple.density, ui.particlesCouple.brightness, ui.particlesCouple.color);
  
  const { data: profile, isLoading: loadingProfile, isPending: pendingProfile, isFetching: fetchingProfile, error: profileError, status: profileStatus } = useProfile(user?.id);
  const coupleId = profile?.couple_id ?? null;
  const { data: events = [] } = useEvents(
    startOfDay(new Date()).toISOString(), 
    endOfDay(addDays(new Date(), 7)).toISOString(),
    coupleId,
    user?.id
  );
  const { data: todos = [] } = useTodos(coupleId, user?.id);
  const { data: routines = [] } = useRoutines(coupleId, user?.id);
  const { data: routineExceptions = [] } = useRoutineExceptions(coupleId, user?.id);
  const { data: categories = [] } = useCategories(coupleId, user?.id);
  const { data: reminders = [] } = useReminders(user?.id);
  const { data: stickers = [] } = useStickers(profile?.couple_id);

  // DEBUG: remove after fixing
  console.log("[Dashboard DEBUG]", {
    userId: user?.id,
    userEmail: user?.email,
    profileStatus,
    loadingProfile,
    pendingProfile,
    fetchingProfile,
    profileError: profileError?.message,
    profile: profile ? { id: profile.id, display_name: profile.display_name, couple_id: profile.couple_id } : null,
    coupleId,
    eventsCount: events.length,
    todosCount: todos.length,
    routinesCount: routines.length,
    categoriesCount: categories.length,
  });

  // In TanStack Query v5, disabled queries have isLoading=false (isPending && !isFetching)
  // so we only need to wait for profile to load
  const loading = loadingProfile;
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [todoDialogOpen, setTodoDialogOpen] = useState(false);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  }, []);

  // Side effects: Stickers and Reminders
  useEffect(() => {
    if (stickers.length > 0) {
      const illustrations = stickers.map(s => ({
        id: s.id,
        label: s.label || "Figurinha",
        dataUrl: s.image_url,
        crop: { zoom: 1, offsetX: 0, offsetY: 0 }
      }));
      const existing = JSON.parse(localStorage.getItem("duo:custom-illustrations") || "[]");
      const dbIds = new Set(illustrations.map((ill) => ill.id));
      const merged = [
        ...existing.filter((ex: any) => ex?.id && !dbIds.has(ex.id)),
        ...illustrations.map(ill => {
          const ex = existing.find((e: any) => e.id === ill.id);
          if (ex && ex.crop) return { ...ill, crop: ex.crop };
          return ill;
        }),
      ];
      saveCustomIllustrations(merged);
    }
  }, [stickers]);

  useEffect(() => {
    if (reminders.length > 0) {
      scheduleAll(reminders.filter(r => r.is_active).map(r => ({
        id: r.id,
        title: r.title,
        body: describeReminderBody(r),
        remindTime: r.remind_time,
        remindAt: r.remind_at,
        daysOfWeek: r.days_of_week
      })));
    }
  }, [reminders]);

  const toggleTodoMutation = useApiMutation(
    ({ id, isCompleted }: { id: string; isCompleted: boolean }) => toggleTodoComplete(id, isCompleted),
    [QUERY_KEYS.todos]
  );

  const handleToggleTodo = async (t: any) => {
    try {
      await toggleTodoMutation.mutateAsync({ id: t.id, isCompleted: !t.is_completed });
      toast.success(t.is_completed ? "Reaberta" : "Concluída ✓");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    }
  };

  const now = new Date();
  const todayEvents = events.filter((e) => isToday(parseISO(e.starts_at)));
  const dateOnly = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };
  const todayDateStr = dateOnly(now);
  const isRoutineSkipped = (routineId: string, day: Date) =>
    routineExceptions.some((e) => e.routine_id === routineId && e.exception_date === dateOnly(day));
  const routineOccurrences = Array.from({ length: 8 }, (_, offset) => {
    const day = addDays(now, offset);
    return routinesForDay(routines, day)
      .filter((r) => !isRoutineSkipped(r.id, day))
      .map<DashboardScheduleItem>((r) => {
        const [sh, sm] = r.start_time.split(":").map(Number);
        const [eh, em] = r.end_time.split(":").map(Number);
        const start = new Date(day);
        start.setHours(sh, sm ?? 0, 0, 0);
        const end = new Date(day);
        end.setHours(eh, em ?? 0, 0, 0);
        if (end <= start) end.setDate(end.getDate() + 1);
        return {
          id: `routine-${r.id}-${dateOnly(day)}`,
          kind: "routine",
          title: r.title,
          starts_at: start.toISOString(),
          ends_at: end.toISOString(),
          category_id: null,
          is_shared: Boolean((r as any).is_shared),
          user_id: (r as any).user_id ?? null,
          color: r.color,
        };
      });
  }).flat();
  const activeOrFutureItems = [
    ...events.map<DashboardScheduleItem>((e) => ({
      id: `event-${e.id}`,
      kind: "event",
      title: e.title,
      starts_at: e.starts_at,
      ends_at: e.ends_at,
      category_id: e.category_id,
      is_shared: e.is_shared,
      user_id: (e as any).user_id ?? null,
    })),
    ...routineOccurrences,
  ]
    .filter((item) => parseISO(item.ends_at).getTime() > now.getTime())
    .sort((a, b) => {
      const startDiff = parseISO(a.starts_at).getTime() - parseISO(b.starts_at).getTime();
      if (startDiff !== 0) return startDiff;
      return parseISO(a.ends_at).getTime() - parseISO(b.ends_at).getTime();
    });
  const nextEvent = activeOrFutureItems.find((e) => {
    const start = parseISO(e.starts_at).getTime();
    const end = parseISO(e.ends_at).getTime();
    return start <= now.getTime() && end > now.getTime();
  }) ?? activeOrFutureItems.find((e) => parseISO(e.starts_at).getTime() > now.getTime());
  const nextEventIsCurrent = Boolean(
    nextEvent &&
      parseISO(nextEvent.starts_at).getTime() <= now.getTime() &&
      parseISO(nextEvent.ends_at).getTime() > now.getTime(),
  );
  const nextEventIndex = nextEvent ? activeOrFutureItems.findIndex((e) => e.id === nextEvent.id) : -1;
  const canShowInUpcoming = (item: DashboardScheduleItem) =>
    item.is_shared || item.user_id === user?.id;
  const upcoming = (nextEventIndex >= 0 ? activeOrFutureItems.slice(nextEventIndex + 1) : activeOrFutureItems)
    .filter(canShowInUpcoming)
    .slice(0, 1);
  const importantEvents = events.filter((e) => e.priority >= 2 && isAfter(parseISO(e.ends_at), now)).slice(0, 3);
  
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

      {profile === null && (
        <Link
          to="/profile"
          className="mb-5 flex items-center gap-3 rounded-2xl border border-destructive/35 bg-destructive/10 p-4 transition-all hover:bg-destructive/15"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/15">
            <Heart className="h-5 w-5 text-destructive" fill="currentColor" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-destructive">Perfil não inicializado</p>
            <p className="text-xs text-muted-foreground">Toque aqui para acessar a aba Perfil e restaurar os dados da sua conta.</p>
          </div>
        </Link>
      )}

      {!loading && profile && !profile.couple_id && (
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
        isCurrentEvent={nextEventIsCurrent}
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
        onSaved={() => {
          setDialogOpen(false);
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.events });
        }}
      />
      <TodoDialog
        open={todoDialogOpen}
        onOpenChange={setTodoDialogOpen}
        todo={null}
        categories={categories}
        coupleId={profile?.couple_id ?? null}
        onSaved={() => {
          setTodoDialogOpen(false);
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.todos });
        }}
      />
    </div>
  );
}
