import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { addDays, format, isSameDay, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Check, Flame, Heart, Loader2, Plus, Target, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
  createHabit, deleteHabit, fetchHabitCheckinsInRange, fetchHabits, fetchProfile,
  toggleHabitCheckin, type Habit, type HabitCheckin,
} from "@/lib/data";
import { PRESET_COLORS, WEEKDAY_LABELS } from "@/lib/calendar-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

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
  const [habits, setHabits] = useState<Habit[]>([]);
  const [checkins, setCheckins] = useState<HabitCheckin[]>([]);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [rewardingId, setRewardingId] = useState<string | null>(null);
  const today = useMemo(() => new Date(), []);
  const weekStart = useMemo(() => startOfWeek(today, { weekStartsOn: 0 }), [today]);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const reload = useCallback(async () => {
    if (!user) return;
    const [hs, p, cs] = await Promise.all([
      fetchHabits(),
      fetchProfile(user.id),
      fetchHabitCheckinsInRange(addDays(today, -30), today),
    ]);
    setHabits(hs);
    setCoupleId(p?.couple_id ?? null);
    setCheckins(cs);
    setLoading(false);
  }, [user, today]);

  useEffect(() => { reload(); }, [reload]);

  const dow = today.getDay();
  const todaysHabits = habits.filter((h) => h.days_of_week.includes(dow));
  const isCheckedToday = (habitId: string) =>
    checkins.some((c) => c.habit_id === habitId && c.user_id === user?.id && c.checkin_date === toDateOnly(today));

  const completedToday = todaysHabits.filter((h) => isCheckedToday(h.id)).length;
  const progressPct = todaysHabits.length === 0 ? 0 : (completedToday / todaysHabits.length) * 100;

  const handleToggle = async (habit: Habit) => {
    if (!user) return;
    const checked = isCheckedToday(habit.id);
    // Feedback visual imediato (<200ms): dispara reward antes do round-trip.
    if (!checked) {
      setRewardingId(habit.id);
      window.setTimeout(() => setRewardingId((id) => (id === habit.id ? null : id)), 2500);
    }
    try {
      await toggleHabitCheckin(habit.id, user.id, today, checked ? 1 : 0);
      if (!checked) toast.success(`✓ ${habit.title}`, { duration: 1500 });
      reload();
    } catch (err) {
      setRewardingId(null);
      toast.error(err instanceof Error ? err.message : "Erro");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este hábito? O histórico também será removido.")) return;
    try {
      await deleteHabit(id);
      toast.success("Hábito excluído");
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    }
  };

  // Streak: dias consecutivos contando para trás (para hábitos previstos no dia)
  const computeStreak = (habit: Habit): number => {
    let streak = 0;
    for (let i = 0; i < 60; i++) {
      const d = addDays(today, -i);
      if (!habit.days_of_week.includes(d.getDay())) continue;
      const checked = checkins.some(
        (c) => c.habit_id === habit.id && c.user_id === user?.id && c.checkin_date === toDateOnly(d)
      );
      if (checked) streak++;
      else if (i > 0) break; // permite "ainda não fez hoje" sem zerar
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

      {/* Progresso de hoje */}
      <section className="mb-5 overflow-hidden rounded-3xl border bg-card shadow-sm">
        <div className="gradient-primary p-5 text-primary-foreground">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium opacity-90">Progresso de hoje</p>
              <p className="mt-1 text-3xl font-bold tabular-nums">
                {completedToday}<span className="text-base opacity-80">/{todaysHabits.length}</span>
              </p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/15">
              <Target className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-3">
            <Progress value={progressPct} className="h-2 bg-white/20" />
          </div>
        </div>
      </section>

      {/* Lista de hábitos */}
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
                  className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-all ${
                    checked ? "scale-100 shadow-md" : "border-2 hover:scale-105"
                  } ${!today_predicted ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
                  style={{
                    backgroundColor: checked ? h.color : "transparent",
                    borderColor: h.color,
                  }}
                  aria-label={checked ? "Desmarcar" : "Marcar como feito"}
                >
                  {checked && (
                    <Check className="h-6 w-6 text-white animate-pop" strokeWidth={3} />
                  )}
                  {rewardingId === h.id && (
                    <span className="reward-overlay" aria-hidden="true" style={{ position: "absolute", zIndex: 50, top: "50%", left: "50%", transform: "translate(-50%, -50%)", pointerEvents: "none" }}>
                      {/* @ts-ignore */}
                      <dotlottie-wc
                        src="https://lottie.host/9229d93c-d22a-4bd4-8d1e-325ccd7b3f7d/IGrMrsPipd.lottie"
                        style={{ width: "300px", height: "300px" }}
                        autoplay
                      ></dotlottie-wc>
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
                {h.user_id === user?.id && (
                  <button
                    onClick={() => handleDelete(h.id)}
                    className="tap-target rounded-lg text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                    aria-label="Excluir"
                  >
                    <Trash2 className="mx-auto h-4 w-4" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Mini-grade semanal */}
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
        onCreated={reload}
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
