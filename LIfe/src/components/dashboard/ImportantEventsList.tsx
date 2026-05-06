import { AlertTriangle } from "lucide-react";
import { fmt, PRIORITY_LABELS } from "@/lib/calendar-utils";
import { InlineParticleTuner, shouldShowTuner } from "@/components/InlineParticleTuner";
import type { EventRow, Category } from "@/lib/data";

interface ImportantEventsListProps {
  importantEvents: EventRow[];
  categories: Category[];
  importantEventAnim: string;
  coupleAnim: string;
  particlesImpStyle: React.CSSProperties;
  particlesCplStyle: React.CSSProperties;
}

export function ImportantEventsList({
  importantEvents,
  categories,
  importantEventAnim,
  coupleAnim,
  particlesImpStyle,
  particlesCplStyle,
}: ImportantEventsListProps) {
  if (importantEvents.length === 0) return null;

  return (
    <section className="mb-5">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        <AlertTriangle className="h-4 w-4 text-warning" />
        Lembretes importantes
      </h3>
      <ul className="space-y-2">
        {importantEvents.map((e) => {
          const cat = categories.find((c) => c.id === e.category_id);
          return (
            <li
              key={e.id}
              className={`flex items-center gap-3 rounded-xl border bg-card p-3 ${importantEventAnim} ${e.is_shared ? coupleAnim : ""}`}
              style={{
                ...(importantEventAnim === "anim-particles" ? particlesImpStyle : {}),
                ...(e.is_shared && coupleAnim === "anim-particles" ? particlesCplStyle : {}),
              }}
            >
              <span
                className="h-10 w-1 rounded-full shrink-0"
                style={{ backgroundColor: cat?.color ?? (e.priority === 3 ? "var(--destructive)" : "var(--warning)") }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{e.title}</p>
                <p className="text-xs text-muted-foreground">
                  {fmt(e.starts_at, "dd MMM 'às' HH:mm")} • {PRIORITY_LABELS[e.priority]}
                </p>
              </div>
              {shouldShowTuner(importantEventAnim) && <InlineParticleTuner category="important" />}
              {e.is_shared && shouldShowTuner(coupleAnim) && <InlineParticleTuner category="couple" />}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
