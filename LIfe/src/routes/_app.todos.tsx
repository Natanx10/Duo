import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { format, isPast, isToday, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarClock, CheckSquare, Heart, Loader2, Plus, Square,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
  createTodo, deleteTodo, fetchCategories, fetchProfile, fetchTodos,
  toggleTodoComplete, updateTodo,
  type Category, type Todo,
} from "@/lib/data";
import { PRIORITY_LABELS } from "@/lib/calendar-utils";
import { useUiPrefs, animClass, particleVars } from "@/lib/ui-prefs";
import { InlineParticleTuner, shouldShowTuner } from "@/components/InlineParticleTuner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_app/todos")({
  component: TodosPage,
  head: () => ({ meta: [{ title: "Tarefas — Duo" }] }),
});

type Filter = "all" | "today" | "scheduled" | "shared" | "done";

function TodosPage() {
  const { user } = useAuth();
  const ui = useUiPrefs();
  const importantAnim = animClass(ui.important);
  const coupleAnim = animClass(ui.couple);
  const particlesImpStyle = particleVars(ui.particlesImportant.intensity, ui.particlesImportant.density);
  const particlesCplStyle = particleVars(ui.particlesCouple.intensity, ui.particlesCouple.density);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Todo | null>(null);

  const reload = useCallback(async () => {
    if (!user) return;
    const [ts, cats, profile] = await Promise.all([
      fetchTodos(),
      fetchCategories(),
      fetchProfile(user.id),
    ]);
    setTodos(ts);
    setCategories(cats);
    setCoupleId(profile?.couple_id ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => { reload(); }, [reload]);

  const filtered = useMemo(() => {
    return todos.filter((t) => {
      if (filter === "done") return t.is_completed;
      if (t.is_completed) return false;
      if (filter === "today") return t.due_at && isToday(parseISO(t.due_at));
      if (filter === "scheduled") return !!t.due_at;
      if (filter === "shared") return t.is_shared;
      return true;
    });
  }, [todos, filter]);

  const stats = useMemo(() => {
    const open = todos.filter((t) => !t.is_completed);
    return {
      open: open.length,
      today: open.filter((t) => t.due_at && isToday(parseISO(t.due_at))).length,
      shared: open.filter((t) => t.is_shared).length,
      done: todos.filter((t) => t.is_completed).length,
    };
  }, [todos]);

  const handleToggle = async (t: Todo) => {
    try {
      await toggleTodoComplete(t.id, !t.is_completed);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTodo(id);
      toast.success("Tarefa removida");
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    }
  };

  const openCreate = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (t: Todo) => { setEditing(t); setDialogOpen(true); };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-6 animate-fade-in">
      <header className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight">Tarefas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Liste o que precisa fazer. Adicione data se quiser ver na agenda.
        </p>
      </header>

      {/* Stats */}
      <div className="mb-4 grid grid-cols-4 gap-2">
        <Stat label="Abertas" value={stats.open} />
        <Stat label="Hoje" value={stats.today} accent />
        <Stat label="Casal" value={stats.shared} />
        <Stat label="Feitas" value={stats.done} muted />
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
        {([
          ["all", "Todas"],
          ["today", "Hoje"],
          ["scheduled", "Com data"],
          ["shared", "Casal"],
          ["done", "Feitas"],
        ] as [Filter, string][]).map(([k, l]) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === k
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-muted/30 p-8 text-center">
          <CheckSquare className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {filter === "done" ? "Nenhuma tarefa concluída ainda." : "Nenhuma tarefa por aqui."}
          </p>
          <Button onClick={openCreate} className="mt-3 gradient-primary text-primary-foreground">
            <Plus className="mr-1 h-4 w-4" /> Nova tarefa
          </Button>
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((t) => {
            const cat = categories.find((c) => c.id === t.category_id);
            const overdue = t.due_at && !t.is_completed && isPast(parseISO(t.due_at)) && !isToday(parseISO(t.due_at));
            return (
              <li
                key={t.id}
                className={`group flex items-start gap-3 rounded-xl border bg-card p-3 transition-all ${
                  t.is_completed ? "opacity-60" : "hover:border-primary/40"
                } ${!t.is_completed && t.priority >= 2 ? importantAnim : ""} ${!t.is_completed && t.is_shared ? coupleAnim : ""}`}
                style={{
                  ...(!t.is_completed && t.priority >= 2 && importantAnim === "anim-particles" ? particlesImpStyle : {}),
                  ...(!t.is_completed && t.is_shared && coupleAnim === "anim-particles" ? particlesCplStyle : {}),
                }}
              >
                <button
                  onClick={() => handleToggle(t)}
                  className="mt-0.5 shrink-0 text-muted-foreground transition-colors hover:text-primary"
                  aria-label={t.is_completed ? "Marcar como pendente" : "Concluir"}
                >
                  {t.is_completed ? (
                    <CheckSquare className="h-5 w-5 text-primary" fill="currentColor" />
                  ) : (
                    <Square className="h-5 w-5" />
                  )}
                </button>
                <button onClick={() => openEdit(t)} className="min-w-0 flex-1 text-left">
                  <p className={`truncate text-sm font-semibold ${t.is_completed ? "line-through" : ""}`}>
                    {t.title}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    {t.due_at && (
                      <span className={`inline-flex items-center gap-1 ${overdue ? "text-destructive font-medium" : ""}`}>
                        <CalendarClock className="h-3 w-3" />
                        {format(parseISO(t.due_at), "dd MMM 'às' HH:mm", { locale: ptBR })}
                      </span>
                    )}
                    {t.show_in_calendar && t.due_at && (
                      <span className="text-primary">• na agenda</span>
                    )}
                    {t.is_shared && (
                      <span className="inline-flex items-center gap-1 text-accent">
                        <Heart className="h-3 w-3" fill="currentColor" /> Casal
                      </span>
                    )}
                    {t.priority >= 2 && (
                      <span className={t.priority === 3 ? "text-destructive font-medium" : "text-warning font-medium"}>
                        {PRIORITY_LABELS[t.priority]}
                      </span>
                    )}
                    {cat && (
                      <span className="inline-flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.color }} />
                        {cat.name}
                      </span>
                    )}
                  </div>
                </button>
                {!t.is_completed && t.priority >= 2 && shouldShowTuner(importantAnim) && (
                  <InlineParticleTuner category="important" />
                )}
                {!t.is_completed && t.is_shared && shouldShowTuner(coupleAnim) && (
                  <InlineParticleTuner category="couple" />
                )}
                {t.user_id === user?.id && (
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="tap-target shrink-0 rounded-lg text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                    aria-label="Remover"
                  >
                    <Trash2 className="mx-auto h-4 w-4" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* FAB */}
      <button
        onClick={openCreate}
        aria-label="Nova tarefa"
        className="fixed bottom-24 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full gradient-primary text-primary-foreground shadow-lg shadow-primary/40 transition-transform active:scale-95"
      >
        <Plus className="h-6 w-6" strokeWidth={2.5} />
      </button>

      <TodoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        todo={editing}
        categories={categories}
        coupleId={coupleId}
        onSaved={reload}
      />
    </div>
  );
}

function Stat({ label, value, accent, muted }: { label: string; value: number; accent?: boolean; muted?: boolean }) {
  return (
    <div className={`rounded-xl border p-2 text-center ${muted ? "bg-muted/30" : "bg-card"}`}>
      <p className={`text-lg font-bold leading-none ${accent ? "text-accent" : muted ? "text-muted-foreground" : ""}`}>{value}</p>
      <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}

/* ── Dialog ── */
function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface DialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  todo: Todo | null;
  categories: Category[];
  coupleId: string | null;
  onSaved: () => void;
}

export function TodoDialog({ open, onOpenChange, todo, categories, coupleId, onSaved }: DialogProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [hasDate, setHasDate] = useState(false);
  const [dueAt, setDueAt] = useState("");
  const [duration, setDuration] = useState(30);
  const [showInCalendar, setShowInCalendar] = useState(false);
  const [categoryId, setCategoryId] = useState("none");
  const [priority, setPriority] = useState(1);
  const [isShared, setIsShared] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (todo) {
      setTitle(todo.title);
      setDescription(todo.description ?? "");
      setHasDate(!!todo.due_at);
      setDueAt(todo.due_at ? toLocalInput(new Date(todo.due_at)) : "");
      setDuration(todo.duration_minutes);
      setShowInCalendar(todo.show_in_calendar);
      setCategoryId(todo.category_id ?? "none");
      setPriority(todo.priority);
      setIsShared(todo.is_shared);
    } else {
      const base = new Date();
      base.setMinutes(0, 0, 0);
      base.setHours(base.getHours() + 1);
      setTitle("");
      setDescription("");
      setHasDate(false);
      setDueAt(toLocalInput(base));
      setDuration(30);
      setShowInCalendar(false);
      setCategoryId("none");
      setPriority(1);
      setIsShared(!!coupleId); // default: atividade em casal quando há parceiro
    }
  }, [open, todo]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim()) return;
    setBusy(true);
    try {
      const payload = {
        user_id: user.id,
        couple_id: isShared ? coupleId : null,
        category_id: categoryId === "none" ? null : categoryId,
        title: title.trim(),
        description: description.trim() || null,
        due_at: hasDate && dueAt ? new Date(dueAt).toISOString() : null,
        duration_minutes: duration,
        show_in_calendar: hasDate && showInCalendar,
        priority,
        is_shared: isShared,
      };
      if (todo) {
        await updateTodo(todo.id, payload);
        toast.success("Tarefa atualizada ✨");
      } else {
        await createTodo(payload);
        toast.success("Tarefa criada 🎉");
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{todo ? "Editar tarefa" : "Nova tarefa"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="td-title">O quê?</Label>
            <Input id="td-title" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Ex: Comprar presente" autoFocus />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="td-desc">Notas (opcional)</Label>
            <Textarea id="td-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detalhes..." />
          </div>

          {/* Date toggle */}
          <div className="rounded-xl border bg-muted/30 px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="td-hasdate" className="cursor-pointer">Tem data e hora?</Label>
                <p className="text-xs text-muted-foreground">Defina um prazo</p>
              </div>
              <Switch id="td-hasdate" checked={hasDate} onCheckedChange={setHasDate} />
            </div>
            {hasDate && (
              <div className="mt-3 space-y-3">
                <Input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} required={hasDate} />
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Duração</Label>
                    <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 min</SelectItem>
                        <SelectItem value="30">30 min</SelectItem>
                        <SelectItem value="60">1h</SelectItem>
                        <SelectItem value="90">1h30</SelectItem>
                        <SelectItem value="120">2h</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <label className="flex w-full cursor-pointer items-center justify-between rounded-lg border bg-card px-3 py-2 text-xs">
                      <span>Mostrar na agenda</span>
                      <Switch checked={showInCalendar} onCheckedChange={setShowInCalendar} />
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger><SelectValue placeholder="Sem categoria" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem categoria</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                        {c.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Prioridade</Label>
              <Select value={String(priority)} onValueChange={(v) => setPriority(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Normal</SelectItem>
                  <SelectItem value="2">Importante</SelectItem>
                  <SelectItem value="3">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {coupleId && (
            <div className="flex items-center justify-between rounded-xl border bg-muted/30 px-4 py-3">
              <div>
                <Label htmlFor="td-shared" className="cursor-pointer">Atividade em casal</Label>
                <p className="text-xs text-muted-foreground">Aparece para os dois e qualquer um pode concluir</p>
              </div>
              <Switch id="td-shared" checked={isShared} onCheckedChange={setIsShared} />
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            {todo && (
              <Button
                type="button"
                variant="ghost"
                onClick={async () => {
                  if (!todo) return;
                  setBusy(true);
                  try {
                    await deleteTodo(todo.id);
                    toast.success("Tarefa removida");
                    onSaved();
                    onOpenChange(false);
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Erro");
                  } finally { setBusy(false); }
                }}
                disabled={busy}
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button type="submit" disabled={busy} className="gradient-primary text-primary-foreground">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : todo ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
