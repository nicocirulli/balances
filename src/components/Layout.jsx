import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, ArrowLeftRight, FileBarChart2,
  LogOut, Activity,
} from 'lucide-react';
import { isConfigured } from '../lib/supabase';
import { useAuth }  from '../context/AuthContext';
import { useUser }  from '../context/UserContext';
import { USER_COLORS } from '../constants';
import UserBadge from './UserBadge';

const NAV = [
  { to: '/',              label: 'Dashboard',    icon: LayoutDashboard, end: true },
  { to: '/transacciones', label: 'Movimientos',  icon: ArrowLeftRight,  end: false },
  { to: '/reportes',      label: 'Reportes',     icon: FileBarChart2,   end: false },
];

export default function Layout() {
  const { logout }                        = useAuth();
  const { activeUser, switchUser, isAuthMode } = useUser();

  return (
    <div className="min-h-screen bg-stone-50 text-slate-800">

      {/* ── Top bar ── */}
      <header className="bg-white/90 backdrop-blur-sm border-b border-slate-200/70 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-2">

          {/* Brand */}
          <div className="flex items-center gap-2 mr-4 flex-shrink-0">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Activity size={14} className="text-white" />
            </div>
            <span className="font-bold text-slate-900 text-sm tracking-tight hidden sm:block">
              <span className="text-indigo-600">CANCHAS</span>
            </span>
          </div>

          {/* Nav */}
          <nav className="flex items-center gap-0.5 flex-1">
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                  }`
                }
              >
                <Icon size={15} />
                <span className="hidden sm:inline">{label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2 flex-shrink-0">

            {isAuthMode ? (
              <>
                <UserBadge user={activeUser} />
                <button
                  onClick={logout}
                  title="Cerrar sesión"
                  className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-rose-500 hover:bg-rose-50 px-2 py-1.5 rounded-lg transition-colors"
                >
                  <LogOut size={14} />
                  <span className="hidden sm:inline">Salir</span>
                </button>
              </>
            ) : (
              <div className="flex items-center gap-0.5 bg-slate-100 rounded-xl p-0.5">
                {['NICO', 'CLAU'].map((user) => {
                  const c        = USER_COLORS[user];
                  const isActive = activeUser === user;
                  return (
                    <button
                      key={user}
                      onClick={() => switchUser(user)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        isActive
                          ? `${c.activeBg} ${c.activeText} shadow-sm`
                          : 'text-slate-500 hover:text-slate-700 hover:bg-white/70'
                      }`}
                    >
                      {user}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Connection dot */}
            <div
              className="flex items-center gap-1"
              title={isConfigured ? 'Conectado a Supabase' : 'Modo local'}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  isConfigured ? 'bg-emerald-500' : 'bg-amber-400'
                }`}
              />
              <span className="text-[11px] text-slate-400 hidden md:inline">
                {isConfigured ? 'Supabase' : 'Local'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Page content ── */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-7">
        <Outlet />
      </main>
    </div>
  );
}
