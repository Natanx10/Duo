import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2, MapPin, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  createEvent, deleteEvent, updateEvent,
  type Category, type EventRow, type Routine,
} from "@/lib/data";
import { detectConflicts } from "@/lib/calendar-utils";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultDate?: Date;
  defaultHour?: number;
  event?: EventRow | null;
  categories: Category[];
  coupleId: string | null;
  onSaved: () => void;
  existingEvents?: EventRow[];
  routines?: Routine[];
}

function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EventDialog({
  open, onOpenChange, defaultDate, defaultHour, event, categories, coupleId, onSaved,
  existingEvents = [], routines = [],
}: Props) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [categoryId, setCategoryId] = useState<string>("none");
  const [isShared, setIsShared] = useState(false);
  const [priority, setPriority] = useState<number>(1);
  const [busy, setBusy] = useState(false);

  const conflicts = useMemo(() => {
    if (!startsAt || !endsAt) return [];
    try {
      const s = new Date(startsAt);
      const e = new Date(endsAt);
      if (isNaN(s.getTime()) || isNaN(e.getTime()) || e <= s) return [];
      const others = existingEvents.filter((ev) => ev.id !== event?.id);
      return detectConflicts(s, e, others, routines);
    } catch {
      return [];
    }
  }, [startsAt, endsAt, existingEvents, routines, event?.id]);

  useEffect(() => {
    if (!open) return;
    if (event) {
      setTitle(event.title);
      setDescription(event.description ?? "");
      setLocation(event.location ?? "");
      setStartsAt(toLocalInput(new Date(event.starts_at)));
      setEndsAt(toLocalInput(new Date(event.ends_at)));
      setCategoryId(event.category_id ?? "none");
      setIsShared(event.is_shared);
      setPriority(event.priority);
    } else {
      const base = defaultDate ? new Date(defaultDate) : new Date();
      base.setHours(defaultHour ?? 9, 0, 0, 0);
      const end = new Date(base);
      end.setHours(end.getHours() + 1);
      setTitle("");
      setDescription("");
      setLocation("");
      setStartsAt(toLocalInput(base));
      setEndsAt(toLocalInput(end));
      setCategoryId("none");
      setIsShared(!!coupleId); // default: atividade em casal quando há parceiro
      setPriority(1);
    }
  }, [open, event, defaultDate, defaultHour]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    try {
      const payload = {
        user_id: user.id,
        couple_id: isShared ? coupleId : null,
        category_id: categoryId === "none" ? null : categoryId,
        title: title.trim(),
        description: description.trim() || null,
        location: location.trim() || null,
        starts_at: new Date(startsAt).toISOString(),
        ends_at: new Date(endsAt).toISOString(),
        is_shared: isShared,
        priority,
      };
      if (event) {
        await updateEvent(event.id, payload);
        toast.success("Compromisso atualizado ✨");
      } else {
        await createEvent(payload);
        toast.success("Compromisso criado 🎉");
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
    if (!event) return;
    setBusy(true);
    try {
      await deleteEvent(event.id);
      toast.success("Compromisso removido");
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{event ? "Editar compromisso" : "Novo compromisso"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ev-title">Título</Label>
            <Input id="ev-title" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Ex: Jantar a dois" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ev-start">Início</Label>
              <Input id="ev-start" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ev-end">Fim</Label>
              <Input id="ev-end" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} required />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ev-loc">
              <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Local (opcional)</span>
            </Label>
            <Input id="ev-loc" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Onde?" />
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

          <div className="space-y-1.5">
            <Label htmlFor="ev-desc">Notas</Label>
            <Textarea id="ev-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detalhes opcionais..." />
          </div>

          {coupleId && (
            <div className="flex items-center justify-between rounded-xl border bg-muted/30 px-4 py-3">
              <div>
                <Label htmlFor="ev-shared" className="cursor-pointer">Atividade em casal</Label>
                <p className="text-xs text-muted-foreground">Aparece para os dois e ocupa as duas colunas</p>
              </div>
              <Switch id="ev-shared" checked={isShared} onCheckedChange={setIsShared} />
            </div>
          )}

          {conflicts.length > 0 && (
            <div className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/10 p-3 text-xs">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-warning">Conflito de horário</p>
                <ul className="mt-1 space-y-0.5 text-foreground/80">
                  {conflicts.map((c) => (
                    <li key={`${c.kind}-${c.id}`} className="truncate">
                      • {c.title} <span className="text-muted-foreground">({c.kind === "routine" ? "rotina" : "compromisso"})</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            {event && (
              <Button type="button" variant="ghost" onClick={handleDelete} disabled={busy} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button type="submit" disabled={busy} className="gradient-primary text-primary-foreground hover:opacity-95">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : event ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
          {startsAt && endsAt && (
            <p className="text-center text-xs text-muted-foreground">
              {format(new Date(startsAt), "HH:mm")} → {format(new Date(endsAt), "HH:mm")}
            </p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
