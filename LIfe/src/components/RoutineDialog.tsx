import { useEffect, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { bulkCreateRoutines, deleteRoutine, updateRoutine, type Routine } from "@/lib/data";
import { PRESET_COLORS, WEEKDAY_LABELS } from "@/lib/calendar-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  routine: Routine | null;
  coupleId: string | null;
  onSaved: () => void;
}

export function RoutineDialog({ open, onOpenChange, routine, coupleId, onSaved }: Props) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1]);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("17:00");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [isShared, setIsShared] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (routine) {
      setTitle(routine.title);
      setDaysOfWeek([routine.day_of_week]);
      setStartTime(routine.start_time.slice(0, 5));
      setEndTime(routine.end_time.slice(0, 5));
      setColor(routine.color);
      setIsShared(routine.is_shared);
    } else {
      setTitle("");
      setDaysOfWeek([new Date().getDay()]);
      setStartTime("08:00");
      setEndTime("17:00");
      setColor(PRESET_COLORS[0]);
      setIsShared(false);
    }
  }, [open, routine]);

  const toggleDay = (idx: number) => {
    setDaysOfWeek((prev) =>
      prev.includes(idx) ? prev.filter((d) => d !== idx) : [...prev, idx].sort()
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim()) return;
    if (daysOfWeek.length === 0) {
      toast.error("Selecione pelo menos um dia");
      return;
    }
    if (startTime >= endTime) {
      toast.error("Hora de fim deve ser depois do início");
      return;
    }
    setBusy(true);
    try {
      const base = {
        couple_id: coupleId || null,
        title: title.trim(),
        start_time: startTime,
        end_time: endTime,
        color,
      };
      if (routine) {
        // Edit: keep single-day semantics (use first selected day)
        await updateRoutine(routine.id, { ...base, day_of_week: daysOfWeek[0] });
        toast.success("Rotina atualizada");
      } else {
        const payloads = daysOfWeek.map((d) => ({ ...base, day_of_week: d }));
        await bulkCreateRoutines(payloads);
        toast.success(
          payloads.length > 1 ? `${payloads.length} rotinas criadas` : "Rotina criada"
        );
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!routine) return;
    setBusy(true);
    try {
      await deleteRoutine(routine.id);
      toast.success("Rotina removida");
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{routine ? "Editar rotina" : "Nova rotina"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="rt-title">Nome da rotina</Label>
            <Input
              id="rt-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Trabalho, Reunião semanal..."
              required
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{routine ? "Dia da semana" : "Dias da semana"}</Label>
              {!routine && (
                <button
                  type="button"
                  onClick={() =>
                    setDaysOfWeek(daysOfWeek.length === 7 ? [new Date().getDay()] : [0, 1, 2, 3, 4, 5, 6])
                  }
                  className="text-xs font-medium text-primary"
                >
                  {daysOfWeek.length === 7 ? "Limpar" : "Todos"}
                </button>
              )}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {WEEKDAY_LABELS.map((lbl, idx) => {
                const selected = daysOfWeek.includes(idx);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => (routine ? setDaysOfWeek([idx]) : toggleDay(idx))}
                    className={`rounded-lg py-2 text-xs font-medium transition-all ${
                      selected
                        ? "gradient-primary text-primary-foreground shadow-sm"
                        : "bg-muted text-muted-foreground hover:bg-muted/70"
                    }`}
                  >
                    {lbl}
                  </button>
                );
              })}
            </div>
            {!routine && daysOfWeek.length > 1 && (
              <p className="text-xs text-muted-foreground">
                Será criada uma rotina para cada dia selecionado ({daysOfWeek.length}).
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rt-start">Início</Label>
              <Input id="rt-start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rt-end">Fim</Label>
              <Input id="rt-end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
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
                  className={`h-9 w-9 rounded-xl transition-transform ${color === c ? "scale-110 ring-2 ring-foreground/40 ring-offset-2 ring-offset-background" : ""}`}
                  style={{ backgroundColor: c }}
                  aria-label={`Cor ${c}`}
                />
              ))}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            {routine && (
              <Button type="button" variant="outline" onClick={handleDelete} disabled={busy} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancelar</Button>
            <Button type="submit" disabled={busy} className="gradient-primary text-primary-foreground">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : routine ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
