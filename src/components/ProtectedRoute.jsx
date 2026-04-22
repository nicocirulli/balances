import { Navigate, Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { isConfigured } from '../lib/supabase';

/**
 * Wraps protected routes. Behaviour:
 *  - Supabase NOT configured  → always allows access (local / demo mode)
 *  - Supabase IS configured:
 *      loading  → full-screen spinner (avoids flash of login page)
 *      no session → redirect to /login
 *      session  → render child routes
 */
export default function ProtectedRoute() {
  const { session, loading } = useAuth();

  if (!isConfigured) return <Outlet />;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 size={32} className="animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
