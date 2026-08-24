import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { effectiveProfileColor } from "@/lib/profile-colors";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Couple = Database["public"]["Tables"]["couples"]["Row"];
export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type EventRow = Database["public"]["Tables"]["events"]["Row"];
export type EventInsert = Database["public"]["Tables"]["events"]["Insert"];
export type CategoryInsert = Database["public"]["Tables"]["categories"]["Insert"];
export type Todo = Database["public"]["Tables"]["todos"]["Row"];
export type TodoInsert = Database["public"]["Tables"]["todos"]["Insert"];
export type TodoUpdate = Database["public"]["Tables"]["todos"]["Update"];
export type Routine = Database["public"]["Tables"]["routines"]["Row"];
export type RoutineInsert = Database["public"]["Tables"]["routines"]["Insert"];
export type RoutineUpdate = Database["public"]["Tables"]["routines"]["Update"];

function accessibleHabitFilter(coupleId: string | null, userId: string): string {
  if (!coupleId) return `user_id.eq.${userId}`;
  return `user_id.eq.${userId},and(is_shared.eq.true,couple_id.eq.${coupleId})`;
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) { console.error("[Supabase Error]", error.code, error.message, error.details); throw error; }
  return data ? effectiveProfileColor(data) : null;
}

export async function fetchPartnerProfile(coupleId: string, currentUserId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("couple_id", coupleId)
    .neq("id", currentUserId)
    .order("created_at", { ascending: true })
    .limit(1);
  if (error) { console.error("[Supabase Error]", error.code, error.message, error.details); throw error; }
  const profile = (data?.[0] as Profile | undefined) ?? null;
  return profile ? effectiveProfileColor(profile) : null;
}

export async function fetchCouple(coupleId: string): Promise<Couple | null> {
  const { data, error } = await supabase.from("couples").select("*").eq("id", coupleId).maybeSingle();
  if (error) { console.error("[Supabase Error]", error.code, error.message, error.details); throw error; }
  return data;
}

export async function fetchCategories(_coupleId: string | null, _userId: string): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("created_at");
  if (error) { console.error("[Supabase Error]", error.code, error.message, error.details); throw error; }
  return data ?? [];
}

export async function fetchEventsInRange(startISO: string, endISO: string, coupleId: string | null, userId: string): Promise<EventRow[]> {
  if (!coupleId) return [];
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("couple_id", coupleId)
    .gte("starts_at", startISO)
    .lte("starts_at", endISO)
    .order("starts_at");
  if (error) { console.error("[Supabase Error]", error.code, error.message, error.details); throw error; }
  return data ?? [];
}

export async function createEvent(payload: EventInsert) {
  const { data, error } = await supabase.from("events").insert(payload as any).select().single();
  if (!error) return data;

  if (error.code === "PGRST204" || /user_id/i.test(`${error.message} ${error.details}`)) {
    const { user_id, ...legacyPayload } = payload as any;
    const legacy = await supabase.from("events").insert(legacyPayload as any).select().single();
    if (legacy.error) { console.error("[createEvent] ERROR:", legacy.error.code, legacy.error.message, legacy.error.details); throw legacy.error; }
    return legacy.data;
  }

  console.error("[createEvent] ERROR:", error.code, error.message, error.details);
  throw error;
}

export async function updateEvent(id: string, payload: Partial<EventInsert>) {
  const { data, error } = await supabase.from("events").update(payload as any).eq("id", id).select().single();
  if (!error) return data;

  if (error.code === "PGRST204" || /user_id/i.test(`${error.message} ${error.details}`)) {
    const { user_id, ...legacyPayload } = payload as any;
    const legacy = await supabase.from("events").update(legacyPayload as any).eq("id", id).select().single();
    if (legacy.error) { console.error("[updateEvent] ERROR:", legacy.error.code, legacy.error.message, legacy.error.details); throw legacy.error; }
    return legacy.data;
  }

  console.error("[updateEvent] ERROR:", error.code, error.message, error.details);
  throw error;
}

export async function deleteEvent(id: string) {
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) { console.error("[Supabase Error]", error.code, error.message, error.details); throw error; }
}

export async function createCategory(payload: CategoryInsert) {
  // The real categories table only has: id, name, color, created_at
  // Strip any fields that don't exist in the database
  const safePayload = {
    name: (payload as any).name,
    color: (payload as any).color,
  } as any;
  const { data, error } = await supabase.from("categories").insert(safePayload).select().single();
  if (error) { console.error("createCategory error:", error, "payload:", safePayload); throw error; }
  return data;
}

