import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Bell, ChevronDown, Clock, Copy, Heart, ImageIcon, Loader2, LogOut, Pencil, Plus, Share2, Sliders, Sparkles, Tag, Trash2, Unlink, User as UserIcon, Users } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
  createCategory, createCouple, createReminder, deleteCategory, deleteReminder,
  fetchCategories, fetchCouple, fetchPartnerProfile, fetchProfile, fetchReminders,
  fetchRoutines, joinCoupleByCode, leaveCouple, updateProfile,
  uploadSticker, deleteSticker,
  type Category, type Couple, type Profile, type Reminder, type Routine,
} from "@/lib/data";
import {
  formatTime, generateInviteCode, loadCalendarDensity, PRESET_COLORS,
  saveCalendarDensity, WEEKDAY_FULL, WEEKDAY_LABELS, type CalendarDensity,
} from "@/lib/calendar-utils";
import {
  ANIMATION_OPTIONS, ITEM_ANIMATION_OPTIONS, ILLUSTRATION_OPTIONS,
  PARTICLE_PRESETS, type ParticlePreset,
  type AnimationStyle, type IllustrationId, type BuiltInIllustrationId,
  type CustomIllustration, type HeroTarget,
  loadImportantTaskAnim, loadImportantEventAnim, loadCoupleAnim,
  loadIllustration, loadCustomIllustrations,
  loadWeekColWidth, loadItemPadding,
  loadParticlesImportantIntensity, loadParticlesImportantDensity, loadParticlesImportantBrightness,
  loadParticlesCoupleIntensity, loadParticlesCoupleDensity, loadParticlesCoupleBrightness,
  loadHeroScale, loadHeroTargets, saveHeroScale, saveHeroTargets,
  loadHiddenBuiltIns, hideBuiltInIllustration, restoreBuiltInIllustration,
  HERO_SCALE_MIN, HERO_SCALE_MAX, MAX_CUSTOM_ILLUSTRATIONS,
  saveImportantTaskAnim, saveImportantEventAnim, saveCoupleAnim,
  saveIllustration,
  saveWeekColWidth, saveItemPadding,
  saveParticlesImportantIntensity, saveParticlesImportantDensity, saveParticlesImportantBrightness,
  saveParticlesCoupleIntensity, saveParticlesCoupleDensity, saveParticlesCoupleBrightness,
  applyParticlePresetImportant, applyParticlePresetCouple,
  addCustomIllustration, removeCustomIllustration, updateCustomIllustration,
  resolveHeroImage, cropStyle, activeIllustrationCropStyle,
  WEEK_COL_MIN, WEEK_COL_MAX, ITEM_PAD_MIN, ITEM_PAD_MAX,
  animClass, particleVars,
} from "@/lib/ui-prefs";
import { SafeImage } from "@/components/SafeImage";
import {
  getNotificationPermission, requestNotificationPermission, scheduleAll, subscribeToPushNotifications
} from "@/lib/notifications";
import couplePardoBranca from "@/assets/couple-pardo-branca.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { RoutineDialog } from "@/components/RoutineDialog";
import { RoutineTemplatesDialog } from "@/components/RoutineTemplatesDialog";




export const Route = createFileRoute("/_app/profile")({
  component: ProfilePage,
  head: () => ({ meta: [{ title: "Perfil — Duo" }] }),
});

