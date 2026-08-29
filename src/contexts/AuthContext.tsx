import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  workspaceId: string | null;
  setWorkspaceId: (id: string) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  workspaceId: null,
  setWorkspaceId: () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  const loadWorkspace = async (token?: string) => {
    try {
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch("/api/workspaces", { headers });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setWorkspaceId(data[0].workspaceId || data[0].id);
        }
      }
    } catch (err) {
      console.error("[AuthContext] Workspace load error:", err);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setWorkspaceId(null);
    setLoading(false);
  };

  useEffect(() => {
    let isMounted = true;

    // 1. Clean hash tokens from address bar without page reload
    const cleanUrlHash = () => {
      if (
        typeof window !== "undefined" &&
        window.location.hash.includes("access_token")
      ) {
        window.history.replaceState(
          null,
          "",
          window.location.pathname + window.location.search,
        );
      }
    };

    // 2. Fetch initial session from Supabase
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!isMounted) return;
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        if (session) {
          cleanUrlHash();
          loadWorkspace(session.access_token);
        }
      })
      .catch((err) => {
        console.error("[AuthContext] getSession error:", err);
        if (!isMounted) return;
        setUser(null);
        setSession(null);
        setLoading(false);
      });

    // 3. Listen to all live auth transitions (SIGNED_IN, TOKEN_REFRESHED, SIGNED_OUT)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!isMounted) return;
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);

      if (newSession) {
        cleanUrlHash();
        loadWorkspace(newSession.access_token);
      } else {
        setWorkspaceId(null);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, session, loading, workspaceId, setWorkspaceId, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
