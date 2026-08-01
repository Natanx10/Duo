import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "@/lib/data";

// --- Query Keys ---
export const QUERY_KEYS = {
  profile: (userId: string) => ["profile", userId] as const,
  partnerProfile: (coupleId: string) => ["partnerProfile", coupleId] as const,
  couple: (coupleId: string) => ["couple", coupleId] as const,
  categories: ["categories"] as const,
  categoriesFor: (coupleId: string | null | undefined, userId: string | undefined) => ["categories", coupleId || "solo", userId || "anon"] as const,
  events: ["events"] as const,
  eventsInRange: (start: string, end: string, coupleId: string | null | undefined, userId: string | undefined) => ["events", { start, end, coupleId: coupleId || "solo", userId: userId || "anon" }] as const,
  todos: ["todos"] as const,
  todosInRange: (start: string, end: string, coupleId: string | null | undefined, userId: string | undefined) => ["todos", { start, end, coupleId: coupleId || "solo", userId: userId || "anon" }] as const,
  routines: ["routines"] as const,
  routineExceptions: ["routineExceptions"] as const,
  routineExceptionsFor: (coupleId: string | null | undefined, userId: string | undefined) => ["routineExceptions", coupleId || "solo", userId || "anon"] as const,
  habits: ["habits"] as const,
  habitCheckins: ["habitCheckins"] as const,
  habitCheckinsInRange: (start: string, end: string, coupleId: string | null | undefined, userId: string | undefined) => ["habitCheckins", { start, end, coupleId: coupleId || "solo", userId: userId || "anon" }] as const,
  reminders: (userId: string) => ["reminders", userId] as const,
  stickers: (coupleId: string) => ["stickers", coupleId] as const,
  routinesFor: (coupleId: string | null | undefined, userId: string | undefined) => ["routines", coupleId || "solo", userId || "anon"] as const,
  habitsFor: (coupleId: string | null | undefined, userId: string | undefined) => ["habits", coupleId || "solo", userId || "anon"] as const,
};

// --- Profile & Couple ---
export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.profile(userId || ""),
    queryFn: () => api.fetchProfile(userId!),
    enabled: !!userId,
  });
}

export function usePartnerProfile(coupleId: string | null | undefined, currentUserId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.partnerProfile(coupleId || ""),
    queryFn: () => api.fetchPartnerProfile(coupleId!, currentUserId!),
    enabled: !!coupleId && !!currentUserId,
  });
}

export function useCouple(coupleId: string | null | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.couple(coupleId || ""),
    queryFn: () => api.fetchCouple(coupleId!),
    enabled: !!coupleId,
  });
}

// --- Categories ---
export function useCategories(coupleId: string | null | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.categoriesFor(coupleId, userId),
    queryFn: () => api.fetchCategories(coupleId ?? null, userId!),
    enabled: !!userId,
  });
}

// --- Events ---
export function useEvents(startISO: string, endISO: string, coupleId: string | null | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.eventsInRange(startISO, endISO, coupleId, userId),
    queryFn: () => api.fetchEventsInRange(startISO, endISO, coupleId ?? null, userId!),
    enabled: !!userId,
  });
}

// --- Todos ---
export function useTodos(coupleId: string | null | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: ["todos", coupleId || "solo", userId || "anon"] as const,
    queryFn: () => api.fetchTodos(coupleId ?? null, userId!),
    enabled: !!userId,
  });
}

export function useTodosInRange(startISO: string, endISO: string, coupleId: string | null | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.todosInRange(startISO, endISO, coupleId, userId),
    queryFn: () => api.fetchTodosWithCalendarInRange(startISO, endISO, coupleId ?? null, userId!),
    enabled: !!userId,
  });
}

// --- Routines ---
export function useRoutines(coupleId: string | null | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.routinesFor(coupleId, userId),
    queryFn: () => api.fetchRoutines(coupleId ?? null, userId!),
    enabled: !!userId,
  });
}

export function useRoutineExceptions(coupleId: string | null | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.routineExceptionsFor(coupleId, userId),
    queryFn: () => api.fetchRoutineExceptions(coupleId ?? null, userId!),
    enabled: !!userId,
  });
}

// --- Habits ---
export function useHabits(coupleId: string | null | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.habitsFor(coupleId, userId),
    queryFn: () => api.fetchHabits(coupleId ?? null, userId!),
    enabled: !!userId,
  });
}

export function useHabitCheckins(startDate: Date, endDate: Date, coupleId: string | null | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.habitCheckinsInRange(startDate.toISOString(), endDate.toISOString(), coupleId, userId),
    queryFn: () => api.fetchHabitCheckinsInRange(startDate, endDate, coupleId ?? null, userId!),
    enabled: !!userId,
  });
}

// --- Reminders ---
export function useReminders(userId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.reminders(userId || ""),
    queryFn: () => api.fetchReminders(userId!),
    enabled: !!userId,
  });
}

// --- Stickers ---
export function useStickers(coupleId: string | null | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.stickers(coupleId || ""),
    queryFn: () => api.fetchStickers(coupleId!),
    enabled: !!coupleId,
  });
}

// --- Common Mutation Wrapper ---
export function useApiMutation<TVariables, TData = any>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  invalidateKeys?: any[]
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      if (invalidateKeys) {
        invalidateKeys.forEach(key => queryClient.invalidateQueries({ queryKey: key }));
      }
    },
  });
}
