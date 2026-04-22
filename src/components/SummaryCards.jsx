import { TrendingUp, TrendingDown, Scale, AlertTriangle } from 'lucide-react';
import { formatUSD } from '../constants';

/**
 * Props
 * ─────
 * income      number  — total income in USD
 * expense     number  — total expense in USD
 * balance     number  — net balance in USD
 * pending     number  — count of ARS transactions with no USD conversion
 */
function Card({ label, value, icon: Icon, colorSet, accent, sub }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-5 ${colorSet.bg}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-xs font-semibold uppercase tracking-widest ${colorSet.label}`}>{label}</p>
          <p className={`text-[1.65rem] font-extrabold mt-1 leading-none tabular-nums ${colorSet.value}`}>
            {formatUSD(value)}
          </p>
          {sub && <p className="text-[10px] mt-1 text-slate-400">{sub}</p>}
        </div>
        <span className={`p-2.5 rounded-xl ${colorSet.icon}`}>
          <Icon size={18} />
        </span>
      </div>
      <div className={`absolute -bottom-4 -right-4 w-20 h-20 rounded-full opacity-10 ${accent}`} />
    </div>
  );
}

export default function SummaryCards({ income = 0, expense = 0, balance = 0, pending = 0 }) {
  const pos = balance >= 0;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card label="Ingresos" value={income}
          icon={TrendingUp}
          colorSet={{ bg: 'bg-emerald-50', label: 'text-emerald-600/80', value: 'text-emerald-700', icon: 'bg-emerald-100 text-emerald-600' }}
          accent="bg-emerald-500"
          sub="USD total"
        />
        <Card label="Egresos" value={expense}
          icon={TrendingDown}
          colorSet={{ bg: 'bg-rose-50', label: 'text-rose-600/80', value: 'text-rose-700', icon: 'bg-rose-100 text-rose-600' }}
          accent="bg-rose-500"
          sub="USD total"
        />
        <Card label="Balance neto" value={balance}
          icon={Scale}
          colorSet={{
            bg:    pos ? 'bg-indigo-50'         : 'bg-orange-50',
            label: pos ? 'text-indigo-600/80'   : 'text-orange-600/80',
            value: pos ? 'text-indigo-700'      : 'text-orange-700',
            icon:  pos ? 'bg-indigo-100 text-indigo-600' : 'bg-orange-100 text-orange-600',
          }}
          accent={pos ? 'bg-indigo-500' : 'bg-orange-500'}
          sub="USD neto"
        />
      </div>

      {/* Warning when some ARS transactions have no USD conversion */}
      {pending > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
          <AlertTriangle size={13} className="flex-shrink-0 text-amber-500" />
          {pending} movimiento{pending !== 1 ? 's' : ''} en ARS sin cotización USD — no están incluidos en los totales.
        </div>
      )}
    </div>
  );
}
