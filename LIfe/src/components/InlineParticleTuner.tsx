import { Sliders, RotateCcw } from "lucide-react";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import {
  ITEM_ANIMATION_OPTIONS,
  PARTICLE_PRESETS,
  type AnimationStyle,
  type ParticlePreset,
  loadItemOverride, saveItemOverride, clearItemOverride,
  loadParticlesImportantIntensity, loadParticlesImportantDensity, loadParticlesImportantBrightness, loadParticlesImportantColor,
  loadParticlesCoupleIntensity, loadParticlesCoupleDensity, loadParticlesCoupleBrightness, loadParticlesCoupleColor,
  saveParticlesImportantIntensity, saveParticlesImportantDensity, saveParticlesImportantBrightness, saveParticlesImportantColor,
  saveParticlesCoupleIntensity, saveParticlesCoupleDensity, saveParticlesCoupleBrightness, saveParticlesCoupleColor,
  applyParticlePresetImportant, applyParticlePresetCouple,
  loadImportantTaskAnim, loadImportantEventAnim, loadCoupleAnim,
  useUiPrefs,
} from "@/lib/ui-prefs";

type Category = "important" | "couple";

/**
 * Botão sobreposto que abre popover com:
 *  • Presets rápidos (Suave / Equilibrado / Intenso)
 *  • Sliders Intensidade / Densidade / Brilho
 *  • (opcional, se itemId) Animação override + reset por item
 */
