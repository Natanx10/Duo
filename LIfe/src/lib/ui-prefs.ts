/* ── User UI preferences (persisted in localStorage) ──
 * Centraliza animações, larguras, ilustração e adesivos no app.
 * Emite "duo:ui-prefs-change" para que outras telas reajam sem reload.
 */

export type AnimationStyle =
  | "float" | "fade" | "gentle" | "pulse" | "shimmer"
  | "wave" | "particles" | "romantic"
  | "none";

export const ANIMATION_OPTIONS: { value: AnimationStyle; label: string; description: string }[] = [
  { value: "float",     label: "Flutuar",   description: "Sobe e desce suave" },
  { value: "fade",      label: "Fade",      description: "Desvanece suave" },
  { value: "gentle",    label: "Gentil",    description: "Float bem sutil" },
  { value: "pulse",     label: "Pulsar",    description: "Brilho rítmico" },
  { value: "shimmer",   label: "Brilho",    description: "Reflexo sutil" },
  { value: "wave",      label: "Onda",      description: "Linhas onduladas internas" },
  { value: "particles", label: "Partículas",description: "Partículas suspensas" },
  { value: "romantic",  label: "Romântico", description: "Pulsar de coração" },
  { value: "none",      label: "Nenhuma",   description: "Sem animação" },
];

/** Para tarefas/eventos importantes e itens do casal: somente novas opções + nenhuma. */
export const ITEM_ANIMATION_OPTIONS = ANIMATION_OPTIONS.filter((o) =>
  ["wave", "particles", "romantic", "pulse", "shimmer", "none"].includes(o.value)
);

const KEYS = {
  empty:           "duo:anim-empty",
  importantTask:   "duo:anim-important-task",
  importantEvent:  "duo:anim-important-event",
  /** legado: aplicado se importantTask/importantEvent não existirem */
  important:       "duo:anim-important",
  couple:          "duo:anim-couple",
  weekColW:        "duo:week-col-width",
  itemPad:         "duo:item-padding",
  illust:          "duo:illustration",
  sticker:         "duo:sticker",
  customStickers:  "duo:custom-stickers",
  customIllustrations: "duo:custom-illustrations",
  // Partículas — sliders separados por categoria
  partImpIntensity: "duo:particles-important-intensity",
  partImpDensity:   "duo:particles-important-density",
  partImpBrightness:"duo:particles-important-brightness",
  partImpColor:     "duo:particles-important-color",
  partCplIntensity: "duo:particles-couple-intensity",
  partCplDensity:   "duo:particles-couple-density",
  partCplBrightness:"duo:particles-couple-brightness",
  partCplColor:     "duo:particles-couple-color",
  // Overrides por item: { [itemId]: { anim?, intensity?, density?, brightness?, color? } }
  itemOverrides:    "duo:item-overrides",
  // Zoom da agenda (dia/semana) — persistido entre sessões
  dayZoom:          "duo:day-zoom",
  weekZoom:         "duo:week-zoom",
  // Ilustração — escala (50–150%) e onde aplicar (hero/empty/login)
  heroScale:        "duo:hero-scale",
  heroTargets:      "duo:hero-targets",
  // Built-ins ocultadas pelo usuário ("excluídas" da seleção)
  hiddenBuiltIns:   "duo:illustration-hidden",
} as const;

export const MAX_CUSTOM_ILLUSTRATIONS = 10;

export type HeroTarget = "hero" | "empty" | "login";
export const HERO_SCALE_MIN = 0.5;
export const HERO_SCALE_MAX = 1.5;
export const HERO_SCALE_DEFAULT = 1;
const ALL_HERO_TARGETS: HeroTarget[] = ["hero", "empty", "login"];

export function loadHeroScale(): number {
  if (typeof window === "undefined") return HERO_SCALE_DEFAULT;
  const n = parseFloat(window.localStorage.getItem(KEYS.heroScale) ?? "");
  if (!Number.isFinite(n)) return HERO_SCALE_DEFAULT;
  return Math.min(HERO_SCALE_MAX, Math.max(HERO_SCALE_MIN, n));
}
export function saveHeroScale(v: number) {
  window.localStorage.setItem(KEYS.heroScale, String(v));
  notify();
}
export function loadHeroTargets(): HeroTarget[] {
  if (typeof window === "undefined") return ALL_HERO_TARGETS;
  try {
    const raw = window.localStorage.getItem(KEYS.heroTargets);
    if (!raw) return ALL_HERO_TARGETS;
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return ALL_HERO_TARGETS;
    const filtered = arr.filter((x): x is HeroTarget => ALL_HERO_TARGETS.includes(x));
    return filtered.length ? filtered : ALL_HERO_TARGETS;
  } catch { return ALL_HERO_TARGETS; }
}
export function saveHeroTargets(list: HeroTarget[]) {
  window.localStorage.setItem(KEYS.heroTargets, JSON.stringify(list));
  notify();
}

