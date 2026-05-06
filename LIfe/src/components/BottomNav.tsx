import { Link, useRouterState } from "@tanstack/react-router";
import { Calendar, CheckSquare, LayoutDashboard, Target, User } from "lucide-react";

const TABS = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Início" },
  { to: "/calendar", icon: Calendar, label: "Agenda" },
  { to: "/habits", icon: Target, label: "Hábitos" },
  { to: "/todos", icon: CheckSquare, label: "Tarefas" },
  { to: "/profile", icon: User, label: "Perfil" },
] as const;

export function BottomNav() {
  const { location } = useRouterState();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-2xl items-stretch justify-around px-2">
        {TABS.map(({ to, icon: Icon, label }) => {
          const active = location.pathname.startsWith(to);
          return (
            <li key={to} className="flex-1">
              <Link
                to={to}
                className={`tap-target flex flex-col items-center justify-center gap-1 py-2 text-xs transition-colors ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className={`h-5 w-5 transition-transform ${active ? "scale-110" : ""}`} strokeWidth={active ? 2.4 : 2} />
                <span className={active ? "font-semibold" : ""}>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
