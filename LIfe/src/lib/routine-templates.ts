import type { RoutineInsert } from "./data";

export interface RoutineTemplate {
  id: string;
  name: string;
  description: string;
  icon: string; // emoji
  color: string;
  /** Each entry will be expanded into one routine row */
  blocks: Array<{
    title: string;
    days: number[]; // 0=Dom ... 6=Sáb
    start: string;  // "HH:MM"
    end: string;    // "HH:MM"
  }>;
}

export const ROUTINE_TEMPLATES: RoutineTemplate[] = [
  {
    id: "comercial",
    name: "Horário comercial",
    description: "Seg–Sex, 9h às 18h",
    icon: "💼",
    color: "#3b82f6",
    blocks: [
      { title: "Trabalho", days: [1, 2, 3, 4, 5], start: "09:00", end: "18:00" },
    ],
  },
  {
    id: "comercial-almoco",
    name: "Comercial com almoço",
    description: "Seg–Sex, 9h–12h e 13h–18h",
    icon: "🍽️",
    color: "#06b6d4",
    blocks: [
      { title: "Trabalho (manhã)", days: [1, 2, 3, 4, 5], start: "09:00", end: "12:00" },
      { title: "Trabalho (tarde)", days: [1, 2, 3, 4, 5], start: "13:00", end: "18:00" },
    ],
  },
  {
    id: "plantao-12x36",
    name: "Plantão 12x36",
    description: "12h de trabalho, 36h de descanso",
    icon: "🚑",
    color: "#f43f5e",
    blocks: [
      { title: "Plantão", days: [1, 3, 5], start: "07:00", end: "19:00" },
    ],
  },
  {
    id: "turno-noturno",
    name: "Turno noturno",
    description: "Seg–Sex, 22h às 06h",
    icon: "🌙",
    color: "#6366f1",
    blocks: [
      { title: "Turno noturno", days: [1, 2, 3, 4, 5], start: "22:00", end: "23:00" },
    ],
  },
  {
    id: "meio-periodo-manha",
    name: "Meio período (manhã)",
    description: "Seg–Sex, 7h às 13h",
    icon: "🌅",
    color: "#f59e0b",
    blocks: [
      { title: "Trabalho (manhã)", days: [1, 2, 3, 4, 5], start: "07:00", end: "13:00" },
    ],
  },
  {
    id: "meio-periodo-tarde",
    name: "Meio período (tarde)",
    description: "Seg–Sex, 13h às 19h",
    icon: "🌇",
    color: "#ec4899",
    blocks: [
      { title: "Trabalho (tarde)", days: [1, 2, 3, 4, 5], start: "13:00", end: "19:00" },
    ],
  },
  {
    id: "academia",
    name: "Academia",
    description: "Seg, Qua, Sex — 6h às 7h",
    icon: "🏋️",
    color: "#10b981",
    blocks: [
      { title: "Academia", days: [1, 3, 5], start: "06:00", end: "07:00" },
    ],
  },
  {
    id: "estudos",
    name: "Estudos noturnos",
    description: "Seg–Qui, 19h30 às 22h",
    icon: "📚",
    color: "#8b5cf6",
    blocks: [
      { title: "Estudos", days: [1, 2, 3, 4], start: "19:30", end: "22:00" },
    ],
  },
];

export interface BuildOptions {
  userId: string;
  coupleId: string | null;
  isShared: boolean;
}

export function buildRoutinesFromTemplate(
  template: RoutineTemplate,
  opts: BuildOptions
): RoutineInsert[] {
  const rows: RoutineInsert[] = [];
  for (const block of template.blocks) {
    for (const day of block.days) {
      rows.push({
        user_id: opts.userId,
        couple_id: opts.isShared ? opts.coupleId : null,
        title: block.title,
        day_of_week: day,
        start_time: block.start,
        end_time: block.end,
        color: template.color,
        is_shared: opts.isShared,
      });
    }
  }
  return rows;
}
