import { Clock, MapPin, Heart, Sparkles } from "lucide-react";
import { fmt } from "@/lib/calendar-utils";
import { SafeImage } from "@/components/SafeImage";
import type { HeroTarget } from "@/lib/ui-prefs";
import type { DashboardScheduleItem } from "./types";

interface DashboardHeroProps {
  nextEvent: DashboardScheduleItem | undefined;
  isCurrentEvent: boolean;
  emptyAnim: string;
  heroScale: number;
  heroSrcFor: (t: HeroTarget) => string;
  heroFallbackSrc: string;
  heroCropFor: (t: HeroTarget) => React.CSSProperties;
  todayEventsCount: number;
  dashboardTodosCount: number;
}

export function DashboardHero({
  nextEvent,
  isCurrentEvent,
  emptyAnim,
  heroScale,
  heroSrcFor,
  heroFallbackSrc,
  heroCropFor,
  todayEventsCount,
  dashboardTodosCount,
}: DashboardHeroProps) {
  return (
    <section className="mb-5 overflow-hidden rounded-3xl border bg-card shadow-sm">
      <div className="gradient-primary p-5 text-primary-foreground">
        <div className="flex items-center gap-2 text-xs font-medium opacity-90">
          <Sparkles className="h-3.5 w-3.5" /> {isCurrentEvent ? "Compromisso atual" : "Proximo compromisso"}
        </div>
        {nextEvent ? (
          <div className="mt-3 flex items-center gap-3">
            <div
              className={`shrink-0 overflow-hidden drop-shadow-md ${emptyAnim}`}
              style={{ width: `${Math.round(72 * heroScale)}px`, height: `${Math.round(72 * heroScale)}px` }}
            >
              <SafeImage
                src={heroSrcFor("next")}
                fallbackSrc={heroFallbackSrc}
                alt="Figurinha do proximo compromisso"
                width={768}
                height={768}
                loading="lazy"
                style={{ width: "100%", height: "100%", ...heroCropFor("next") }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-2xl font-bold leading-tight">{nextEvent.title}</h2>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm opacity-95">
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {fmt(nextEvent.starts_at, "EEE, dd MMM 'as' HH:mm")}
                </span>
                {nextEvent.location && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" /> {nextEvent.location}
                  </span>
                )}
                {nextEvent.is_shared && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-xs font-medium">
                    <Heart className="h-3 w-3" fill="currentColor" /> Casal
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-3 flex items-center gap-3">
            <div
              className={`shrink-0 overflow-hidden drop-shadow-md ${emptyAnim}`}
              style={{ width: `${Math.round(80 * heroScale)}px`, height: `${Math.round(80 * heroScale)}px` }}
            >
              <SafeImage
                src={heroSrcFor("hero")}
                fallbackSrc={heroFallbackSrc}
                alt="Casal com agenda livre"
                width={768}
                height={768}
                loading="lazy"
                style={{ width: "100%", height: "100%", ...heroCropFor("hero") }}
              />
            </div>
            <div className="min-w-0 animate-fade-in">
              <h2 className="text-xl font-bold leading-tight">Agenda livre</h2>
              <p className="mt-1 text-sm opacity-90">Aproveite ou planeje algo bom.</p>
            </div>
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 divide-x">
        <Stat label="Hoje" value={String(todayEventsCount)} />
        <Stat label="Tarefas" value={String(dashboardTodosCount)} accent />
      </div>
    </section>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="p-3 text-center">
      <p className={`text-xl font-bold ${accent ? "text-accent" : ""}`}>{value}</p>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}
