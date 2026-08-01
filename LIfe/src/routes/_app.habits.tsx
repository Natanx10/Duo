import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { addDays, format, isSameDay, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Check, Flame, Heart, Loader2, Plus, Target, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
  createHabit, deleteHabit, toggleHabitCheckin,
  type Habit,
} from "@/lib/data";
import { 
  useHabits, useHabitCheckins, useProfile, useApiMutation, QUERY_KEYS 
} from "@/hooks/useData";
import { useQueryClient } from "@tanstack/react-query";
import { PRESET_COLORS, WEEKDAY_LABELS } from "@/lib/calendar-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { useUiPrefs, particleVars } from "@/lib/ui-prefs";
import { InlineParticleTuner } from "@/components/InlineParticleTuner";

export const Route = createFileRoute("/_app/habits")({
  component: HabitsPage,
  head: () => ({
    meta: [
      { title: "Hábitos — Duo" },
      { name: "description", content: "Acompanhe seus hábitos diários e construa rotinas saudáveis." },
    ],
  }),
});

function toDateOnly(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function HabitsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const ui = useUiPrefs();
  const today = useMemo(() => new Date(), []);
  
  const { data: profile } = useProfile(user?.id);
  const coupleId = profile?.couple_id ?? null;
  const { data: habits = [] } = useHabits(coupleId, user?.id);
  const { data: checkins = [] } = useHabitCheckins(addDays(today, -30), today, coupleId, user?.id);
  
  const loading = !profile && !!user;

  const [dialogOpen, setDialogOpen] = useState(false);

  const weekStart = useMemo(() => startOfWeek(today, { weekStartsOn: 0 }), [today]);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const toggleMutation = useApiMutation(
    ({ habitId, userId, date, checked }: { habitId: string; userId: string; date: Date; checked: boolean }) => 
      toggleHabitCheckin(habitId, userId, date, checked ? 1 : 0),
    [QUERY_KEYS.habitCheckins]
  );

  const deleteMutation = useApiMutation(
    (id: string) => deleteHabit(id),
    [QUERY_KEYS.habits]
  );

  const dow = today.getDay();
  const todaysHabits = habits.filter((h) => h.days_of_week.includes(dow));
  const getCheckinInfo = (habitId: string) => {
    const todayStr = toDateOnly(today);
    const dayCheckins = checkins.filter(c => c.habit_id === habitId && c.checkin_date === todayStr);
    const uniqueUsers = new Set(dayCheckins.map(c => c.user_id));
    return {
      count: uniqueUsers.size,
      isCheckedByMe: uniqueUsers.has(user?.id || ""),
    };
  };

  const isCheckedToday = (habitId: string) => getCheckinInfo(habitId).isCheckedByMe;

  const completedToday = todaysHabits.filter((h) => {
    const info = getCheckinInfo(h.id);
    if (h.is_shared) return info.count >= 2;
    return info.isCheckedByMe;
  }).length;
  const progressPct = todaysHabits.length === 0 ? 0 : (completedToday / todaysHabits.length) * 100;

  const handleToggle = async (habit: any) => {
    if (!user) return;
    const checked = isCheckedToday(habit.id);
    try {
      await toggleMutation.mutateAsync({ habitId: habit.id, userId: user.id, date: today, checked });
      if (!checked) toast.success(`✓ ${habit.title}`, { duration: 1500 });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este hábito? O histórico também será removido.")) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Hábito excluído");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    }
  };

  const computeStreak = (habit: Habit): number => {
    let streak = 0;
    for (let i = 0; i < 60; i++) {
      const d = addDays(today, -i);
      if (!habit.days_of_week.includes(d.getDay())) continue;
      const checked = checkins.some(
        (c) => c.habit_id === habit.id && c.user_id === user?.id && c.checkin_date === toDateOnly(d)
      );
      if (checked) streak++;
      else if (i > 0) break;
    }
    return streak;
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-24 animate-fade-in">
      <header className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight">Hábitos</h1>
        <p className="text-sm text-muted-foreground">Construa sua rotina, um dia de cada vez.</p>
      </header>

      <section className="mb-5 overflow-hidden rounded-3xl border bg-card shadow-sm">
        <div className="gradient-primary p-5 text-primary-foreground relative">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium opacity-90">Progresso de hoje</p>
              <p className="mt-1 text-3xl font-bold tabular-nums">
                {completedToday}<span className="text-base opacity-80">/{todaysHabits.length}</span>
              </p>
            </div>
            <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-white/15">
              <Target className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-3">
            <Progress value={progressPct} className="h-2 bg-white/20" />
          </div>
        </div>
      </section>

      {habits.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-muted/30 p-8 text-center">
          <Target className="mx-auto mb-3 h-12 w-12 text-muted-foreground animate-float" />
          <p className="text-sm text-muted-foreground animate-fade-in">
            Nenhum hábito ainda. Comece pequeno!
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {habits.map((h) => {
            const checked = isCheckedToday(h.id);
            const today_predicted = h.days_of_week.includes(dow);
            const streak = computeStreak(h);
            return (
              <li
                key={h.id}
                className={`group flex items-center gap-3 rounded-2xl border bg-card p-3 transition-all ${
                  checked ? "ring-2 ring-offset-1" : ""
                }`}
                style={{
                  borderColor: checked ? h.color : undefined,
                  ...(checked ? ({ "--tw-ring-color": h.color } as React.CSSProperties) : {}),
                }}
              >
                <button
                  onClick={() => today_predicted && handleToggle(h)}
                  disabled={!today_predicted}
                  className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                    !today_predicted ? "opacity-30" : "hover:scale-110 active:scale-95"
                  }`}
                  style={{
                    borderColor: h.color,
                    backgroundColor: "transparent",
                  }}
                >
                  <div
                    className="absolute inset-0 rounded-full transition-all duration-500 overflow-hidden"
                    style={{
                      background: h.is_shared
                        ? `linear-gradient(to right, ${h.color} ${getCheckinInfo(h.id).count === 1 ? '50%' : getCheckinInfo(h.id).count >= 2 ? '100%' : '0%'}, transparent 0%)`
                        : (isCheckedToday(h.id) ? h.color : 'transparent')
                    }}
                  />
                  
                  {checked && (
                    <span className="relative z-10 text-white animate-pop">
                      <Check className="h-6 w-6 stroke-[3px]" />
                    </span>
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm font-semibold ${checked ? "line-through opacity-70" : ""}`}>
                    {h.title}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      {h.days_of_week.map((d) => (
                        <span
                          key={d}
                          className={`inline-block ${d === dow ? "font-bold text-foreground" : ""}`}
                        >
                          {WEEKDAY_LABELS[d][0]}
                        </span>
                      ))}
                    </span>
                    {streak > 0 && (
                      <span className="inline-flex items-center gap-0.5 font-medium text-warning">
                        <Flame className="h-3 w-3" fill="currentColor" /> {streak}
                      </span>
                    )}
                    {h.is_shared && <Heart className="h-3 w-3 text-accent" fill="currentColor" />}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(h.id)}
                  className="tap-target flex h-9 w-9 items-center justify-center rounded-xl bg-destructive/5 text-destructive transition-colors hover:bg-destructive/15 active:scale-95"
                  aria-label="Excluir"
                >
                  <Trash2 className="h-4.5 w-4.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {habits.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Esta semana</h2>
          <div className="overflow-x-auto rounded-2xl border bg-card p-3">
            <table className="min-w-full text-xs">
              <thead>
                <tr>
                  <th className="px-2 py-1 text-left font-medium text-muted-foreground">Hábito</th>
                  {weekDays.map((d) => (
                    <th
                      key={d.toISOString()}
                      className={`px-1.5 py-1 text-center font-semibold ${
                        isSameDay(d, today) ? "text-primary" : "text-muted-foreground"
                      }`}
                    >
                      {format(d, "EEEEE", { locale: ptBR })}
                      <div className="text-[10px] font-normal opacity-70">{format(d, "d")}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {habits.map((h) => (
                  <tr key={h.id} className="border-t">
                    <td className="max-w-[8rem] truncate px-2 py-1.5 font-medium">{h.title}</td>
                    {weekDays.map((d) => {
                      const predicted = h.days_of_week.includes(d.getDay());
                      const done = checkins.some(
                        (c) => c.habit_id === h.id && c.user_id === user?.id && c.checkin_date === toDateOnly(d)
                      );
                      return (
                        <td key={d.toISOString()} className="px-1.5 py-1.5 text-center">
                          <span
                            className={`mx-auto block h-5 w-5 rounded-md ${!predicted ? "opacity-20" : ""}`}
                            style={{
                              backgroundColor: done ? h.color : "var(--muted)",
                              border: predicted && !done ? `1px solid ${h.color}` : undefined,
                            }}
                            title={`${format(d, "dd/MM")}: ${done ? "feito" : predicted ? "pendente" : "fora do plano"}`}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <Button
        onClick={() => setDialogOpen(true)}
        className="mt-6 h-12 w-full gradient-primary text-primary-foreground"
      >
        <Plus className="mr-1.5 h-4 w-4" /> Novo hábito
      </Button>

      <NewHabitDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        coupleId={coupleId}
        onCreated={() => {
          setDialogOpen(false);
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.habits });
        }}
      />
    </div>
  );
}

function NewHabitDialog({
  open, onOpenChange, coupleId, onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  coupleId: string | null;
  onCreated: () => void;
}) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [days, setDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [isShared, setIsShared] = useState(false);
  const [busy, setBusy] = useState(false);

  const toggleDay = (d: number) => {
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim() || days.length === 0) return;
    setBusy(true);
    try {
      await createHabit({
        user_id: user.id,
        couple_id: isShared ? coupleId : null,
        title: title.trim(),
        color,
        days_of_week: days,
        is_shared: isShared,
      } as any);
      toast.success("Hábito criado ✨");
      setTitle(""); setColor(PRESET_COLORS[0]); setDays([0, 1, 2, 3, 4, 5, 6]); setIsShared(false);
      onOpenChange(false);
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Novo hábito</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="hab-name">Nome</Label>
            <Input
              id="hab-name"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Beber água, Ler, Meditar..."
              required
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label>Dias da semana</Label>
            <div className="grid grid-cols-7 gap-1.5">
              {WEEKDAY_LABELS.map((label, i) => {
                const active = days.includes(i);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleDay(i)}
                    className={`rounded-lg py-2 text-xs font-semibold transition-all ${
                      active ? "gradient-primary text-primary-foreground shadow" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {label[0]}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-9 w-9 rounded-xl transition-transform ${
                    color === c ? "scale-110 ring-2 ring-foreground/40 ring-offset-2 ring-offset-background" : ""
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={`Cor ${c}`}
                />
              ))}
            </div>
          </div>
          {coupleId && (
            <div className="flex items-center justify-between rounded-xl border bg-muted/30 px-4 py-3">
              <div>
                <Label htmlFor="hab-shared" className="cursor-pointer">Compartilhar com o casal</Label>
                <p className="text-xs text-muted-foreground">Ambos veem o hábito</p>
              </div>
              <Switch id="hab-shared" checked={isShared} onCheckedChange={setIsShared} />
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button type="submit" disabled={busy} className="gradient-primary text-primary-foreground">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