export type BuiltInIllustrationId =
  | "couple" | "sofa" | "walking" | "coffee" | "dancing"
  | "pardo-pardo" | "pardo-branca" | "negro-negro";
/** May be a built-in id OR a `custom:<id>` reference for user uploads. */
export type IllustrationId = BuiltInIllustrationId | (string & {});

export const ILLUSTRATION_OPTIONS: { id: BuiltInIllustrationId; label: string; description: string }[] = [
  { id: "couple",        label: "Clássico",      description: "Casal com agenda (padrão)" },
  { id: "sofa",          label: "Sofá",          description: "No sofá com tablet" },
  { id: "walking",       label: "Passeio",       description: "De mãos dadas" },
  { id: "coffee",        label: "Café",          description: "Conversa no café" },
  { id: "dancing",       label: "Dança",         description: "Dançando juntos" },
  { id: "pardo-pardo",   label: "Casal pardo",   description: "Tons de pele pardos" },
  { id: "pardo-branca",  label: "Pardo & branca",description: "Casal inter-racial" },
  { id: "negro-negro",   label: "Casal negro",   description: "Tons de pele negros" },
];

export type StickerId = string;

export const BUILTIN_STICKER_IDS = ["none", "cats", "coffee-mug", "heart", "planet", "star"] as const;
export const STICKER_OPTIONS: { id: StickerId; label: string; description: string }[] = [
  { id: "none", label: "Sem figurinha", description: "Mostrar apenas a ilustração" },
  { id: "cats", label: "Gatinhos", description: "Gatinhos fofos" },
  { id: "coffee-mug", label: "Caneca", description: "Caneca de café" },
  { id: "heart", label: "Coração", description: "Coração fofo" },
  { id: "planet", label: "Planeta", description: "Planeta fofo" },
  { id: "star", label: "Estrela", description: "Estrela fofa" },
];

export type CustomSticker = { id: string; label: string; dataUrl: string };
/** Custom illustration uploaded by the user (stored as DataURL in localStorage).
 *  crop: zoom (1–3) and offset x/y in % (-50..50) for fitting into circular/square frames. */
export type CustomIllustration = {
  id: string;
  label: string;
  dataUrl: string;
  crop?: { zoom: number; offsetX: number; offsetY: number };
};

export const DEFAULTS = {
  empty: "float" as AnimationStyle,
  importantTask:  "none" as AnimationStyle,
  importantEvent: "none" as AnimationStyle,
  couple: "none" as AnimationStyle,
  weekColWidth: 11,
  itemPadding: 6,
  illustration: "pardo-branca" as IllustrationId,
  sticker: "none" as StickerId,
  particlesImportantIntensity: 50,
  particlesImportantDensity:   50,
  particlesImportantBrightness:70, // 0–100 (100 = vivo, 0 = bem suave)
  particlesCoupleIntensity:    50,
  particlesCoupleDensity:      50,
  particlesCoupleBrightness:   70,
};

export const WEEK_COL_MIN = 7;
export const WEEK_COL_MAX = 20;
export const ITEM_PAD_MIN = 2;
export const ITEM_PAD_MAX = 14;
export const DAY_ZOOM_MIN = 0.5;
export const DAY_ZOOM_MAX = 1.8;
export const WEEK_ZOOM_MIN = 0.5;
export const WEEK_ZOOM_MAX = 1.6;
export const DAY_ZOOM_DEFAULT = 1;
export const WEEK_ZOOM_DEFAULT = 1;

