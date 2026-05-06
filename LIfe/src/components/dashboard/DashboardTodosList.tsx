import { CheckSquare, Square, Heart } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { fmt, PRIORITY_LABELS } from "@/lib/calendar-utils";
import { InlineParticleTuner, shouldShowTuner } from "@/components/InlineParticleTuner";
import { parseISO } from "date-fns";
import type { Todo } from "@/lib/data";

interface DashboardTodosListProps {
  dashboardTodos: Todo[];
  now: Date;
  importantTaskAnim: string;
  coupleAnim: string;
  particlesImpStyle: React.CSSProperties;
  particlesCplStyle: React.CSSProperties;
  onToggleTodo: (t: Todo) => Promise<void>;
}

export function DashboardTodosList({
  dashboardTodos,
  now,
  importantTaskAnim,
  coupleAnim,
  particlesImpStyle,
  particlesCplStyle,
  onToggleTodo,
}: DashboardTodosListProps) {
  if (dashboardTodos.length === 0) return null;

  return (
    <section className="mb-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <CheckSquare className="h-4 w-4 text-primary" />
          Suas tarefas
        </h3>
        <Link to="/todos" className="text-xs font-medium text-primary">Ver todas →</Link>
      </div>
      <ul className="space-y-2">
        {dashboardTodos.map((t) => {
          const due = t.due_at ? parseISO(t.due_at) : null;
          const overdue = due && due < now;
          return (
            <li
              key={t.id}
              className={`flex items-start gap-3 rounded-xl border bg-card p-3 transition-all hover:border-primary/40 ${t.priority >= 2 ? importantTaskAnim : ""} ${t.is_shared ? coupleAnim : ""}`}
              style={{
                ...(t.priority >= 2 && importantTaskAnim === "anim-particles" ? particlesImpStyle : {}),
                ...(t.is_shared && coupleAnim === "anim-particles" ? particlesCplStyle : {}),
              }}
            >
              <button
                onClick={() => onToggleTodo(t)}
                className="mt-0.5 shrink-0 text-muted-foreground transition-colors hover:text-primary"
                aria-label="Concluir tarefa"
              >
                <Square className="h-5 w-5" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{t.title}</p>
                <p className="mt-0.5 flex items-center gap-2 text-xs">
                  {due && (
                    <span className={overdue ? "font-medium text-destructive" : "text-muted-foreground"}>
                      {overdue ? "Atrasada • " : ""}{fmt(due, "EEE, HH:mm")}
                    </span>
                  )}
                  {t.priority >= 2 && (
                    <span className={t.priority === 3 ? "font-medium text-destructive" : "font-medium text-warning"}>
                      {PRIORITY_LABELS[t.priority]}
                    </span>
                  )}
                  {t.is_shared && <Heart className="h-3 w-3 text-accent" fill="currentColor" />}
                </p>
              </div>
              {t.priority >= 2 && shouldShowTuner(importantTaskAnim) && <InlineParticleTuner category="important" />}
              {t.is_shared && shouldShowTuner(coupleAnim) && <InlineParticleTuner category="couple" />}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
