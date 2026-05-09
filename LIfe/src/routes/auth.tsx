import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Heart, Loader2, Mail, Lock, User as UserIcon, Sparkles } from "lucide-react";
import couplePardoBranca from "@/assets/couple-pardo-branca.png";
import { useUiPrefs, animClass, resolveHeroImage, activeIllustrationCropStyle, type BuiltInIllustrationId } from "@/lib/ui-prefs";
import { SafeImage } from "@/components/SafeImage";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { joinCoupleByCode } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  validateSearch: (search: Record<string, unknown>): { invite?: string } => ({
    invite: typeof search.invite === "string" ? search.invite.toUpperCase().slice(0, 8) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Entrar — Duo" },
      { name: "description", content: "Acesse sua agenda compartilhada de casal." },
    ],
  }),
});

function AuthPage() {
  const ui = useUiPrefs();
  const emptyAnim = animClass(ui.empty);
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const { invite } = Route.useSearch();
  const hasInvite = useMemo(() => Boolean(invite && invite.length >= 4), [invite]);
  const [mode, setMode] = useState<"signin" | "signup">(hasInvite ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  // After auth, if we have an invite code, auto-join the couple before redirecting.
  useEffect(() => {
    if (loading || !session) return;
    const userId = session.user.id;
    (async () => {
      if (hasInvite && invite) {
        try {
          await joinCoupleByCode(invite, userId);
          toast.success("Vocês estão conectados 💜");
        } catch (err) {
          // If already in a couple or invalid, just continue silently with a soft notice.
          const msg = err instanceof Error ? err.message : "";
          if (msg) toast.error(`Convite: ${msg}`);
        }
      }
      navigate({ to: "/dashboard", replace: true });
    })();
  }, [session, loading, hasInvite, invite, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard${invite ? `?invite=${invite}` : ""}`,
            data: { display_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Conta criada! Você já pode entrar.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro inesperado";
      toast.error(msg.includes("Invalid login") ? "Email ou senha incorretos" : msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -top-32 -right-20 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-accent/15 blur-3xl" />

      <div className="relative z-10 w-full max-w-sm animate-slide-up">
        <div className="mb-8 flex flex-col items-center text-center">
          {(() => {
            const loginActive = ui.heroTargets.includes("login");
            const fallbackSrc = couplePardoBranca;
            const src = loginActive
              ? resolveHeroImage({
                  sticker: ui.sticker,
                  illustration: ui.illustration,
                  customStickers: ui.customStickers,
                  customIllustrations: ui.customIllustrations,
                  builtInIllustrations: { "pardo-branca": couplePardoBranca, "couple": couplePardoBranca } as any,
                })
              : fallbackSrc;
            const cropS = loginActive ? activeIllustrationCropStyle(ui.illustration, ui.customIllustrations) : { objectFit: "contain" as const, objectPosition: "center" as const };
            const base = 160;
            const px = Math.round(base * ui.heroScale);
            return (
              <div className={`mb-2 overflow-hidden drop-shadow-xl ${emptyAnim}`} style={{ width: px, height: px }}>
                <SafeImage
                  src={src}
                  fallbackSrc={fallbackSrc}
                  alt="Ilustração de um casal organizando a agenda juntos"
                  width={768}
                  height={768}
                  style={{ width: "100%", height: "100%", ...cropS }}
                />
              </div>
            );
          })()}
          <Logo size={64} className="mb-4 shadow-lg shadow-primary/30" />
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="text-gradient">Duo</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            A agenda do casal — visual, simples e em sintonia.
          </p>
        </div>

        {hasInvite && (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-accent/30 bg-accent/10 p-4 animate-fade-in">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
            <div className="text-sm">
              <p className="font-semibold text-foreground">Você foi convidado(a) 💜</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Crie sua conta ou entre — vocês serão conectados automaticamente como casal.
              </p>
              <p className="mt-2 font-mono text-xs tracking-widest text-accent">Código: {invite}</p>
            </div>
          </div>
        )}

        <div className="rounded-3xl border bg-card p-6 shadow-xl shadow-black/5">
          <div className="mb-5 grid grid-cols-2 rounded-xl bg-muted p-1">
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`rounded-lg py-2 text-sm font-medium transition-all ${
                  mode === m ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                {m === "signin" ? "Entrar" : "Criar conta"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Seu nome</Label>
                <div className="relative">
                  <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Como você se chama?"
                    className="h-11 pl-9"
                  />
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@exemplo.com"
                  className="h-11 pl-9"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-11 pl-9"
                />
              </div>
            </div>

            <Button type="submit" disabled={busy} className="h-11 w-full gradient-primary text-primary-foreground hover:opacity-95">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "signin" ? "Entrar" : "Criar conta"}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Para sincronizar com seu par, criem o casal na aba Perfil após entrar.
        </p>
      </div>
    </div>
  );
}