function ProfilePage() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [partner, setPartner] = useState<Profile | null>(null);
  const [couple, setCouple] = useState<Couple | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [density, setDensity] = useState<CalendarDensity>("compact");
  const [animImportantTask, setAnimImportantTask] = useState<AnimationStyle>("none");
  const [animImportantEvent, setAnimImportantEvent] = useState<AnimationStyle>("none");
  const [animCouple, setAnimCouple] = useState<AnimationStyle>("none");
  const [illustration, setIllustration] = useState<IllustrationId>("couple");
  const [weekColWidth, setWeekColWidth] = useState<number>(11);
  const [itemPadding, setItemPadding] = useState<number>(6);
  const [partImpInt, setPartImpInt] = useState<number>(50);
  const [partImpDen, setPartImpDen] = useState<number>(50);
  const [partImpBri, setPartImpBri] = useState<number>(70);
  const [partCplInt, setPartCplInt] = useState<number>(50);
  const [partCplDen, setPartCplDen] = useState<number>(50);
  const [partCplBri, setPartCplBri] = useState<number>(70);
  const [customIllustrations, setCustomIllustrations] = useState<CustomIllustration[]>([]);
  const [hiddenBuiltIns, setHiddenBuiltIns] = useState<BuiltInIllustrationId[]>([]);
  const [heroScale, setHeroScale] = useState<number>(1);
  const [heroTargets, setHeroTargets] = useState<HeroTarget[]>(["hero", "empty", "login"]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [routineDialogOpen, setRoutineDialogOpen] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);

  useEffect(() => {
    setDensity(loadCalendarDensity());
    setAnimImportantTask(loadImportantTaskAnim());
    setAnimImportantEvent(loadImportantEventAnim());
    setAnimCouple(loadCoupleAnim());
    setIllustration(loadIllustration());
    
    setWeekColWidth(loadWeekColWidth());
    setItemPadding(loadItemPadding());
    setPartImpInt(loadParticlesImportantIntensity());
    setPartImpDen(loadParticlesImportantDensity());
    setPartImpBri(loadParticlesImportantBrightness());
    setPartCplInt(loadParticlesCoupleIntensity());
    setPartCplDen(loadParticlesCoupleDensity());
    setPartCplBri(loadParticlesCoupleBrightness());
    setCustomIllustrations(loadCustomIllustrations());
    setHiddenBuiltIns(loadHiddenBuiltIns());
    setHeroScale(loadHeroScale());
    setHeroTargets(loadHeroTargets());
    const onPrefs = () => {
      setCustomIllustrations(loadCustomIllustrations());
      setHiddenBuiltIns(loadHiddenBuiltIns());
      setIllustration(loadIllustration());
      setPartImpInt(loadParticlesImportantIntensity());
      setPartImpDen(loadParticlesImportantDensity());
      setPartImpBri(loadParticlesImportantBrightness());
      setPartCplInt(loadParticlesCoupleIntensity());
      setPartCplDen(loadParticlesCoupleDensity());
      setPartCplBri(loadParticlesCoupleBrightness());
      setHeroScale(loadHeroScale());
      setHeroTargets(loadHeroTargets());
    };
    window.addEventListener("duo:ui-prefs-change", onPrefs);
    return () => window.removeEventListener("duo:ui-prefs-change", onPrefs);
  }, []);

  const handleDensityChange = (d: CalendarDensity) => {
    setDensity(d);
    saveCalendarDensity(d);
    window.dispatchEvent(new Event("duo:density-change"));
    toast.success(`Densidade: ${d === "compact" ? "Compacto" : "Confortável"}`);
  };

  const handleAnimChange = (
    kind: "importantTask" | "importantEvent" | "couple",
    value: AnimationStyle
  ) => {
    if (kind === "importantTask")  { setAnimImportantTask(value);  saveImportantTaskAnim(value); }
    if (kind === "importantEvent") { setAnimImportantEvent(value); saveImportantEventAnim(value); }
    if (kind === "couple")         { setAnimCouple(value);         saveCoupleAnim(value); }
  };

  const handleIllustrationChange = (id: IllustrationId) => {
    setIllustration(id);
    saveIllustration(id);
    toast.success("Ilustração atualizada ✨");
  };


  const reload = useCallback(async () => {
    if (!user) return;
    const [p, cats, rts, rems] = await Promise.all([
      fetchProfile(user.id),
      fetchCategories(),
      fetchRoutines(),
      fetchReminders(),
    ]);
    setProfile(p);
    setCategories(cats);
    setRoutines(rts);
    setReminders(rems);
    setName(p?.display_name ?? "");
    setColor(p?.color ?? PRESET_COLORS[0]);
    if (p?.couple_id) {
      const [c, partnerP] = await Promise.all([
        fetchCouple(p.couple_id),
        fetchPartnerProfile(p.couple_id, user.id),
      ]);
      setCouple(c);
      setPartner(partnerP);
    } else {
      setCouple(null);
      setPartner(null);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { reload(); }, [reload]);

  // Agenda notificações push locais sempre que a lista de lembretes mudar
  // (e a permissão estiver concedida).
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (getNotificationPermission() !== "granted") return;
    scheduleAll(
      reminders
        .filter((r) => r.is_active !== false)
        .map((r) => ({
          id: r.id,
          title: r.title,
          remindTime: r.remind_time,
          daysOfWeek: r.days_of_week,
          remindAt: r.remind_at,
        }))
    );
  }, [reminders]);

  const handleDeleteCategory = async (id: string) => {
    try {
      await deleteCategory(id);
      toast.success("Categoria removida");
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setBusy(true);
    try {
      await updateProfile(user.id, { display_name: name, color });
      toast.success("Perfil salvo ✨");
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    } finally { setBusy(false); }
  };

  const handleCreateCouple = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const code = generateInviteCode();
      await createCouple(user.id, code);
      toast.success("Casal criado! Compartilhe o código.");
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    } finally { setBusy(false); }
  };

  const handleJoin = async () => {
    if (!user || !joinCode.trim()) return;
    setBusy(true);
    try {
      await joinCoupleByCode(joinCode.trim(), user.id);
      toast.success("Vocês estão conectados 💜");
      setJoinCode("");
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Código inválido");
    } finally { setBusy(false); }
  };

  const handleLeave = async () => {
    if (!user) return;
    setBusy(true);
    try {
      await leaveCouple(user.id);
      toast.success("Você saiu do casal");
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    } finally { setBusy(false); }
  };

  const inviteLink = couple ? `${typeof window !== "undefined" ? window.location.origin : ""}/auth?invite=${couple.invite_code}` : "";

  const copyCode = () => {
    if (!couple) return;
    navigator.clipboard.writeText(couple.invite_code);
    toast.success("Código copiado ✨");
  };

  const shareInvite = async () => {
    if (!couple) return;
    const text = `Vamos sincronizar nossa agenda no Duo 💜\n\nEntre por este link e seremos conectados automaticamente:\n${inviteLink}\n\n(ou use o código ${couple.invite_code} na tela de cadastro)`;
    try {
      if (typeof navigator !== "undefined" && "share" in navigator) {
        await navigator.share({ title: "Convite Duo", text, url: inviteLink });
        return;
      }
    } catch {
      // user cancelled or share failed → fallback
    }
    try {
      await navigator.clipboard.writeText(inviteLink);
      toast.success("Link de convite copiado ✨");
    } catch {
      toast.error("Não foi possível copiar o link");
    }
  };

  const handleDeleteReminder = async (id: string) => {
    try {
      await deleteReminder(id);
      toast.success("Lembrete removido");
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-w-0 max-w-full overflow-x-hidden px-3 pt-6 pb-6 animate-fade-in sm:px-4">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Perfil</h1>
        <p className="text-sm text-muted-foreground">{user?.email}</p>
      </header>

      {/* Profile editor */}
      <CollapsibleSection
        icon={
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl text-base font-bold text-white"
            style={{ backgroundColor: color }}
          >
            {(name || "E").charAt(0).toUpperCase()}
          </div>
        }
        iconBg=""
        title="Sua identidade"
        subtitle="Nome e cor pessoal"
        defaultOpen
      >
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="prof-name">Nome</Label>
            <Input id="prof-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Cor pessoal</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`h-9 w-9 rounded-xl transition-transform ${color === c ? "scale-110 ring-2 ring-foreground/40 ring-offset-2 ring-offset-background" : ""}`}
                  style={{ backgroundColor: c }}
                  aria-label={`Cor ${c}`}
                />
              ))}
            </div>
          </div>
          <Button onClick={handleSaveProfile} disabled={busy} className="w-full gradient-primary text-primary-foreground">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar perfil"}
          </Button>
        </div>
      </CollapsibleSection>

      {/* Couple */}
      <CollapsibleSection
        icon={<Heart className="h-5 w-5 text-accent" fill="currentColor" />}
        iconBg="bg-accent/15"
        title="Casal"
        subtitle="Sincronize compromissos com seu par"
      >

        {couple ? (
          <div className="space-y-4">
            <div className="rounded-xl border bg-muted/30 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Código de convite</p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <p className="min-w-0 flex-1 truncate font-mono text-xl font-bold tracking-widest sm:text-2xl">{couple.invite_code}</p>
                <Button size="sm" variant="outline" onClick={copyCode} className="shrink-0">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {partner ? "Conectado 💜" : "Compartilhe este código com seu par."}
              </p>
            </div>

            {!partner && (
              <Button onClick={shareInvite} className="w-full gradient-primary text-primary-foreground">
                <Share2 className="mr-1.5 h-4 w-4" /> Convidar parceiro(a)
              </Button>
            )}

            {partner && (
              <div className="flex items-center gap-3 rounded-xl border bg-muted/30 p-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-white"
                  style={{ backgroundColor: partner.color }}
                >
                  {partner.display_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold">{partner.display_name}</p>
                  <p className="text-xs text-muted-foreground">Seu par</p>
                </div>
              </div>
            )}

            <Button variant="outline" onClick={handleLeave} disabled={busy} className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive">
              <Unlink className="mr-1.5 h-4 w-4" /> Sair do casal
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <Button onClick={handleCreateCouple} disabled={busy} className="w-full gradient-primary text-primary-foreground">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar casal e gerar código"}
            </Button>
            <div className="relative flex items-center gap-3">
              <span className="h-px flex-1 bg-border" />
              <span className="text-xs uppercase text-muted-foreground">ou</span>
              <span className="h-px flex-1 bg-border" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="join-code">Tenho um código</Label>
              <div className="flex gap-2">
                <Input
                  id="join-code"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  maxLength={6}
                  className="font-mono uppercase tracking-widest"
                />
                <Button onClick={handleJoin} disabled={busy || joinCode.length < 4}>
                  Entrar
                </Button>
              </div>
            </div>
          </div>
        )}
      </CollapsibleSection>

      {/* Categories */}
      <CollapsibleSection
        icon={<Tag className="h-5 w-5 text-primary" />}
        iconBg="bg-primary/10"
        title="Categorias"
        subtitle="Cores para agrupar compromissos e tarefas"
        headerAction={<NewCategoryDialog coupleId={profile?.couple_id ?? null} onCreated={reload} />}
      >

        <ul className="space-y-2">
          {categories.length === 0 && (
            <li className="rounded-xl border border-dashed bg-muted/20 p-6 text-center">
              <p className="text-xs text-muted-foreground">Nenhuma categoria criada ainda.</p>
            </li>
          )}
          {categories.map((c) => (
            <li key={c.id} className="flex items-center gap-3 rounded-xl border bg-muted/20 p-2.5">
              <span className="h-9 w-9 rounded-lg" style={{ backgroundColor: c.color }} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{c.name}</p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  {c.is_shared ? <><Users className="h-3 w-3" /> Compartilhada</> : <><UserIcon className="h-3 w-3" /> Pessoal</>}
                </p>
              </div>
              {c.user_id === user?.id && (
                <button
                  onClick={() => handleDeleteCategory(c.id)}
                  className="tap-target rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label="Remover"
                >
                  <Trash2 className="mx-auto h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      </CollapsibleSection>

      {/* Routines */}
      <CollapsibleSection
        icon={<Clock className="h-5 w-5 text-accent" />}
        iconBg="bg-accent/10"
        title="Rotinas semanais"
        subtitle="Trabalho, reuniões e blocos fixos"
        headerAction={
          <div className="flex shrink-0 items-center gap-1.5">
            <RoutineTemplatesDialog coupleId={profile?.couple_id ?? null} onApplied={reload} />
            <Button
              size="sm"
              variant="outline"
              onClick={() => { setEditingRoutine(null); setRoutineDialogOpen(true); }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        }
      >

        <ul className="space-y-2">
          {routines.length === 0 && (
            <li className="rounded-xl border border-dashed bg-muted/20 p-6 text-center">
              <p className="text-xs text-muted-foreground">
                Nenhuma rotina ainda. Adicione blocos fixos (ex: Trabalho seg–sex 8h–17h).
              </p>
            </li>
          )}
          {routines.map((r) => {
            const isOwn = r.user_id === user?.id;
            return (
              <li key={r.id} className="flex items-center gap-3 rounded-xl border bg-muted/20 p-2.5">
                <span className="h-9 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: r.color }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{r.title}</p>
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span>{WEEKDAY_FULL[r.day_of_week]}</span>
                    <span>•</span>
                    <span className="font-mono">{formatTime(r.start_time)} – {formatTime(r.end_time)}</span>
                    {r.is_shared && <><span>•</span><Heart className="h-3 w-3 text-accent" fill="currentColor" /></>}
                  </p>
                </div>
                {isOwn && (
                  <button
                    onClick={() => { setEditingRoutine(r); setRoutineDialogOpen(true); }}
                    className="tap-target rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="Editar"
                  >
                    <Pencil className="mx-auto h-4 w-4" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </CollapsibleSection>

      {/* Lembretes */}
      <CollapsibleSection
        icon={<Bell className="h-5 w-5 text-warning" />}
        iconBg="bg-warning/15"
        title="Lembretes"
        subtitle="Receba avisos no app sobre seus hábitos e compromissos"
        headerAction={
          <Button size="sm" variant="outline" onClick={() => setReminderDialogOpen(true)} className="shrink-0">
            <Plus className="h-4 w-4" />
          </Button>
        }
      >
        {reminders.length === 0 ? (
          <p className="rounded-xl border border-dashed bg-muted/20 p-4 text-center text-xs text-muted-foreground">
            Nenhum lembrete configurado.
          </p>
        ) : (
          <ul className="space-y-2">
            {reminders.map((r) => (
              <li key={r.id} className="flex items-center gap-3 rounded-xl border bg-muted/20 p-2.5">
                <Bell className="h-4 w-4 shrink-0 text-warning" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{r.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.remind_time && <span className="font-mono">{r.remind_time.slice(0, 5)}</span>}
                    {r.days_of_week && r.days_of_week.length > 0 && (
                      <span className="ml-1.5">
                        {r.days_of_week.map((d) => WEEKDAY_LABELS[d][0]).join(" ")}
                      </span>
                    )}
                    {r.remind_at && !r.remind_time && (
                      <span>{new Date(r.remind_at).toLocaleString("pt-BR")}</span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteReminder(r.id)}
                  className="tap-target rounded-lg text-muted-foreground hover:text-destructive"
                  aria-label="Excluir"
                >
                  <Trash2 className="mx-auto h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <PushNotificationControl />
      </CollapsibleSection>

      {/* Configurações da agenda */}
      <CollapsibleSection
        icon={<Sliders className="h-5 w-5 text-primary" />}
        iconBg="bg-primary/15"
        title="Configurações da agenda"
        subtitle="Aplica-se em todos os dispositivos"
      >
        <div className="space-y-5">
          {/* Densidade */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Densidade</Label>
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
              {(["compact", "comfortable"] as CalendarDensity[]).map((d) => (
                <button
                  key={d}
                  onClick={() => handleDensityChange(d)}
                  className={`rounded-lg py-2 text-sm font-medium transition-all ${
                    density === d ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  {d === "compact" ? "Compacto" : "Confortável"}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Compacto mostra mais horas; confortável dá mais espaço para ler.
            </p>
          </div>

          {/* Largura das colunas (semana) */}
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Largura das colunas (semana)
              </Label>
              <span className="font-mono text-xs text-muted-foreground">{weekColWidth}rem</span>
            </div>
            <input
              type="range"
              min={WEEK_COL_MIN}
              max={WEEK_COL_MAX}
              step={1}
              value={weekColWidth}
              onChange={(e) => {
                const v = Number(e.target.value);
                setWeekColWidth(v);
                saveWeekColWidth(v);
              }}
              className="h-2 w-full cursor-pointer accent-primary"
            />
            <p className="text-[11px] text-muted-foreground">
              Mais estreito → cabem mais dias na tela. Mais largo → mais espaço por dia.
            </p>
          </div>

          {/* Padding interno dos blocos */}
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Espaçamento dos blocos (eventos / tarefas)
              </Label>
              <span className="font-mono text-xs text-muted-foreground">{itemPadding}px</span>
            </div>
            <input
              type="range"
              min={ITEM_PAD_MIN}
              max={ITEM_PAD_MAX}
              step={1}
              value={itemPadding}
              onChange={(e) => {
                const v = Number(e.target.value);
                setItemPadding(v);
                saveItemPadding(v);
              }}
              className="h-2 w-full cursor-pointer accent-primary"
            />
            <p className="text-[11px] text-muted-foreground">
              Controla o respiro interno dos cartões de evento e tarefa.
            </p>
          </div>

          {/* Animações */}
          <div className="space-y-4 rounded-xl border bg-muted/20 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Animações
            </p>

            {/* Preview persistente — mostra Tarefa e Evento importantes lado a lado */}
            <AnimationsPreview
              taskAnim={animImportantTask}
              eventAnim={animImportantEvent}
              particlesImpInt={partImpInt}
              particlesImpDen={partImpDen}
            />

            <AnimationPicker
              label="Tarefas importantes"
              hint="Aplicado a tarefas com prioridade alta."
              value={animImportantTask}
              options={ITEM_ANIMATION_OPTIONS}
              onChange={(v) => handleAnimChange("importantTask", v)}
            />
            <AnimationPicker
              label="Eventos importantes"
              hint="Aplicado a compromissos com prioridade alta."
              value={animImportantEvent}
              options={ITEM_ANIMATION_OPTIONS}
              onChange={(v) => handleAnimChange("importantEvent", v)}
            />
            <AnimationPicker
              label="Itens do casal (compartilhados)"
              hint="Eventos e tarefas marcados como casal."
              value={animCouple}
              options={ITEM_ANIMATION_OPTIONS}
              onChange={(v) => handleAnimChange("couple", v)}
            />

            {/* Sliders + presets de partículas — aparecem quando partículas estão ativas em alguma categoria */}
            {(animImportantTask === "particles" || animImportantEvent === "particles" || animCouple === "particles") && (
              <div className="space-y-4 rounded-lg border border-dashed bg-card/40 p-3">
                <PresetRow
                  label="Partículas — Importantes"
                  onPick={(p) => applyParticlePresetImportant(p)}
                />
                <ParticleSliders
                  intensity={partImpInt}
                  density={partImpDen}
                  brightness={partImpBri}
                  onIntensity={(v) => { setPartImpInt(v); saveParticlesImportantIntensity(v); }}
                  onDensity={(v) => { setPartImpDen(v); saveParticlesImportantDensity(v); }}
                  onBrightness={(v) => { setPartImpBri(v); saveParticlesImportantBrightness(v); }}
                />
                <PresetRow
                  label="Partículas — Casal"
                  onPick={(p) => applyParticlePresetCouple(p)}
                />
                <ParticleSliders
                  intensity={partCplInt}
                  density={partCplDen}
                  brightness={partCplBri}
                  onIntensity={(v) => { setPartCplInt(v); saveParticlesCoupleIntensity(v); }}
                  onDensity={(v) => { setPartCplDen(v); saveParticlesCoupleDensity(v); }}
                  onBrightness={(v) => { setPartCplBri(v); saveParticlesCoupleBrightness(v); }}
                />
              </div>
            )}
            <p className="text-[11px] text-muted-foreground">
              As animações respeitam <span className="font-medium text-foreground">prefers-reduced-motion</span> do seu sistema — quando ativo, ficam estáticas.
            </p>
          </div>
        </div>
      </CollapsibleSection>



      {/* Figurinhas Manuais (upload do usuário) */}
      <CollapsibleSection
        icon={<ImageIcon className="h-5 w-5 text-accent" />}
        iconBg="bg-accent/15"
        title="Figurinhas Manuais"
        subtitle="Envie suas próprias imagens (PNG, JPG, SVG)"
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {customIllustrations.map((ci) => {
            const id = `custom:${ci.id}`;
            const active = id === illustration;
            const crop = ci.crop ?? { zoom: 1, offsetX: 0, offsetY: 0 };
            return (
              <div key={ci.id} className="relative col-span-2 rounded-2xl border border-border bg-muted/20 p-3 sm:col-span-1">
                <button
                  type="button"
                  onClick={() => handleIllustrationChange(id)}
                  className={`flex w-full flex-col items-center gap-2 rounded-xl p-1 transition-all ${
                    active ? "ring-2 ring-primary" : ""
                  }`}
                >
                  <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl bg-card">
                    <SafeImage
                      src={ci.dataUrl}
                      fallbackSrc={couplePardoBranca}
                      alt={ci.label}
                      style={{ width: "100%", height: "100%", ...cropStyle(crop) }}
                    />
                  </div>
                  <div className="text-center">
                    <p className={`max-w-full truncate text-xs font-semibold ${active ? "text-primary" : ""}`}>{ci.label}</p>
                    <p className="text-[10px] text-muted-foreground">Sua imagem</p>
                  </div>
                </button>

                {/* Crop controls */}
                <div className="mt-2 space-y-1.5">
                  <CropSlider
                    label="Zoom"
                    min={100} max={300} step={5}
                    value={Math.round(crop.zoom * 100)}
                    suffix="%"
                    onChange={(v) => updateCustomIllustration(ci.id, { crop: { ...crop, zoom: v / 100 } })}
                  />
                  <CropSlider
                    label="Posição X"
                    min={-50} max={50} step={1}
                    value={crop.offsetX}
                    onChange={(v) => updateCustomIllustration(ci.id, { crop: { ...crop, offsetX: v } })}
                  />
                  <CropSlider
                    label="Posição Y"
                    min={-50} max={50} step={1}
                    value={crop.offsetY}
                    onChange={(v) => updateCustomIllustration(ci.id, { crop: { ...crop, offsetY: v } })}
                  />
                  {(crop.zoom !== 1 || crop.offsetX !== 0 || crop.offsetY !== 0) && (
                    <button
                      type="button"
                      onClick={() => updateCustomIllustration(ci.id, { crop: { zoom: 1, offsetX: 0, offsetY: 0 } })}
                      className="text-[10px] font-medium text-primary hover:underline"
                    >
                      Reset crop
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  aria-label={`Excluir ilustração ${ci.label}`}
                  onClick={async (e) => {
                    e.stopPropagation();
                    toast.loading("Removendo...", { id: "deleting-sticker" });
                    try {
                      if (ci.id.includes("-")) { // UUID (database sticker)
                        await deleteSticker(ci.id, ci.dataUrl);
                      }
                      removeCustomIllustration(ci.id);
                      toast.success("Figurinha removida", { id: "deleting-sticker" });
                    } catch(err) {
                      toast.error("Erro ao remover", { id: "deleting-sticker" });
                    }
                  }}
                  className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border bg-card text-destructive shadow hover:bg-destructive hover:text-destructive-foreground"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            );
          })}

          {/* Upload tile */}
          {customIllustrations.length < MAX_CUSTOM_ILLUSTRATIONS && (
            <label
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-3 text-primary transition-colors hover:bg-primary/10"
              title="Adicionar ilustração do seu dispositivo (PNG, JPG, WEBP, SVG)"
            >
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="sr-only"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 2 * 1024 * 1024) {
                    toast.error("Imagem muito grande (máx. 2 MB)");
                    e.target.value = "";
                    return;
                  }
                  try {
                    const dataUrl = await new Promise<string>((res, rej) => {
                      const r = new FileReader();
                      r.onload = () => res(String(r.result));
                      r.onerror = rej;
                      r.readAsDataURL(file);
                    });
                    const label = file.name.split(".")[0];
                    // Upload to database if part of couple
                    if (profile?.couple_id && profile?.id) {
                      toast.loading("Enviando...", { id: "uploading-sticker" });
                      try {
                        const sticker = await uploadSticker(profile.couple_id, profile.id, dataUrl, label);
                        const id = sticker.id;
                        addCustomIllustration({ id, label, dataUrl: sticker.image_url, crop: { zoom: 1, offsetX: 0, offsetY: 0 } });
                        handleIllustrationChange(`custom:${id}`);
                        toast.success("Figurinha enviada e salva! ✨", { id: "uploading-sticker" });
                      } catch (err) {
                        toast.error("Erro ao enviar figurinha para a nuvem", { id: "uploading-sticker" });
                        console.error(err);
                      }
                    } else {
                      // Fallback for single user without couple
                      const id = `${Date.now()}`;
                      addCustomIllustration({ id, label, dataUrl, crop: { zoom: 1, offsetX: 0, offsetY: 0 } });
                      handleIllustrationChange(`custom:${id}`);
                      toast.success("Ilustração adicionada localmente ✨");
                    }
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Erro ao adicionar imagem");
                  }
                  e.target.value = "";
                }}
              />
              <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-dashed bg-card">
                <Plus className="h-6 w-6" />
              </div>
              <p className="text-center text-[11px] font-semibold">Adicionar imagem</p>
              <p className="text-center text-[10px] text-muted-foreground">PNG/JPG/SVG · até 2 MB</p>
              <p className="text-center text-[10px] text-muted-foreground">{customIllustrations.length}/{MAX_CUSTOM_ILLUSTRATIONS}</p>
            </label>
          )}
        </div>

        {customIllustrations.length >= MAX_CUSTOM_ILLUSTRATIONS && (
          <p className="mt-2 rounded-lg bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
            Você atingiu o limite de {MAX_CUSTOM_ILLUSTRATIONS} imagens. Exclua uma para adicionar outra.
          </p>
        )}
      </CollapsibleSection>

      <Button variant="ghost" onClick={signOut} className="w-full text-muted-foreground">
        <LogOut className="mr-1.5 h-4 w-4" /> Sair
      </Button>

      <RoutineDialog
        open={routineDialogOpen}
        onOpenChange={setRoutineDialogOpen}
        routine={editingRoutine}
        coupleId={profile?.couple_id ?? null}
        onSaved={reload}
      />
      <NewReminderDialog
        open={reminderDialogOpen}
        onOpenChange={setReminderDialogOpen}
        onCreated={reload}
      />
    </div>
  );
}

function NewReminderDialog({
  open, onOpenChange, onCreated,
}: { open: boolean; onOpenChange: (v: boolean) => void; onCreated: () => void }) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("09:00");
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [busy, setBusy] = useState(false);

  const toggleDay = (d: number) => {
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim()) return;
    setBusy(true);
    try {
      await createReminder({
        user_id: user.id,
        title: title.trim(),
        remind_time: `${time}:00`,
        days_of_week: days.length > 0 ? days : null,
      });
      toast.success("Lembrete criado 🔔");
      setTitle(""); setTime("09:00"); setDays([1, 2, 3, 4, 5]);
      onOpenChange(false);
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Novo lembrete</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="rem-title">Mensagem</Label>
            <Input id="rem-title" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Beber água, Tomar remédio..." required autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rem-time">Horário</Label>
            <Input id="rem-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Dias da semana</Label>
            <div className="grid grid-cols-7 gap-1.5">
              {WEEKDAY_LABELS.map((label, i) => {
                const active = days.includes(i);
                return (
                  <button key={i} type="button" onClick={() => toggleDay(i)}
                    className={`rounded-lg py-2 text-xs font-semibold transition-all ${
                      active ? "gradient-primary text-primary-foreground shadow" : "bg-muted text-muted-foreground"
                    }`}>
                    {label[0]}
                  </button>
                );
              })}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancelar</Button>
            <Button type="submit" disabled={busy} className="gradient-primary text-primary-foreground">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function NewCategoryDialog({ coupleId, onCreated }: { coupleId: string | null; onCreated: () => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [isShared, setIsShared] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;
    setBusy(true);
    try {
      await createCategory({
        user_id: user.id,
        couple_id: isShared ? coupleId : null,
        name: name.trim(),
        color,
      } as any);
      toast.success("Categoria criada");
      setName(""); setColor(PRESET_COLORS[0]); setIsShared(false);
      setOpen(false);
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="shrink-0">
          <Plus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Nova categoria</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cat-name">Nome</Label>
            <Input id="cat-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Trabalho, Saúde, Datas..." required autoFocus />
          </div>
          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-9 w-9 rounded-xl transition-transform ${color === c ? "scale-110 ring-2 ring-foreground/40 ring-offset-2 ring-offset-background" : ""}`}
                  style={{ backgroundColor: c }}
                  aria-label={`Cor ${c}`}
                />
              ))}
            </div>
          </div>
          {coupleId && (
            <div className="flex items-center justify-between rounded-xl border bg-muted/30 px-4 py-3">
              <div>
                <Label htmlFor="cat-shared" className="cursor-pointer">Compartilhar com o casal</Label>
                <p className="text-xs text-muted-foreground">Disponível para os dois</p>
              </div>
              <Switch id="cat-shared" checked={isShared} onCheckedChange={setIsShared} />
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancelar</Button>
            <Button type="submit" disabled={busy} className="gradient-primary text-primary-foreground">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ParticleSliders({
  intensity, density, brightness, onIntensity, onDensity, onBrightness,
}: {
  intensity: number; density: number; brightness: number;
  onIntensity: (v: number) => void; onDensity: (v: number) => void; onBrightness: (v: number) => void;
}) {
  return (
    <div className="space-y-2">
      <SliderRow label="Intensidade" value={intensity} onChange={onIntensity} />
      <SliderRow label="Densidade"   value={density}   onChange={onDensity} />
      <SliderRow
        label="Brilho"
        hint="Reduz brilho/ruído sem mudar a densidade — útil em telas claras."
        value={brightness}
        onChange={onBrightness}
      />
    </div>
  );
}

function SliderRow({
  label, value, onChange, hint,
}: { label: string; value: number; onChange: (v: number) => void; hint?: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between">
        <Label className="text-[11px] text-muted-foreground">{label}</Label>
        <span className="font-mono text-[10px] text-muted-foreground">{value}%</span>
      </div>
      <input
        type="range" min={0} max={100} step={5} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer accent-primary"
      />
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function PresetRow({
  label, onPick,
}: { label: string; onPick: (p: ParticlePreset) => void }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="grid grid-cols-3 gap-1.5">
        {(Object.keys(PARTICLE_PRESETS) as ParticlePreset[]).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPick(p)}
            className="rounded-md border bg-card/60 px-2 py-1 text-[11px] font-medium text-foreground hover:bg-muted"
          >
            {PARTICLE_PRESETS[p].label}
          </button>
        ))}
      </div>
    </div>
  );
}

function AnimationsPreview({
  taskAnim, eventAnim, particlesImpInt, particlesImpDen,
}: {
  taskAnim: AnimationStyle;
  eventAnim: AnimationStyle;
  particlesImpInt: number;
  particlesImpDen: number;
}) {
  const taskCls  = animClass(taskAnim);
  const eventCls = animClass(eventAnim);
  const partStyle = particleVars(particlesImpInt, particlesImpDen);
  return (
    <div className="space-y-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Pré-visualização ao vivo</p>
      <div className="grid grid-cols-2 gap-2">
        <div
          className={`rounded-xl border bg-card p-3 ${taskCls}`}
          style={taskCls === "anim-particles" ? partStyle : undefined}
          aria-label="Pré-visualização: tarefa importante"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Tarefa</p>
          <p className="mt-0.5 truncate text-xs font-semibold text-foreground">Revisar contrato</p>
          <p className="text-[10px] text-warning">Importante</p>
        </div>
        <div
          className={`rounded-xl border bg-card p-3 ${eventCls}`}
          style={eventCls === "anim-particles" ? partStyle : undefined}
          aria-label="Pré-visualização: evento importante"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Evento</p>
          <p className="mt-0.5 truncate text-xs font-semibold text-foreground">Aniversário 19h</p>
          <p className="text-[10px] text-warning">Importante</p>
        </div>
      </div>
    </div>
  );
}

function AnimationPicker({
  label, hint, value, options = ANIMATION_OPTIONS, onChange,
}: {
  label: string;
  hint?: string;
  value: AnimationStyle;
  options?: { value: AnimationStyle; label: string; description: string }[];
  onChange: (v: AnimationStyle) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs font-medium">{label}</Label>
        <span
          aria-hidden
          className={`h-3 w-3 rounded-full bg-primary ${animClass(value)}`}
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              title={opt.description}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all ${
                active
                  ? "gradient-primary text-primary-foreground shadow-sm"
                  : "bg-card text-muted-foreground hover:bg-muted"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function CollapsibleSection({
  icon,
  iconBg,
  title,
  subtitle,
  headerAction,
  defaultOpen = false,
  children,
}: {
  icon: ReactNode;
  iconBg?: string;
  title: string;
  subtitle?: string;
  headerAction?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="mb-4 overflow-hidden rounded-2xl border bg-card sm:mb-5">
      <div className="flex items-center gap-2 px-3 py-3 sm:gap-3 sm:px-5 sm:py-4">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-2 text-left sm:gap-3"
        >
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10 ${iconBg ?? ""}`}>
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{title}</p>
            {subtitle && (
              <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
        {headerAction && (
          <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
            {headerAction}
          </div>
        )}
      </div>
      {open && (
        <div className="animate-fade-in min-w-0 border-t px-3 py-4 sm:px-5">
          {children}
        </div>
      )}
    </section>
  );
}

function CropSlider({ label, value, min, max, step = 1, suffix = "", onChange }: {
  label: string; value: number; min: number; max: number; step?: number; suffix?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-0.5 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{label}</span>
        <span>{value}{suffix}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        className="w-full accent-primary"
      />
    </div>
  );
}

function PushNotificationControl() {
  const { user } = useAuth();
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">(() =>
    typeof window === "undefined" ? "default" : getNotificationPermission()
  );

  const handleEnable = async () => {
    toast.loading("Configurando notificações push...", { id: "push-sub" });
    const r = await requestNotificationPermission();
    setPerm(r);
    if (r === "granted") {
      if (user?.id) {
        const sub = await subscribeToPushNotifications(user.id);
        if (sub) {
          toast.success("Notificações ativadas! Você receberá alertas mesmo com o app fechado. 🔔", { id: "push-sub" });
        } else {
          toast.error("Erro ao registrar o serviço de push em segundo plano.", { id: "push-sub" });
        }
      } else {
         toast.success("Notificações ativadas 🔔", { id: "push-sub" });
      }
    } else if (r === "denied") {
      toast.error("Permissão negada. Habilite manualmente nas configurações do navegador.", { id: "push-sub" });
    } else if (r === "unsupported") {
      toast.error("Este navegador não suporta notificações.", { id: "push-sub" });
    }
  };

  if (perm === "unsupported") {
    return (
      <p className="mt-3 text-[11px] text-muted-foreground">
        Seu navegador não suporta notificações. Os lembretes ainda aparecerão dentro do app.
      </p>
    );
  }

  return (
    <div className="mt-3 rounded-xl border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold">Notificações push (App Fechado)</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {perm === "granted"
              ? "Ativadas. Você receberá os lembretes mesmo se o app estiver fechado ou em segundo plano."
              : perm === "denied"
              ? "Bloqueadas. Habilite no cadeado da barra de endereço para receber alertas."
              : "Permita para receber lembretes no horário programado, independente do app."}
          </p>
        </div>
        {perm !== "granted" && (
          <Button size="sm" variant="outline" onClick={handleEnable} className="shrink-0">
            <Bell className="mr-1 h-3.5 w-3.5" /> Ativar
          </Button>
        )}
      </div>
    </div>
  );
}