function readNum(key: string, def: number, min: number, max: number): number {
  if (typeof window === "undefined") return def;
  const raw = window.localStorage.getItem(key);
  const n = raw ? Number(raw) : NaN;
  if (!Number.isFinite(n)) return def;
  return Math.min(max, Math.max(min, n));
}
function readAnim(key: string, def: AnimationStyle): AnimationStyle {
  if (typeof window === "undefined") return def;
  const raw = window.localStorage.getItem(key) as AnimationStyle | null;
  const valid = ANIMATION_OPTIONS.some((o) => o.value === raw);
  return valid ? (raw as AnimationStyle) : def;
}
function readIllust(): IllustrationId {
  if (typeof window === "undefined") return DEFAULTS.illustration;
  const raw = window.localStorage.getItem(KEYS.illust);
  if (!raw) return DEFAULTS.illustration;
  if (raw.startsWith("custom:")) return raw as IllustrationId;
  const valid = ILLUSTRATION_OPTIONS.some((o) => o.id === raw);
  return valid ? (raw as IllustrationId) : DEFAULTS.illustration;
}
function readSticker(): StickerId {
  if (typeof window === "undefined") return DEFAULTS.sticker;
  const raw = window.localStorage.getItem(KEYS.sticker);
  if (!raw) return DEFAULTS.sticker;
  // Aceita apenas "none" ou "custom:<id>"; built-ins legados retornam none.
  if (raw === "none" || raw.startsWith("custom:")) return raw;
  return DEFAULTS.sticker;
}

export const loadEmptyAnim = () => readAnim(KEYS.empty, DEFAULTS.empty);

const loadLegacyImportant = () => readAnim(KEYS.important, DEFAULTS.importantTask);
export const loadImportantTaskAnim  = () => {
  if (typeof window === "undefined") return DEFAULTS.importantTask;
  const raw = window.localStorage.getItem(KEYS.importantTask);
  if (raw === null) return loadLegacyImportant();
  return readAnim(KEYS.importantTask, DEFAULTS.importantTask);
};
export const loadImportantEventAnim = () => {
  if (typeof window === "undefined") return DEFAULTS.importantEvent;
  const raw = window.localStorage.getItem(KEYS.importantEvent);
  if (raw === null) return loadLegacyImportant();
  return readAnim(KEYS.importantEvent, DEFAULTS.importantEvent);
};
export const loadImportantAnim = loadImportantTaskAnim;

export const loadCoupleAnim    = () => readAnim(KEYS.couple, DEFAULTS.couple);
export const loadWeekColWidth  = () => readNum(KEYS.weekColW, DEFAULTS.weekColWidth, WEEK_COL_MIN, WEEK_COL_MAX);
export const loadItemPadding   = () => readNum(KEYS.itemPad,  DEFAULTS.itemPadding,  ITEM_PAD_MIN,  ITEM_PAD_MAX);
export const loadIllustration  = () => readIllust();
export const loadSticker       = () => readSticker();

export const loadParticlesImportantIntensity  = () => readNum(KEYS.partImpIntensity,  DEFAULTS.particlesImportantIntensity,  0, 100);
export const loadParticlesImportantDensity    = () => readNum(KEYS.partImpDensity,    DEFAULTS.particlesImportantDensity,    0, 100);
export const loadParticlesImportantBrightness = () => readNum(KEYS.partImpBrightness, DEFAULTS.particlesImportantBrightness, 0, 100);
export const loadParticlesImportantColor      = () => window.localStorage.getItem(KEYS.partImpColor) || "";
export const loadParticlesCoupleIntensity     = () => readNum(KEYS.partCplIntensity,  DEFAULTS.particlesCoupleIntensity,     0, 100);
export const loadParticlesCoupleDensity       = () => readNum(KEYS.partCplDensity,    DEFAULTS.particlesCoupleDensity,       0, 100);
export const loadParticlesCoupleBrightness    = () => readNum(KEYS.partCplBrightness, DEFAULTS.particlesCoupleBrightness,    0, 100);
export const loadParticlesCoupleColor         = () => window.localStorage.getItem(KEYS.partCplColor) || "";

/** Day/Week zoom — persisted across sessions. */
function readFloat(key: string, def: number, min: number, max: number): number {
  if (typeof window === "undefined") return def;
  const raw = window.localStorage.getItem(key);
  const n = raw ? parseFloat(raw) : NaN;
  if (!Number.isFinite(n)) return def;
  return Math.min(max, Math.max(min, n));
}
export const loadDayZoom  = () => readFloat(KEYS.dayZoom,  DAY_ZOOM_DEFAULT,  DAY_ZOOM_MIN,  DAY_ZOOM_MAX);
export const loadWeekZoom = () => readFloat(KEYS.weekZoom, WEEK_ZOOM_DEFAULT, WEEK_ZOOM_MIN, WEEK_ZOOM_MAX);
export function saveDayZoom(z: number)  { window.localStorage.setItem(KEYS.dayZoom,  String(z)); notify(); }
export function saveWeekZoom(z: number) { window.localStorage.setItem(KEYS.weekZoom, String(z)); notify(); }

