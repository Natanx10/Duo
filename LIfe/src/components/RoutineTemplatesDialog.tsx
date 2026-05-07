import { useState } from "react";
import { Loader2, Sparkles, Check } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { bulkCreateRoutines } from "@/lib/data";
import { ROUTINE_TEMPLATES, buildRoutinesFromTemplate, type RoutineTemplate } from "@/lib/routine-templates";
import { WEEKDAY_LABELS } from "@/lib/calendar-utils";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

interface Props {
  coupleId: string | null;
  onApplied: () => void;
}

export function RoutineTemplatesDialog({ coupleId, onApplied }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const handleApply = async (template: RoutineTemplate) => {
    if (!user) return;
    setBusyId(template.id);
    try {
      const rows = buildRoutinesFromTemplate(template, {
        coupleId,
      });
      await bulkCreateRoutines(rows);
      toast.success(`${template.name} aplicado (${rows.length} blocos)`);
      onApplied();
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao aplicar template");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="shrink-0">
          <Sparkles className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Templates de rotina
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Aplique um modelo pronto com 1 clique. Você pode editar depois.
          </p>
        </DialogHeader>

        <ul className="space-y-2">
          {ROUTINE_TEMPLATES.map((tpl) => {
            const totalBlocks = tpl.blocks.reduce((acc, b) => acc + b.days.length, 0);
            const allDays = Array.from(new Set(tpl.blocks.flatMap((b) => b.days))).sort();
            const isBusy = busyId === tpl.id;
            return (
              <li
                key={tpl.id}
                className="rounded-xl border bg-muted/20 p-3 transition-colors hover:bg-muted/40"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl"
                    style={{ backgroundColor: `${tpl.color}25` }}
                  >
                    <span>{tpl.icon}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{tpl.name}</p>
                    <p className="text-xs text-muted-foreground">{tpl.description}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1">
                      {WEEKDAY_LABELS.map((lbl, idx) => (
                        <span
                          key={idx}
                          className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                            allDays.includes(idx)
                              ? "text-primary-foreground"
                              : "bg-muted text-muted-foreground/50"
                          }`}
                          style={allDays.includes(idx) ? { backgroundColor: tpl.color } : undefined}
                        >
                          {lbl}
                        </span>
                      ))}
                      <span className="ml-1 text-[10px] text-muted-foreground">
                        {totalBlocks} {totalBlocks === 1 ? "bloco" : "blocos"}
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleApply(tpl)}
                    disabled={isBusy || busyId !== null}
                    className="shrink-0 gradient-primary text-primary-foreground"
                  >
                    {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
