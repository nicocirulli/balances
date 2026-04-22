import { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isConfigured } from '../lib/supabase';

/**
 * Derives the display name (NICO / CLAU) from a Supabase user object.
 * Priority:
 *   1. user_metadata.username  — the "Username" field in Dashboard → Auth → Users
 *   2. user_metadata.name      — fallback if stored under "name"
 *   3. Email prefix             — nico@... → "NICO"
 */
function resolveUserName(user) {
  if (!user) return '';
  const username = user.user_metadata?.username;
  if (username) return String(username).toUpperCase().trim();
  const name = user.user_metadata?.name;
  if (name) return String(name).toUpperCase().trim();
  const prefix = user.email?.split('@')[0]?.toUpperCase().trim() ?? '';
  return prefix;
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  // Start in loading state only when Supabase is configured (getSession is async)
  const [loading, setLoading] = useState(isConfigured);

  useEffect(() => {
    if (!isConfigured) return;

    // Hydrate session from storage on mount
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setLoading(false);
    });

    // Keep session in sync across tabs and token refreshes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function login(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }

  async function logout() {
    await supabase.auth.signOut();
    setSession(null);
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        userName: resolveUserName(session?.user),
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Safe hook — returns sensible defaults when Supabase is not configured so
 * components don't need to guard against a missing provider.
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  return ctx ?? { session: null, user: null, userName: '', loading: false, login: null, logout: null };
}