export function InlineParticleTuner({
  category,
  className,
  itemId,
}: {
  category: Category;
  className?: string;
  itemId?: string;
}) {
  const ui = useUiPrefs();
  const override = itemId ? (ui.itemOverrides[itemId] ?? {}) : {};

  // resolve current values (override > category default)
  const baseIntensity = category === "important" ? ui.particlesImportant.intensity  : ui.particlesCouple.intensity;
  const baseDensity   = category === "important" ? ui.particlesImportant.density    : ui.particlesCouple.density;
  const baseBright    = category === "important" ? ui.particlesImportant.brightness : ui.particlesCouple.brightness;
  const baseColor     = category === "important" ? ui.particlesImportant.color      : ui.particlesCouple.color;

  const intensity  = override.intensity  ?? baseIntensity;
  const density    = override.density    ?? baseDensity;
  const brightness = override.brightness ?? baseBright;
  const color      = override.color      ?? baseColor;
  const itemAnim   = override.anim;

  const setIntensity = (v: number) => {
    if (itemId) saveItemOverride(itemId, { intensity: v });
    else if (category === "important") saveParticlesImportantIntensity(v);
    else saveParticlesCoupleIntensity(v);
  };
  const setDensity = (v: number) => {
    if (itemId) saveItemOverride(itemId, { density: v });
    else if (category === "important") saveParticlesImportantDensity(v);
    else saveParticlesCoupleDensity(v);
  };
  const setBrightness = (v: number) => {
    if (itemId) saveItemOverride(itemId, { brightness: v });
    else if (category === "important") saveParticlesImportantBrightness(v);
    else saveParticlesCoupleBrightness(v);
  };
  const setColor = (v: string) => {
    if (itemId) saveItemOverride(itemId, { color: v });
    else if (category === "important") saveParticlesImportantColor(v);
    else saveParticlesCoupleColor(v);
  };
  const applyPreset = (p: ParticlePreset) => {
    if (itemId) {
      const v = PARTICLE_PRESETS[p];
      saveItemOverride(itemId, { intensity: v.intensity, density: v.density, brightness: v.brightness });
    } else if (category === "important") applyParticlePresetImportant(p);
    else applyParticlePresetCouple(p);
  };
  const setAnim = (v: AnimationStyle) => {
    if (!itemId) return;
    saveItemOverride(itemId, { anim: v });
  };
  const reset = () => { if (itemId) clearItemOverride(itemId); };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Ajustar partículas — ${category === "important" ? "Importantes" : "Casal"}`}
          onClick={(e) => e.stopPropagation()}
          className={
            `inline-flex h-7 w-7 items-center justify-center rounded-lg border bg-card/80 text-muted-foreground ` +
            `backdrop-blur transition-colors hover:bg-card hover:text-foreground ` +
            `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ` +
            (className ?? "")
          }
        >
          <Sliders className="h-3.5 w-3.5" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="top"
        className="w-64 space-y-3 p-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {itemId ? "Este cartão" : "Partículas"} — {category === "important" ? "Importantes" : "Casal"}
          </p>
          {itemId && Object.keys(override).length > 0 && (
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Resetar este cartão"
            >
              <RotateCcw className="h-3 w-3" /> reset
            </button>
          )}
        </div>

        {/* Presets */}
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Preset</Label>
          <div className="grid grid-cols-3 gap-1">
            {(Object.keys(PARTICLE_PRESETS) as ParticlePreset[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => applyPreset(p)}
                className="rounded-md border bg-card/60 px-1.5 py-1 text-[10px] font-medium text-foreground hover:bg-muted"
              >
                {PARTICLE_PRESETS[p].label}
              </button>
            ))}
          </div>
        </div>

        {/* Per-item animation override */}
        {itemId && (
          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Animação (este cartão)
            </Label>
            <select
              value={itemAnim ?? ""}
              onChange={(e) => setAnim(e.target.value as AnimationStyle)}
              className="w-full rounded-md border bg-card px-2 py-1 text-[11px]"
            >
              <option value="">— usar padrão —</option>
              {ITEM_ANIMATION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        )}

        <SliderRow label="Intensidade" value={intensity} onChange={setIntensity} />
        <SliderRow label="Densidade"   value={density}   onChange={setDensity} />
        <SliderRow label="Brilho"      value={brightness} onChange={setBrightness}
          hint="Reduz o brilho/ruído sem mudar a densidade." />

        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Cor customizada</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={color || "#6366f1"}
              onChange={(e) => setColor(e.target.value)}
              className="h-8 w-8 cursor-pointer overflow-hidden rounded-md border-0 bg-transparent p-0"
            />
            <input
              type="text"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="Ex: #ff0000"
              className="flex-1 rounded-md border bg-card px-2 py-1 text-[11px]"
            />
            {color && (
              <button
                type="button"
                onClick={() => setColor("")}
                className="text-[10px] text-primary hover:underline"
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        {!itemId && (
          <p className="text-[10px] text-muted-foreground">
            Aplica-se a todos os cartões desta categoria. Use o botão dentro de cada cartão para ajustes individuais.
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}

function SliderRow({
  label, value, onChange, hint,
}: { label: string; value: number; onChange: (v: number) => void; hint?: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between">
        <Label className="text-[11px] text-foreground">{label}</Label>
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

/** Função utilitária — exibe o tuner apenas quando partículas estão ativas. */
export function shouldShowTuner(animClassName: string): boolean {
  return animClassName === "anim-particles";
}

/** Resolve effective animation + particle vars for an item, considering overrides. */
export function resolveItemEffective(
  itemId: string,
  category: Category,
): { anim: AnimationStyle; intensity: number; density: number; brightness: number } {
  const override = loadItemOverride(itemId);
  const baseAnim =
    category === "important" ? loadImportantTaskAnim() :
    loadCoupleAnim();
  const baseI = category === "important" ? loadParticlesImportantIntensity()  : loadParticlesCoupleIntensity();
  const baseD = category === "important" ? loadParticlesImportantDensity()    : loadParticlesCoupleDensity();
  const baseB = category === "important" ? loadParticlesImportantBrightness() : loadParticlesCoupleBrightness();
  return {
    anim: (override.anim ?? baseAnim) as AnimationStyle,
    intensity:  override.intensity  ?? baseI,
    density:    override.density    ?? baseD,
    brightness: override.brightness ?? baseB,
  };
}

/** Specialised resolver: importantTask vs importantEvent base, couple if shared. */
export function resolveTaskAnim(itemId: string): AnimationStyle {
  return (loadItemOverride(itemId).anim ?? loadImportantTaskAnim()) as AnimationStyle;
}
export function resolveEventAnim(itemId: string): AnimationStyle {
  return (loadItemOverride(itemId).anim ?? loadImportantEventAnim()) as AnimationStyle;
}
