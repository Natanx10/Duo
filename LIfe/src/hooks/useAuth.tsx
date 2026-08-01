import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Correct Supabase auth pattern:
    // 1. onAuthStateChange is the single source of truth for session state
    // 2. getSession() seeds the initial session so the first render isn't blank,
    //    but the listener overrides it — this avoids the race condition where
    //    an expired token is being refreshed and the old/null session briefly flashes.
    let initialized = false;

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (!initialized) {
        initialized = true;
        setLoading(false);
      }
    });

    // Seed initial session immediately so we don't wait for the listener
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!initialized) {
        // Listener hasn't fired yet — set session now and mark initialized
        setSession(s);
        initialized = true;
        setLoading(false);
      }
      // If listener already fired, it already set the correct (possibly refreshed) session
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
