import { Outlet, createRootRoute, HeadContent, Scripts, Link } from "@tanstack/react-router";
import appCss from "../styles.css?url";
import { AuthProvider } from "@/hooks/useAuth";
import { Toaster } from "@/components/ui/sonner";
import { registerSW } from "virtual:pwa-register";

if (typeof window !== "undefined") {
  registerSW({ immediate: true });
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center animate-fade-in">
        <h1 className="text-7xl font-bold text-gradient">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          O que você procura não existe ou foi movido.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:bg-primary-glow"
        >
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#1a1a2e" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { title: "Duo — Calendário do Casal" },
      { name: "description", content: "Agenda compartilhada para casais. Organize compromissos individuais e em conjunto, com lembretes visuais e prioridades." },
      { property: "og:title", content: "Duo — Calendário do Casal" },
      { name: "twitter:title", content: "Duo — Calendário do Casal" },
      { property: "og:description", content: "Agenda compartilhada para casais. Organize compromissos individuais e em conjunto, com lembretes visuais e prioridades." },
      { name: "twitter:description", content: "Agenda compartilhada para casais. Organize compromissos individuais e em conjunto, com lembretes visuais e prioridades." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/04de0441-e6f5-4e76-86e7-8fea7c5c230d/id-preview-b9c34085--5e7f019c-3e7e-4d61-9bf1-7593b7af5ff9.lovable.app-1777775223856.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/04de0441-e6f5-4e76-86e7-8fea7c5c230d/id-preview-b9c34085--5e7f019c-3e7e-4d61-9bf1-7593b7af5ff9.lovable.app-1777775223856.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <AuthProvider>
      <Outlet />
      <Toaster position="top-center" />
    </AuthProvider>
  );
}
