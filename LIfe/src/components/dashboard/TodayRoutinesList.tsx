import { Coffee } from "lucide-react";
import { formatTime } from "@/lib/calendar-utils";
import type { Routine } from "@/lib/data";

interface TodayRoutinesListProps {
  todayRoutines: Routine[];
}

export function TodayRoutinesList({ todayRoutines }: TodayRoutinesListProps) {
  if (todayRoutines.length === 0) return null;

  return (
    <section className="mb-5">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        <Coffee className="h-4 w-4" />
        Rotinas de hoje
      </h3>
      <ul className="flex flex-wrap gap-2">
        {todayRoutines.map((r) => (
          <li
            key={r.id}
            className="flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-xs"
            style={{ borderColor: `color-mix(in oklab, ${r.color} 40%, transparent)` }}
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: r.color }} />
            <span className="font-medium">{r.title}</span>
            <span className="font-mono text-muted-foreground">
              {formatTime(r.start_time)}–{formatTime(r.end_time)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
