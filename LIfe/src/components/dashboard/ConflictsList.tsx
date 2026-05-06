import { AlertTriangle } from "lucide-react";
import { formatTime } from "@/lib/calendar-utils";
import type { EventRow, Routine } from "@/lib/data";

interface ConflictsListProps {
  conflictsToday: Array<{ event: EventRow; routine: Routine }>;
}

export function ConflictsList({ conflictsToday }: ConflictsListProps) {
  if (conflictsToday.length === 0) return null;

  return (
    <section className="mb-5">
      <div className="rounded-2xl border border-warning/40 bg-warning/10 p-4">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-warning">Conflitos hoje</p>
            <ul className="mt-1.5 space-y-1 text-xs text-foreground/85">
              {conflictsToday.map((c, i) => (
                <li key={i} className="truncate">
                  <span className="font-medium">{c.event.title}</span>
                  {" "}choca com a rotina{" "}
                  <span className="font-medium">{c.routine.title}</span>
                  <span className="text-muted-foreground"> ({formatTime(c.routine.start_time)}–{formatTime(c.routine.end_time)})</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
