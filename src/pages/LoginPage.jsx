import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Eye, EyeOff, Activity } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Internal emails — the user never sees these.
// They just pick their name and enter a password.
const USER_EMAIL = {
  NICO: 'nico@padel-balances.local',
  CLAU: 'clau@padel-balances.local',
};

const USER_STYLE = {
  NICO: {
    idle:   'border-slate-200 text-slate-400 hover:border-indigo-300 hover:text-indigo-400',
    active: 'border-indigo-500 bg-indigo-600 text-white shadow-lg shadow-indigo-200',
  },
  CLAU: {
    idle:   'border-slate-200 text-slate-400 hover:border-pink-300 hover:text-pink-400',
    active: 'border-pink-400 bg-pink-500 text-white shadow-lg shadow-pink-200',
  },
};

export default function LoginPage() {
  const { login }    = useAuth();
  const navigate     = useNavigate();

  const [who,          setWho]          = useState('');   // 'NICO' | 'CLAU'
  const [password,     setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!who) { setError('Elegí un usuario primero.'); return; }
    setError('');
    setLoading(true);

    const { error: authError } = await login(USER_EMAIL[who], password);
    setLoading(false);

    if (authError) {
      setError(friendlyError(authError.message));
    } else {
      navigate('/', { replace: true });
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="w-full max-w-xs">

        {/* ── Brand ── */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200 mb-4">
            <Activity size={22} className="text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-indigo-600 tracking-tight">
            CANCHAS
          </h1>
          <p className="text-xs text-slate-400 mt-1">Sistema de control financiero</p>
        </div>

        {/* ── Card ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* ── Who are you? ── */}
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                ¿Quién sos?
              </p>
              <div className="grid grid-cols-2 gap-3">
                {['NICO', 'CLAU'].map((user) => {
                  const s      = USER_STYLE[user];
                  const active = who === user;
                  return (
                    <button
                      key={user}
                      type="button"
                      onClick={() => { setWho(user); setError(''); }}
                      className={`
                        py-5 rounded-2xl border-2 font-bold text-lg tracking-wide
                        transition-all duration-150
                        ${active ? s.active : s.idle}
                      `}
                    >
                      {user}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Password ── */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full px-3.5 py-2.5 pr-10 text-sm border border-slate-200 rounded-xl outline-none
                    focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-shadow bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* ── Error ── */}
            {error && (
              <div className="text-xs text-rose-700 bg-rose-50 border border-rose-100 px-3 py-2.5 rounded-xl">
                {error}
              </div>
            )}

            {/* ── Submit ── */}
            <button
              type="submit"
              disabled={loading || !who || !password}
              className="w-full flex justify-center items-center gap-2
                bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800
                disabled:opacity-50 disabled:cursor-not-allowed
                text-white font-semibold py-2.5 rounded-xl transition-colors
                shadow-sm shadow-indigo-200"
            >
              {loading
                ? <><Loader2 size={15} className="animate-spin" /> Ingresando…</>
                : who
                  ? `Entrar como ${who}`
                  : 'Ingresar'}
            </button>

          </form>
        </div>

        <p className="text-center text-[11px] text-slate-400 mt-5">
          Acceso privado · Solo para NICO y CLAU
        </p>
      </div>
    </div>
  );
}

function friendlyError(msg) {
  const m = (msg ?? '').toLowerCase();
  if (m.includes('invalid login') || m.includes('invalid credentials') || m.includes('wrong password'))
    return 'Contraseña incorrecta. Revisá y volvé a intentar.';
  if (m.includes('too many requests'))
    return 'Demasiados intentos. Esperá un momento.';
  if (m.includes('email not confirmed'))
    return 'La cuenta no está confirmada. Contactá al administrador.';
  return 'No se pudo iniciar sesión. Intentá de nuevo.';
}