export async function deleteCategory(id: string) {
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) { console.error("[Supabase Error]", error.code, error.message, error.details); throw error; }
}

export async function joinCoupleByCode(code: string, _userId: string): Promise<Couple> {
  // Use SECURITY DEFINER RPC to bypass RLS (a user not yet in a couple cannot
  // SELECT the couples row directly).
  const { data: coupleId, error } = await supabase.rpc("join_couple_by_code", {
    _code: code.toUpperCase(),
  });
  if (error) { console.error("[Supabase Error]", error.code, error.message, error.details); throw error; }
  if (!coupleId) throw new Error("Código inválido");
  const { data: couple, error: fetchErr } = await supabase
    .from("couples")
    .select("*")
    .eq("id", coupleId as string)
    .maybeSingle();
  if (fetchErr) throw fetchErr;
  if (!couple) throw new Error("Não foi possível carregar o casal");
  return couple;
}

export async function createCouple(userId: string, code: string): Promise<Couple> {
  const { data: couple, error } = await supabase
    .from("couples")
    .insert({ invite_code: code, created_by: userId })
    .select()
    .single();
  if (error) { console.error("[Supabase Error]", error.code, error.message, error.details); throw error; }
  const { error: upErr } = await supabase.from("profiles").update({ couple_id: couple.id }).eq("id", userId);
  if (upErr) throw upErr;
  return couple;
}

export async function leaveCouple(userId: string) {
  const { error } = await supabase.from("profiles").update({ couple_id: null }).eq("id", userId);
  if (error) { console.error("[Supabase Error]", error.code, error.message, error.details); throw error; }
}

export async function updateProfile(userId: string, payload: Partial<Profile>) {
  const { updated_at, ...safePayload } = payload as any;
  console.log("[updateProfile] Sending:", JSON.stringify(safePayload));
  const { data, error } = await supabase.from("profiles").update(safePayload).eq("id", userId).select().single();
  if (error) { console.error("[updateProfile] ERROR:", error.code, error.message, error.details); throw error; }
  return data;
}

/* ── To-dos ── */
export async function fetchTodos(coupleId: string | null, _userId: string): Promise<Todo[]> {
  if (!coupleId) return [];
  const { data, error } = await supabase
    .from("todos")
    .select("*")
    .eq("couple_id", coupleId)
    .order("is_completed")
    .order("due_at", { ascending: true, nullsFirst: false })
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) { console.error("[Supabase Error]", error.code, error.message, error.details); throw error; }
  return data ?? [];
}

export async function fetchTodosWithCalendarInRange(startISO: string, endISO: string, coupleId: string | null, _userId: string): Promise<Todo[]> {
  if (!coupleId) return [];
  const { data, error } = await supabase
    .from("todos")
    .select("*")
    .eq("couple_id", coupleId)
    .eq("show_in_calendar", true)
    .not("due_at", "is", null)
    .gte("due_at", startISO)
    .lte("due_at", endISO)
    .order("due_at");
  if (error) { console.error("[Supabase Error]", error.code, error.message, error.details); throw error; }
  return data ?? [];
}

export async function createTodo(payload: TodoInsert) {
  // The production todos table is couple-owned and does not expose these legacy fields.
  const { user_id, duration_minutes, ...rest } = payload as any;
  const safePayload = { ...rest, is_completed: false };
  console.log("[createTodo] Sending payload:", JSON.stringify(safePayload));
  const { data, error } = await supabase.from("todos").insert(safePayload).select().single();
  if (error) { console.error("[createTodo] ERROR:", error.code, error.message, error.details); throw error; }
  return data;
}

export async function updateTodo(id: string, payload: TodoUpdate) {
  const { user_id, duration_minutes, ...safePayload } = payload as any;
  const { data, error } = await supabase.from("todos").update(safePayload).eq("id", id).select().single();
  if (error) { console.error("[updateTodo] ERROR:", error.code, error.message, error.details); throw error; }
  return data;
}

