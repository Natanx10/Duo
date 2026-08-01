import { Heart } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { fmt } from "@/lib/calendar-utils";
import { SafeImage } from "@/components/SafeImage";
import type { Category } from "@/lib/data";
import type { HeroTarget } from "@/lib/ui-prefs";
import type { DashboardScheduleItem } from "./types";

interface UpcomingEventsListProps {
  upcoming: DashboardScheduleItem[];
  categories: Category[];
  heroScale: number;
  heroSrcFor: (t: HeroTarget) => string;
  heroFallbackSrc: string;
  heroCropFor: (t: HeroTarget) => React.CSSProperties;
}

export function UpcomingEventsList({
  upcoming,
  categories,
  heroScale,
  heroSrcFor,
  heroFallbackSrc,
  heroCropFor,
}: UpcomingEventsListProps) {
  return (
    <section className="mb-6">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground">Em breve</h3>
        <Link to="/calendar" className="text-xs font-medium text-primary">Ver agenda →</Link>
      </div>
      {upcoming.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-muted/30 p-8 text-center">
          <div className="mx-auto mb-3 overflow-hidden" style={{ width: `${Math.round(128 * heroScale)}px`, height: `${Math.round(128 * heroScale)}px` }}>
            <SafeImage
              src={heroSrcFor("empty")}
              fallbackSrc={heroFallbackSrc}
              alt="Nenhum compromisso agendado"
              width={768}
              height={768}
              loading="lazy"
              style={{ width: "100%", height: "100%", ...heroCropFor("empty") }}
            />
          </div>
          <p className="text-sm text-muted-foreground animate-fade-in">Nada agendado ainda.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {upcoming.map((e) => {
            const cat = categories.find((c) => c.id === e.category_id);
            const color = cat?.color ?? e.color;
            return (
              <li key={e.id} className="flex items-center gap-3 rounded-xl border bg-card p-3">
                <div className="flex h-12 w-12 flex-col items-center justify-center rounded-xl bg-muted">
                  <span className="text-[10px] font-medium uppercase text-muted-foreground">
                    {fmt(e.starts_at, "MMM")}
                  </span>
                  <span className="text-lg font-bold leading-none">{fmt(e.starts_at, "dd")}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{e.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {fmt(e.starts_at, "HH:mm")} • {fmt(e.starts_at, "EEEE")}
                  </p>
                </div>
                {color && (
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                )}
                {e.is_shared && <Heart className="h-3.5 w-3.5 text-accent" fill="currentColor" />}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