export function loadCustomStickers(): CustomSticker[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEYS.customStickers);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x) => x?.id && x?.dataUrl) : [];
  } catch { return []; }
}
export function saveCustomStickers(list: CustomSticker[]) {
  window.localStorage.setItem(KEYS.customStickers, JSON.stringify(list));
  notify();
}
export function addCustomSticker(s: CustomSticker) {
  const list = loadCustomStickers();
  saveCustomStickers([...list, s]);
}
export function removeCustomSticker(id: string) {
  const list = loadCustomStickers().filter((s) => s.id !== id);
  saveCustomStickers(list);
  // se estava ativo, volta para "none"
  if (loadSticker() === `custom:${id}`) saveSticker("none");
}

/* ── Custom illustrations (uploaded by the user) ── */
export function loadCustomIllustrations(): CustomIllustration[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEYS.customIllustrations);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x) => x?.id && x?.dataUrl) : [];
  } catch { return []; }
}
export function saveCustomIllustrations(list: CustomIllustration[]) {
  window.localStorage.setItem(KEYS.customIllustrations, JSON.stringify(list));
  notify();
}
export function addCustomIllustration(i: CustomIllustration) {
  const list = loadCustomIllustrations();
  if (list.length >= MAX_CUSTOM_ILLUSTRATIONS) {
    throw new Error(`Limite de ${MAX_CUSTOM_ILLUSTRATIONS} imagens atingido. Exclua uma antes de adicionar outra.`);
  }
  saveCustomIllustrations([...list, i]);
}
export function updateCustomIllustration(id: string, patch: Partial<CustomIllustration>) {
  const list = loadCustomIllustrations().map((x) => (x.id === id ? { ...x, ...patch } : x));
  saveCustomIllustrations(list);
}
export function removeCustomIllustration(id: string) {
  const list = loadCustomIllustrations().filter((x) => x.id !== id);
  saveCustomIllustrations(list);
  if (loadIllustration() === (`custom:${id}` as IllustrationId)) {
    saveIllustration(DEFAULTS.illustration);
  }
}

/* ── Hidden built-in illustrations (user "deleted" them from the picker) ── */
export function loadHiddenBuiltIns(): BuiltInIllustrationId[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEYS.hiddenBuiltIns);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x): x is BuiltInIllustrationId =>
      ILLUSTRATION_OPTIONS.some((o) => o.id === x)
    ) : [];
  } catch { return []; }
}
export function saveHiddenBuiltIns(list: BuiltInIllustrationId[]) {
  window.localStorage.setItem(KEYS.hiddenBuiltIns, JSON.stringify(list));
  notify();
}
export function hideBuiltInIllustration(id: BuiltInIllustrationId) {
  const cur = loadHiddenBuiltIns();
  if (!cur.includes(id)) saveHiddenBuiltIns([...cur, id]);
  if (loadIllustration() === id) saveIllustration(DEFAULTS.illustration);
}
export function restoreBuiltInIllustration(id: BuiltInIllustrationId) {
  saveHiddenBuiltIns(loadHiddenBuiltIns().filter((x) => x !== id));
}

/** Convert a CustomIllustration crop into CSS object-fit/position for circular/square frames. */
export function cropStyle(crop?: CustomIllustration["crop"]): React.CSSProperties {
  if (!crop || crop.zoom <= 1) {
    return { objectFit: "contain", objectPosition: "center" };
  }
  const z = Math.max(1, Math.min(3, crop.zoom));
  const ox = Math.max(-50, Math.min(50, crop.offsetX || 0));
  const oy = Math.max(-50, Math.min(50, crop.offsetY || 0));
  return {
    objectFit: "cover",
    objectPosition: `${50 + ox}% ${50 + oy}%`,
    transform: `scale(${z})`,
    transformOrigin: `${50 + ox}% ${50 + oy}%`,
  };
}

/**
 * Resolve the hero image URL given current preferences plus the assets map.
 * Handles custom uploads (`custom:<id>`) for both stickers and illustrations.
 */
