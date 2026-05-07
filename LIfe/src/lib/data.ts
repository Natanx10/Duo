import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

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

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) { fetch("/api/log-error", { method: "POST", body: JSON.stringify({ error, stack: new Error().stack }) }); throw error; }
  return data;
}

export async function fetchPartnerProfile(coupleId: string, currentUserId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("couple_id", coupleId)
    .neq("id", currentUserId)
    .maybeSingle();
  if (error) { fetch("/api/log-error", { method: "POST", body: JSON.stringify({ error, stack: new Error().stack }) }); throw error; }
  return data;
}

export async function fetchCouple(coupleId: string): Promise<Couple | null> {
  const { data, error } = await supabase.from("couples").select("*").eq("id", coupleId).maybeSingle();
  if (error) { fetch("/api/log-error", { method: "POST", body: JSON.stringify({ error, stack: new Error().stack }) }); throw error; }
  return data;
}

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase.from("categories").select("*").order("created_at");
  if (error) { fetch("/api/log-error", { method: "POST", body: JSON.stringify({ error, stack: new Error().stack }) }); throw error; }
  return data ?? [];
}

export async function fetchEventsInRange(startISO: string, endISO: string): Promise<EventRow[]> {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .gte("starts_at", startISO)
    .lte("starts_at", endISO)
    .order("starts_at");
  if (error) { fetch("/api/log-error", { method: "POST", body: JSON.stringify({ error, stack: new Error().stack }) }); throw error; }
  return data ?? [];
}

export async function createEvent(payload: EventInsert) {
  const { data, error } = await supabase.from("events").insert(payload).select().single();
  if (error) { fetch("/api/log-error", { method: "POST", body: JSON.stringify({ error, stack: new Error().stack }) }); throw error; }
  return data;
}

export async function updateEvent(id: string, payload: Partial<EventInsert>) {
  const { data, error } = await supabase.from("events").update(payload).eq("id", id).select().single();
  if (error) { fetch("/api/log-error", { method: "POST", body: JSON.stringify({ error, stack: new Error().stack }) }); throw error; }
  return data;
}

export async function deleteEvent(id: string) {
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) { fetch("/api/log-error", { method: "POST", body: JSON.stringify({ error, stack: new Error().stack }) }); throw error; }
}

export async function createCategory(payload: CategoryInsert) {
  const { data, error } = await supabase.from("categories").insert(payload).select().single();
  if (error) { fetch("/api/log-error", { method: "POST", body: JSON.stringify({ error, stack: new Error().stack }) }); throw error; }
  return data;
}

export async function deleteCategory(id: string) {
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) { fetch("/api/log-error", { method: "POST", body: JSON.stringify({ error, stack: new Error().stack }) }); throw error; }
}

export async function joinCoupleByCode(code: string, _userId: string): Promise<Couple> {
  // Use SECURITY DEFINER RPC to bypass RLS (a user not yet in a couple cannot
  // SELECT the couples row directly).
  const { data: coupleId, error } = await supabase.rpc("join_couple_by_code", {
    _code: code.toUpperCase(),
  });
  if (error) { fetch("/api/log-error", { method: "POST", body: JSON.stringify({ error, stack: new Error().stack }) }); throw error; }
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
  if (error) { fetch("/api/log-error", { method: "POST", body: JSON.stringify({ error, stack: new Error().stack }) }); throw error; }
  const { error: upErr } = await supabase.from("profiles").update({ couple_id: couple.id }).eq("id", userId);
  if (upErr) throw upErr;
  return couple;
}

export async function leaveCouple(userId: string) {
  const { error } = await supabase.from("profiles").update({ couple_id: null }).eq("id", userId);
  if (error) { fetch("/api/log-error", { method: "POST", body: JSON.stringify({ error, stack: new Error().stack }) }); throw error; }
}

export async function updateProfile(userId: string, payload: Partial<Profile>) {
  const { data, error } = await supabase.from("profiles").update(payload).eq("id", userId).select().single();
  if (error) { fetch("/api/log-error", { method: "POST", body: JSON.stringify({ error, stack: new Error().stack }) }); throw error; }
  return data;
}

/* ── To-dos ── */
export async function fetchTodos(): Promise<Todo[]> {
  const { data, error } = await supabase
    .from("todos")
    .select("*")
    .order("is_completed")
    .order("due_at", { ascending: true, nullsFirst: false })
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) { fetch("/api/log-error", { method: "POST", body: JSON.stringify({ error, stack: new Error().stack }) }); throw error; }
  return data ?? [];
}

