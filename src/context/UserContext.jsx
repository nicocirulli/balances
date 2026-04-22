import { createContext, useContext, useState } from 'react';
import { useAuth } from './AuthContext';
import { isConfigured } from '../lib/supabase';

/**
 * When Supabase is configured (auth mode):
 *   - activeUser is derived from the logged-in session → no manual switching
 *   - isAuthMode = true  (used by Layout / TransactionForm to hide the switcher)
 *
 * When running locally (no .env.local):
 *   - activeUser is read from / written to localStorage
 *   - isAuthMode = false  (manual NICO / CLAU toggle is shown)
 */

const LS_KEY = 'mis-balances:active-user';

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const { userName } = useAuth();

  // localStorage state — only meaningful in local mode
  const [localUser, setLocalUser] = useState(
    () => localStorage.getItem(LS_KEY) ?? 'NICO'
  );

  const activeUser = isConfigured ? userName : localUser;

  function switchUser(user) {
    if (isConfigured) return; // switching is disabled in auth mode
    localStorage.setItem(LS_KEY, user);
    setLocalUser(user);
  }

  return (
    <UserContext.Provider value={{ activeUser, switchUser, isAuthMode: isConfigured }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used inside <UserProvider>');
  return ctx;
}