export function resolveHeroImage(opts: {
  sticker: StickerId;
  illustration: IllustrationId;
  customStickers: CustomSticker[];
  customIllustrations: CustomIllustration[];
  builtInIllustrations: Record<string, string>;
}): string {
  const { sticker, illustration, customStickers, customIllustrations, builtInIllustrations } = opts;
  // Sticker has priority (overlay style) — when not "none"
  if (sticker && sticker !== "none") {
    if (sticker.startsWith("custom:")) {
      const id = sticker.slice("custom:".length);
      const found = customStickers.find((s) => s.id === id);
      if (found) return found.dataUrl;
      // fallback se a figurinha foi removida
    } else {
      // built-ins: se existir no dicionário, retorna
      if (builtInIllustrations[sticker]) return builtInIllustrations[sticker];
    }
  }
  // Illustration — built-in ou custom
  if (typeof illustration === "string" && illustration.startsWith("custom:")) {
    const id = illustration.slice("custom:".length);
    const found = customIllustrations.find((x) => x.id === id);
    if (found) return found.dataUrl;
  }
  return builtInIllustrations[illustration] ?? builtInIllustrations["couple"];
}

/** Resolve crop style for the currently active illustration (or undefined for built-ins). */
export function activeIllustrationCropStyle(
  illustration: IllustrationId,
  customIllustrations: CustomIllustration[]
): React.CSSProperties {
  if (typeof illustration === "string" && illustration.startsWith("custom:")) {
    const id = illustration.slice("custom:".length);
    const found = customIllustrations.find((x) => x.id === id);
    return cropStyle(found?.crop);
  }
  return { objectFit: "contain", objectPosition: "center" };
}

/** Per-item overrides (anim + particle params). */
export type ItemOverride = {
  anim?: AnimationStyle;
  intensity?: number;
  density?: number;
  brightness?: number;
  color?: string;
};
export function loadItemOverrides(): Record<string, ItemOverride> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEYS.itemOverrides);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}
export function loadItemOverride(itemId: string): ItemOverride {
  return loadItemOverrides()[itemId] ?? {};
}
export function saveItemOverride(itemId: string, patch: ItemOverride) {
  const all = loadItemOverrides();
  all[itemId] = { ...(all[itemId] ?? {}), ...patch };
  window.localStorage.setItem(KEYS.itemOverrides, JSON.stringify(all));
  notify();
}
export function clearItemOverride(itemId: string) {
  const all = loadItemOverrides();
  delete all[itemId];
  window.localStorage.setItem(KEYS.itemOverrides, JSON.stringify(all));
  notify();
}

function notify() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("duo:ui-prefs-change"));
  }
}

export function saveEmptyAnim(v: AnimationStyle)          { window.localStorage.setItem(KEYS.empty, v); notify(); }
export function saveImportantTaskAnim(v: AnimationStyle)  { window.localStorage.setItem(KEYS.importantTask, v); notify(); }
export function saveImportantEventAnim(v: AnimationStyle) { window.localStorage.setItem(KEYS.importantEvent, v); notify(); }
export const saveImportantAnim = saveImportantTaskAnim;
export function saveCoupleAnim(v: AnimationStyle)         { window.localStorage.setItem(KEYS.couple, v); notify(); }
export function saveWeekColWidth(rem: number)             { window.localStorage.setItem(KEYS.weekColW, String(rem)); notify(); }
export function saveItemPadding(px: number)               { window.localStorage.setItem(KEYS.itemPad, String(px)); notify(); }
export function saveIllustration(id: IllustrationId)      { window.localStorage.setItem(KEYS.illust, id); notify(); }
export function saveSticker(id: StickerId)                { window.localStorage.setItem(KEYS.sticker, id); notify(); }

export function saveParticlesImportantIntensity(v: number)  { window.localStorage.setItem(KEYS.partImpIntensity,  String(v)); notify(); }
export function saveParticlesImportantDensity(v: number)    { window.localStorage.setItem(KEYS.partImpDensity,    String(v)); notify(); }
export function saveParticlesImportantBrightness(v: number) { window.localStorage.setItem(KEYS.partImpBrightness, String(v)); notify(); }
export function saveParticlesImportantColor(v: string)      { window.localStorage.setItem(KEYS.partImpColor, v); notify(); }
export function saveParticlesCoupleIntensity(v: number)     { window.localStorage.setItem(KEYS.partCplIntensity,  String(v)); notify(); }
export function saveParticlesCoupleDensity(v: number)       { window.localStorage.setItem(KEYS.partCplDensity,    String(v)); notify(); }
export function saveParticlesCoupleBrightness(v: number)    { window.localStorage.setItem(KEYS.partCplBrightness, String(v)); notify(); }
export function saveParticlesCoupleColor(v: string)         { window.localStorage.setItem(KEYS.partCplColor, v); notify(); }

