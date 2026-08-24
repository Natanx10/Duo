import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { BottomNav } from "@/components/BottomNav";
import { useProfile } from "@/hooks/useData";
import { supabase } from "@/integrations/supabase/client";
import { defaultProfileColor } from "@/lib/profile-colors";
import { fetchReminders } from "@/lib/data";
import {
  getNotificationPermission,
  registerPushServiceWorker,
  rescheduleFromStorage,
  scheduleAll,
  subscribeToPushNotifications,
} from "@/lib/notifications";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { session, user, loading: loadingAuth } = useAuth();
  const navigate = useNavigate();

  const { data: profile, isLoading: loadingProfile, refetch: refetchProfile } = useProfile(user?.id);

  useEffect(() => {
    if (!loadingAuth && !session) navigate({ to: "/auth", replace: true });
  }, [session, loadingAuth, navigate]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        if (getNotificationPermission() !== "granted") return;
        await registerPushServiceWorker();
        await subscribeToPushNotifications(user.id);
        const reminders = await fetchReminders(user.id);
        if (cancelled) return;
        scheduleAll(
          reminders
            .filter((r) => r.is_active)
            .map((r) => ({
              id: r.id,
              title: r.title,
              remindTime: r.remind_time,
              daysOfWeek: r.days_of_week,
              remindAt: r.remind_at,
            }))
        );
      } catch {
        rescheduleFromStorage();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Auto-create profile if missing
  useEffect(() => {
    if (session && user && profile === null && !loadingProfile) {
      console.log("[AppLayout] Profile not found for authenticated user, attempting auto-creation...");
      const displayName = user.user_metadata?.display_name || user.email?.split("@")[0] || "Eu";
      
      supabase
        .from("profiles")
        .insert({
          id: user.id,
          display_name: displayName,
          color: defaultProfileColor(displayName, user.email),
        } as any)
        .then(({ error }) => {
          if (error) {
            console.error("[AppLayout] Failed to auto-create profile:", error.message);
          } else {
            console.log("[AppLayout] Profile successfully auto-created!");
            refetchProfile();
          }
        });
    }
  }, [session, user, profile, loadingProfile, refetchProfile]);

  const loading = loadingAuth || (session && loadingProfile);

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <main className="mx-auto max-w-2xl">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