export async function fetchTodosWithCalendarInRange(startISO: string, endISO: string): Promise<Todo[]> {
  const { data, error } = await supabase
    .from("todos")
    .select("*")
    .eq("show_in_calendar", true)
    .not("due_at", "is", null)
    .gte("due_at", startISO)
    .lte("due_at", endISO)
    .order("due_at");
  if (error) { fetch("/api/log-error", { method: "POST", body: JSON.stringify({ error, stack: new Error().stack }) }); throw error; }
  return data ?? [];
}

export async function createTodo(payload: TodoInsert) {
  const finalPayload = { ...payload, is_completed: false } as any;
  const { data, error } = await supabase.from("todos").insert(finalPayload).select().single();
  if (error) { fetch("/api/log-error", { method: "POST", body: JSON.stringify({ error, stack: new Error().stack }) }); throw error; }
  return data;
}

export async function updateTodo(id: string, payload: TodoUpdate) {
  const { data, error } = await supabase.from("todos").update(payload).eq("id", id).select().single();
  if (error) { fetch("/api/log-error", { method: "POST", body: JSON.stringify({ error, stack: new Error().stack }) }); throw error; }
  return data;
}

export async function toggleTodoComplete(id: string, isCompleted: boolean) {
  const { error } = await supabase
    .from("todos")
    .update({ is_completed: isCompleted, completed_at: isCompleted ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) { fetch("/api/log-error", { method: "POST", body: JSON.stringify({ error, stack: new Error().stack }) }); throw error; }
}

export async function deleteTodo(id: string) {
  const { error } = await supabase.from("todos").delete().eq("id", id);
  if (error) { fetch("/api/log-error", { method: "POST", body: JSON.stringify({ error, stack: new Error().stack }) }); throw error; }
}

/* ── Rotinas predefinidas (recorrentes semanais) ── */
export async function fetchRoutines(): Promise<Routine[]> {
  const { data, error } = await supabase
    .from("routines")
    .select("*")
    .order("day_of_week")
    .order("start_time");
  if (error) { fetch("/api/log-error", { method: "POST", body: JSON.stringify({ error, stack: new Error().stack }) }); throw error; }
  return data ?? [];
}

export async function createRoutine(payload: RoutineInsert) {
  const { data, error } = await supabase.from("routines").insert(payload).select().single();
  if (error) { fetch("/api/log-error", { method: "POST", body: JSON.stringify({ error, stack: new Error().stack }) }); throw error; }
  return data;
}

export async function bulkCreateRoutines(payloads: RoutineInsert[]) {
  if (payloads.length === 0) return [];
  const { data, error } = await supabase.from("routines").insert(payloads).select();
  if (error) { fetch("/api/log-error", { method: "POST", body: JSON.stringify({ error, stack: new Error().stack }) }); throw error; }
  return data ?? [];
}

export async function updateRoutine(id: string, payload: RoutineUpdate) {
  const { data, error } = await supabase.from("routines").update(payload).eq("id", id).select().single();
  if (error) { fetch("/api/log-error", { method: "POST", body: JSON.stringify({ error, stack: new Error().stack }) }); throw error; }
  return data;
}

export async function deleteRoutine(id: string) {
  const { error } = await supabase.from("routines").delete().eq("id", id);
  if (error) { fetch("/api/log-error", { method: "POST", body: JSON.stringify({ error, stack: new Error().stack }) }); throw error; }
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

export async function fetchRoutineExceptions(): Promise<RoutineException[]> {
  const { data, error } = await (supabase as any)
    .from("routine_exceptions")
    .select("*");
  if (error) { fetch("/api/log-error", { method: "POST", body: JSON.stringify({ error, stack: new Error().stack }) }); throw error; }
  return (data ?? []) as RoutineException[];
}

export async function createRoutineException(routineId: string, userId: string, date: Date) {
  const { error } = await (supabase as any)
    .from("routine_exceptions")
    .insert({ routine_id: routineId, user_id: userId, exception_date: toDateOnly(date) });
  if (error) { fetch("/api/log-error", { method: "POST", body: JSON.stringify({ error, stack: new Error().stack }) }); throw error; }
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

export async function fetchHabits(): Promise<Habit[]> {
  const { data, error } = await (supabase as any)
    .from("habits")
    .select("*")
    .eq("is_active", true)
    .order("created_at");
  if (error) { fetch("/api/log-error", { method: "POST", body: JSON.stringify({ error, stack: new Error().stack }) }); throw error; }
  return (data ?? []) as Habit[];
}

export async function createHabit(payload: Partial<Habit> & { user_id: string; title: string }) {
  const finalPayload = { ...payload, is_active: true };
  const { data, error } = await (supabase as any).from("habits").insert(finalPayload).select().single();
  if (error) { fetch("/api/log-error", { method: "POST", body: JSON.stringify({ error, stack: new Error().stack }) }); throw error; }
  return data as Habit;
}

export async function updateHabit(id: string, payload: Partial<Habit>) {
  const { data, error } = await (supabase as any).from("habits").update(payload).eq("id", id).select().single();
  if (error) { fetch("/api/log-error", { method: "POST", body: JSON.stringify({ error, stack: new Error().stack }) }); throw error; }
  return data as Habit;
}

export async function deleteHabit(id: string) {
  const { error } = await (supabase as any).from("habits").delete().eq("id", id);
  if (error) { fetch("/api/log-error", { method: "POST", body: JSON.stringify({ error, stack: new Error().stack }) }); throw error; }
}

export async function fetchHabitCheckinsInRange(startDate: Date, endDate: Date): Promise<HabitCheckin[]> {
  const { data, error } = await (supabase as any)
    .from("habit_checkins")
    .select("*")
    .gte("checkin_date", toDateOnly(startDate))
    .lte("checkin_date", toDateOnly(endDate));
  if (error) { fetch("/api/log-error", { method: "POST", body: JSON.stringify({ error, stack: new Error().stack }) }); throw error; }
  return (data ?? []) as HabitCheckin[];
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
    if (error) { fetch("/api/log-error", { method: "POST", body: JSON.stringify({ error, stack: new Error().stack }) }); throw error; }
  } else {
    const { error } = await (supabase as any)
      .from("habit_checkins")
      .insert({ habit_id: habitId, user_id: userId, checkin_date: dateStr, count: 1 });
    if (error) { fetch("/api/log-error", { method: "POST", body: JSON.stringify({ error, stack: new Error().stack }) }); throw error; }
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

export async function fetchReminders(): Promise<Reminder[]> {
  const { data, error } = await (supabase as any)
    .from("reminders")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) { fetch("/api/log-error", { method: "POST", body: JSON.stringify({ error, stack: new Error().stack }) }); throw error; }
  return (data ?? []) as Reminder[];
}

export async function createReminder(payload: Partial<Reminder> & { user_id: string; title: string }) {
  const { data, error } = await (supabase as any).from("reminders").insert(payload).select().single();
  if (error) { fetch("/api/log-error", { method: "POST", body: JSON.stringify({ error, stack: new Error().stack }) }); throw error; }
  return data as Reminder;
}

export async function updateReminder(id: string, payload: Partial<Reminder>) {
  const { data, error } = await (supabase as any).from("reminders").update(payload).eq("id", id).select().single();
  if (error) { fetch("/api/log-error", { method: "POST", body: JSON.stringify({ error, stack: new Error().stack }) }); throw error; }
  return data as Reminder;
}

export async function deleteReminder(id: string) {
  const { error } = await (supabase as any).from("reminders").delete().eq("id", id);
  if (error) { fetch("/api/log-error", { method: "POST", body: JSON.stringify({ error, stack: new Error().stack }) }); throw error; }
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
  if (error) { fetch("/api/log-error", { method: "POST", body: JSON.stringify({ error, stack: new Error().stack }) }); throw error; }
  return (data ?? []) as Sticker[];
}

export async function uploadSticker(
  coupleId: string,
  userId: string,
  fileDataUrl: string,
  label: string
): Promise<Sticker> {
  // Convert DataURL to Blob
  const res = await fetch(fileDataUrl);
  const blob = await res.blob();
  
  const ext = blob.type.split('/')[1] || 'png';
  const fileName = `${coupleId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
  
  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('stickers')
    .upload(fileName, blob, { upsert: false });
    
  if (uploadError) throw uploadError;
  
  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('stickers')
    .getPublicUrl(fileName);
    
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
    
  if (dbError) throw dbError;
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
  if (error) { fetch("/api/log-error", { method: "POST", body: JSON.stringify({ error, stack: new Error().stack }) }); throw error; }
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