/** Presets — aplicam-se a uma categoria (importantes ou casal). */
export type ParticlePreset = "soft" | "balanced" | "intense";
export const PARTICLE_PRESETS: Record<ParticlePreset, { label: string; intensity: number; density: number; brightness: number }> = {
  soft:     { label: "Suave",      intensity: 30, density: 30, brightness: 45 },
  balanced: { label: "Equilibrado",intensity: 55, density: 55, brightness: 70 },
  intense:  { label: "Intenso",    intensity: 90, density: 80, brightness: 95 },
};

export function applyParticlePresetImportant(p: ParticlePreset) {
  const v = PARTICLE_PRESETS[p];
  saveParticlesImportantIntensity(v.intensity);
  saveParticlesImportantDensity(v.density);
  saveParticlesImportantBrightness(v.brightness);
}
export function applyParticlePresetCouple(p: ParticlePreset) {
  const v = PARTICLE_PRESETS[p];
  saveParticlesCoupleIntensity(v.intensity);
  saveParticlesCoupleDensity(v.density);
  saveParticlesCoupleBrightness(v.brightness);
}

/** Map an animation style to a Tailwind/utility class (defined in styles.css). */
export function animClass(style: AnimationStyle): string {
  switch (style) {
    case "float":     return "anim-float";
    case "fade":      return "anim-fade";
    case "gentle":    return "anim-gentle";
    case "pulse":     return "anim-pulse-soft";
    case "shimmer":   return "anim-shimmer";
    case "wave":      return "anim-wave";
    case "particles": return "anim-particles";
    case "romantic":  return "anim-romantic";
    case "none":      return "";
  }
}

/** CSS vars to drive particle intensity + density + brightness + color (used inline). */
export function particleVars(intensity: number, density: number, brightness = 70, color?: string): React.CSSProperties {
  // intensity 0–100 → opacity 0.2–1
  const op = Math.max(0.2, Math.min(1, 0.2 + (intensity / 100) * 0.8));
  // density 0–100 → tile size 56px (sparse) → 18px (dense)
  const tile = Math.round(56 - (density / 100) * 38);
  // brightness 0–100 → saturate 0.4–1.4 + opacity multiplier 0.45–1
  const sat = (0.4 + (brightness / 100) * 1.0).toFixed(2);
  const bMult = (0.45 + (brightness / 100) * 0.55).toFixed(2);
  const res: React.CSSProperties = {
    ["--particles-opacity" as never]: String(op),
    ["--particles-tile" as never]: `${tile}px`,
    ["--particles-saturate" as never]: sat,
    ["--particles-brightness-mult" as never]: bMult,
  };
  if (color) {
    res["--p-color-1" as never] = color;
    res["--p-color-2" as never] = color;
    res["--p-color-3" as never] = color;
  }
  return res;
}

/** React hook: subscribe to UI prefs changes and re-render. */
import { useEffect, useState } from "react";
export function useUiPrefs() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const onChange = () => setTick((t) => t + 1);
    const onStorage = (e: StorageEvent) => {
      if (e.key && e.key.startsWith("duo:")) onChange();
    };
    window.addEventListener("duo:ui-prefs-change", onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("duo:ui-prefs-change", onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  return {
    empty: loadEmptyAnim(),
    important:      loadImportantTaskAnim(),
    importantTask:  loadImportantTaskAnim(),
    importantEvent: loadImportantEventAnim(),
    couple: loadCoupleAnim(),
    weekColWidth: loadWeekColWidth(),
    itemPadding: loadItemPadding(),
    illustration: loadIllustration(),
    sticker: loadSticker(),
    customStickers: loadCustomStickers(),
    customIllustrations: loadCustomIllustrations(),
    particlesImportant: {
      intensity:  loadParticlesImportantIntensity(),
      density:    loadParticlesImportantDensity(),
      brightness: loadParticlesImportantBrightness(),
      color:      loadParticlesImportantColor(),
    },
    particlesCouple: {
      intensity:  loadParticlesCoupleIntensity(),
      density:    loadParticlesCoupleDensity(),
      brightness: loadParticlesCoupleBrightness(),
      color:      loadParticlesCoupleColor(),
    },
    itemOverrides: loadItemOverrides(),
    heroScale: loadHeroScale(),
    heroTargets: loadHeroTargets(),
    hiddenBuiltIns: loadHiddenBuiltIns(),
  };
}