export async function toggleTodoComplete(id: string, isCompleted: boolean) {
  const { error } = await supabase
    .from("todos")
    .update({ is_completed: isCompleted, completed_at: isCompleted ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) { console.error("[Supabase Error]", error.code, error.message, error.details); throw error; }
}

export async function deleteTodo(id: string) {
  const { error } = await supabase.from("todos").delete().eq("id", id);
  if (error) { console.error("[Supabase Error]", error.code, error.message, error.details); throw error; }
}

/* ── Rotinas predefinidas (recorrentes semanais) ── */
export async function fetchRoutines(coupleId: string | null, userId: string): Promise<Routine[]> {
  if (!coupleId) return [];
  const { data, error } = await supabase
    .from("routines")
    .select("*")
    .eq("couple_id", coupleId)
    .order("day_of_week")
    .order("start_time");
  if (error) { console.error("[Supabase Error]", error.code, error.message, error.details); throw error; }
  return data ?? [];
}

export async function createRoutine(payload: RoutineInsert) {
  const { data, error } = await supabase.from("routines").insert(payload as any).select().single();
  if (!error) return data;

  if (error.code === "PGRST204" || /user_id|is_shared|category_id|updated_at/i.test(`${error.message} ${error.details}`)) {
    const { user_id, category_id, is_shared, updated_at, ...legacyPayload } = payload as any;
    const legacy = await supabase.from("routines").insert(legacyPayload as any).select().single();
    if (legacy.error) { console.error("[createRoutine] ERROR:", legacy.error.code, legacy.error.message, legacy.error.details); throw legacy.error; }
    return legacy.data;
  }

  console.error("[createRoutine] ERROR:", error.code, error.message, error.details);
  throw error;
}

export async function bulkCreateRoutines(payloads: RoutineInsert[]) {
  if (payloads.length === 0) return [];
  const { data, error } = await supabase.from("routines").insert(payloads as any).select();
  if (!error) return data ?? [];

  if (error.code === "PGRST204" || /user_id|is_shared|category_id|updated_at/i.test(`${error.message} ${error.details}`)) {
    const legacyPayloads = payloads.map(p => {
      const { user_id, category_id, is_shared, updated_at, ...rest } = p as any;
      return rest;
    });
    const legacy = await supabase.from("routines").insert(legacyPayloads as any).select();
    if (legacy.error) { console.error("[bulkCreateRoutines] ERROR:", legacy.error.code, legacy.error.message, legacy.error.details); throw legacy.error; }
    return legacy.data ?? [];
  }

  console.error("[bulkCreateRoutines] ERROR:", error.code, error.message, error.details);
  throw error;
}

export async function updateRoutine(id: string, payload: RoutineUpdate) {
  const { data, error } = await supabase.from("routines").update(payload as any).eq("id", id).select().single();
  if (!error) return data;

  if (error.code === "PGRST204" || /user_id|is_shared|category_id|updated_at/i.test(`${error.message} ${error.details}`)) {
    const { user_id, category_id, is_shared, updated_at, ...legacyPayload } = payload as any;
    const legacy = await supabase.from("routines").update(legacyPayload as any).eq("id", id).select().single();
    if (legacy.error) { console.error("[updateRoutine] ERROR:", legacy.error.code, legacy.error.message, legacy.error.details); throw legacy.error; }
    return legacy.data;
  }

  console.error("[updateRoutine] ERROR:", error.code, error.message, error.details);
  throw error;
}

export async function deleteRoutine(id: string) {
  const { error } = await supabase.from("routines").delete().eq("id", id);
  if (error) { console.error("[Supabase Error]", error.code, error.message, error.details); throw error; }
}

/* ── Exceções de rotina (cancelar uma instância apenas) ── */
export type RoutineException = {
  id: string;
  routine_id: string;
  user_id: string;
  exception_date: string; // YYYY-MM-DD
  created_at: string;
};

function toDateOnly(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export async function fetchRoutineExceptions(coupleId: string | null, userId: string): Promise<RoutineException[]> {
  // Keep this query simple to avoid RLS join edge-cases across environments.
  // Exceptions are personal actions (skip only for a specific user/day).
  const { data, error } = await supabase
    .from("routine_exceptions")
    .select("*")
    .eq("user_id", userId);

  if (error) { console.error("[Supabase Error]", error.code, error.message, error.details); throw error; }
  return (data ?? []) as RoutineException[];
}

export async function createRoutineException(routineId: string, userId: string, date: Date) {
  const { error } = await (supabase as any)
    .from("routine_exceptions")
    .insert({ routine_id: routineId, user_id: userId, exception_date: toDateOnly(date) });
  if (error) { console.error("[Supabase Error]", error.code, error.message, error.details); throw error; }
}

/* ── Hábitos ── */
export type Habit = {
  id: string;
  user_id: string;
  couple_id: string | null;
  title: string;
  description: string | null;
  color: string;
  icon: string;
  days_of_week: number[];
  target_per_day: number;
  is_shared: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};
export type HabitCheckin = {
  id: string;
  habit_id: string;
  user_id: string;
  checkin_date: string; // YYYY-MM-DD
  count: number;
  note: string | null;
  created_at: string;
};

export async function fetchHabits(coupleId: string | null, userId: string): Promise<Habit[]> {
  const { data, error } = await (supabase as any)
    .from("habits")
    .select("*")
    .or(accessibleHabitFilter(coupleId, userId))
    .eq("is_active", true)
    .order("created_at");
  if (error) { console.error("[Supabase Error]", error.code, error.message, error.details); throw error; }
  return (data ?? []) as Habit[];
}

export async function createHabit(payload: Partial<Habit> & { user_id: string; title: string }) {
  // Only send fields that actually exist in the habits table
  const safePayload = {
    user_id: payload.user_id,
    title: payload.title,
    color: payload.color || '#6366f1',
    icon: payload.icon || '🎯', // Required NOT NULL field
    days_of_week: payload.days_of_week || [0,1,2,3,4,5,6],
    is_active: true,
    is_shared: payload.is_shared ?? false,
    couple_id: payload.couple_id || null,
    description: payload.description || null,
    target_per_day: payload.target_per_day || 1,
  };
  console.log("[createHabit] Sending payload:", JSON.stringify(safePayload));
  const { data, error } = await (supabase as any).from("habits").insert(safePayload).select().single();
  if (error) {
    console.error("[createHabit] FULL ERROR:", JSON.stringify(error));
    throw new Error(`Erro ao salvar hábito: ${error.code} — ${error.message}${error.hint ? ' (' + error.hint + ')' : ''}`);
  }
  console.log("[createHabit] Success:", data);
  return data as Habit;
}

export async function updateHabit(id: string, payload: Partial<Habit>) {
  const { data, error } = await (supabase as any).from("habits").update(payload).eq("id", id).select().single();
  if (error) { console.error("[Supabase Error]", error.code, error.message, error.details); throw error; }
  return data as Habit;
}

export async function deleteHabit(id: string) {
  const { error } = await (supabase as any).from("habits").delete().eq("id", id);
  if (error) { console.error("[Supabase Error]", error.code, error.message, error.details); throw error; }
}

export async function fetchHabitCheckinsInRange(startDate: Date, endDate: Date, coupleId: string | null, userId: string): Promise<HabitCheckin[]> {
  const { data, error } = await (supabase as any)
    .from("habit_checkins")
    .select("*")
    .gte("checkin_date", toDateOnly(startDate))
    .lte("checkin_date", toDateOnly(endDate));
  if (error) { console.error("[Supabase Error]", error.code, error.message, error.details); throw error; }
  return (data ?? []) as any[];
}

export async function toggleHabitCheckin(habitId: string, userId: string, date: Date, currentCount: number) {
  const dateStr = toDateOnly(date);
  if (currentCount > 0) {
    const { error } = await (supabase as any)
      .from("habit_checkins")
      .delete()
      .eq("habit_id", habitId)
      .eq("user_id", userId)
      .eq("checkin_date", dateStr);
    if (error) { console.error("[Supabase Error]", error.code, error.message, error.details); throw error; }
  } else {
    const { error } = await (supabase as any)
      .from("habit_checkins")
      .insert({ habit_id: habitId, user_id: userId, checkin_date: dateStr, count: 1 });
    if (error) { console.error("[Supabase Error]", error.code, error.message, error.details); throw error; }
  }
}

/* ── Lembretes ── */
export type Reminder = {
  id: string;
  user_id: string;
  title: string;
  remind_at: string | null;
  remind_time: string | null;
  days_of_week: number[] | null;
  habit_id: string | null;
  event_id: string | null;
  routine_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export async function fetchReminders(userId: string): Promise<Reminder[]> {
  const { data, error } = await (supabase as any)
    .from("reminders")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) { console.error("[Supabase Error]", error.code, error.message, error.details); throw error; }
  return (data ?? []) as Reminder[];
}

export async function createReminder(payload: Partial<Reminder> & { user_id: string; title: string }) {
  const { data, error } = await (supabase as any).from("reminders").insert(payload).select().single();
  if (error) { console.error("[Supabase Error]", error.code, error.message, error.details); throw error; }
  return data as Reminder;
}

export async function updateReminder(id: string, payload: Partial<Reminder>) {
  const { data, error } = await (supabase as any).from("reminders").update(payload).eq("id", id).select().single();
  if (error) { console.error("[Supabase Error]", error.code, error.message, error.details); throw error; }
  return data as Reminder;
}

export async function deleteReminder(id: string) {
  const { error } = await (supabase as any).from("reminders").delete().eq("id", id);
  if (error) { console.error("[Supabase Error]", error.code, error.message, error.details); throw error; }
}

/* ── Figurinhas (Stickers) ── */
export type Sticker = {
  id: string;
  couple_id: string;
  uploaded_by: string;
  image_url: string;
  label: string | null;
  created_at: string;
};

export async function fetchStickers(coupleId: string): Promise<Sticker[]> {
  const { data, error } = await (supabase as any)
    .from("stickers")
    .select("*")
    .eq("couple_id", coupleId)
    .order("created_at", { ascending: true });
  if (error) { console.error("[Supabase Error]", error.code, error.message, error.details); throw error; }
  return (data ?? []) as Sticker[];
}

export async function uploadSticker(
  coupleId: string,
  userId: string,
  fileDataUrl: string,
  label: string
): Promise<Sticker> {
  console.log("[Sticker] Starting upload for couple:", coupleId, "by user:", userId);
  
  // Convert DataURL to Blob
  const res = await fetch(fileDataUrl);
  const blob = await res.blob();
  console.log("[Sticker] Blob created, size:", blob.size, "type:", blob.type);
  
  const ext = blob.type.split('/')[1] || 'png';
  const fileName = `${coupleId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
  console.log("[Sticker] Target filename:", fileName);
  
  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('stickers')
    .upload(fileName, blob, { upsert: false });
    
  if (uploadError) {
    console.error("[Sticker] Storage upload error:", uploadError);
    throw uploadError;
  }
  console.log("[Sticker] Uploaded to storage successfully");
  
  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('stickers')
    .getPublicUrl(fileName);
  console.log("[Sticker] Public URL:", publicUrl);
    
  // Insert into stickers table
  const { data, error: dbError } = await (supabase as any)
    .from("stickers")
    .insert({
      couple_id: coupleId,
      uploaded_by: userId,
      image_url: publicUrl,
      label: label
    })
    .select()
    .single();
    
  if (dbError) {
    console.error("[Sticker] Database insert error:", dbError);
    throw dbError;
  }
  console.log("[Sticker] Database record created:", data.id);
  return data as Sticker;
}

export async function deleteSticker(id: string, imageUrl: string) {
  // Try to delete from storage first
  try {
    const fileName = imageUrl.split('/stickers/')[1];
    if (fileName) {
      await supabase.storage.from('stickers').remove([fileName]);
    }
  } catch (e) {
    console.error("Erro ao deletar imagem do storage", e);
  }
  
  // Delete from DB
  const { error } = await (supabase as any).from("stickers").delete().eq("id", id);
  if (error) { console.error("[Supabase Error]", error.code, error.message, error.details); throw error; }
}

/* ── Push Notifications ── */
export async function savePushSubscription(userId: string, sub: PushSubscription) {
  const p256dh = sub.getKey ? btoa(String.fromCharCode.apply(null, new Uint8Array(sub.getKey('p256dh')!) as any)) : "";
  const auth = sub.getKey ? btoa(String.fromCharCode.apply(null, new Uint8Array(sub.getKey('auth')!) as any)) : "";
  
  const payload = {
    user_id: userId,
    endpoint: sub.endpoint,
    p256dh,
    auth
  };

  // Usamos upsert ou on_conflict ignorando erros pra endpoint duplicado se não der
  const { error } = await supabase.from("push_subscriptions" as any).upsert(payload, { onConflict: "endpoint" });
  if (error) {
    console.error("Erro ao salvar push subscription:", error);
  }
}




export async function deletePushSubscription(endpoint: string) {
  const { error } = await supabase
    .from("push_subscriptions" as any)
    .delete()
    .eq("endpoint", endpoint);
  if (error) {
    console.error("Erro ao remover push subscription:", error);
  }
}
