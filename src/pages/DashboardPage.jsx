import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { ArrowRight, Loader2, TrendingUp, TrendingDown } from 'lucide-react';

import { listTransactions } from '../api/transactions';
import { getMonthlyTrend }  from '../api/reports';
import { currentMonth, formatUSD, formatMoney, sumUSD, CATEGORY_COLORS, USER_COLORS } from '../constants';
import SummaryCards      from '../components/SummaryCards';
import TransactionList   from '../components/TransactionList';
import MonthPicker       from '../components/MonthPicker';
import PieChartCard      from '../components/PieChartCard';
import QuickEntryModal   from '../components/QuickEntryModal';

function TrendTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-2 text-xs min-w-[150px]">
      <p className="font-semibold text-slate-700 mb-1.5">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }} className="flex justify-between gap-3">
          <span>{p.name}</span>
          <span className="font-semibold tabular-nums">{formatUSD(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

// Per-user breakdown card (income / expense / balance in USD)
function UserBreakdown({ user, txns }) {
  const c       = USER_COLORS[user];
  const income  = sumUSD(txns.filter((t) => t.type === 'Ingreso'));
  const expense = sumUSD(txns.filter((t) => t.type === 'Egreso'));
  const balance = income - expense;
  const count   = txns.length;

  return (
    <div className={`rounded-2xl p-4 border ${c.bg} ${c.border} border-opacity-30`}>
      <div className="flex justify-between items-center mb-3">
        <span className={`text-sm font-bold ${c.text}`}>{user}</span>
        <span className="text-xs text-slate-400">{count} movs.</span>
      </div>
      <div className="space-y-1.5">
        <Row label="Ingresos" value={formatUSD(income)}  color="text-emerald-600" />
        <Row label="Egresos"  value={formatUSD(expense)} color="text-rose-500" />
        <div className="border-t border-slate-200/60 pt-1.5 mt-1">
          <Row label="Balance" value={formatUSD(balance)}
            color={balance >= 0 ? 'text-indigo-700 font-bold' : 'text-orange-600 font-bold'} bold />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, color, bold }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-slate-500">{label}</span>
      <span className={`tabular-nums ${color} ${bold ? 'font-bold' : 'font-semibold'}`}>{value}</span>
    </div>
  );
}

export default function DashboardPage() {
  const [month,        setMonth]        = useState(currentMonth());
  const [transactions, setTransactions] = useState([]);
  const [trend,        setTrend]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [trendLoading, setTrendLoading] = useState(true);
  const [showModal,    setShowModal]    = useState(false);
  const [modalType,    setModalType]    = useState('Ingreso');

  useEffect(() => {
    setLoading(true);
    const [y, m] = month.split('-').map(Number);
    const dateFrom = `${y}-${String(m).padStart(2, '0')}-01`;
    const lastDay  = new Date(y, m, 0).getDate();
    const dateTo   = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    listTransactions({ dateFrom, dateTo }).then(({ data }) => {
      setTransactions(data?.items ?? []);
      setLoading(false);
    });
  }, [month]);

  useEffect(() => {
    setTrendLoading(true);
    getMonthlyTrend(6).then(({ data }) => {
      setTrend(data?.months ?? []);
      setTrendLoading(false);
    });
  }, []);

  const income  = useMemo(() => sumUSD(transactions, 'Ingreso'), [transactions]);
  const expense = useMemo(() => sumUSD(transactions, 'Egreso'),  [transactions]);
  const balance = income - expense;
  const pending = useMemo(
    () => transactions.filter((t) => t.currency === 'ARS' && t.amount_usd == null).length,
    [transactions]
  );

  const incomePie = useMemo(() => {
    const map = {};
    transactions.filter((t) => t.type === 'Ingreso').forEach((t) => {
      if (!map[t.category]) map[t.category] = { name: t.category, value: 0, color: t.category_color ?? CATEGORY_COLORS[t.category] };
      map[t.category].value += Number(t.amount_usd) || 0;
    });
    return Object.values(map).filter((d) => d.value > 0).sort((a, b) => b.value - a.value);
  }, [transactions]);

  const expensePie = useMemo(() => {
    const map = {};
    transactions.filter((t) => t.type === 'Egreso').forEach((t) => {
      if (!map[t.category]) map[t.category] = { name: t.category, value: 0, color: t.category_color ?? CATEGORY_COLORS[t.category] };
      map[t.category].value += Number(t.amount_usd) || 0;
    });
    return Object.values(map).filter((d) => d.value > 0).sort((a, b) => b.value - a.value);
  }, [transactions]);

  const [year, mon] = month.split('-').map(Number);
  const monthLabel  = new Date(year, mon - 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });

  function handleDelete(id) {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  }

  function openQuick(type) {
    setModalType(type);
    setShowModal(true);
  }

  function handleQuickAdded(newTx) {
    setTransactions((prev) => [newTx, ...prev]);
    setShowModal(false);
  }

  return (
    <div className="space-y-5">

      {/* ── Acceso rápido ── */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => openQuick('Ingreso')}
          className="flex items-center justify-center gap-3 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white rounded-2xl px-4 py-5 min-h-18 transition-colors shadow-sm select-none"
        >
          <TrendingUp size={22} />
          <span className="text-base font-bold">Registrar cobro</span>
        </button>
        <button
          onClick={() => openQuick('Egreso')}
          className="flex items-center justify-center gap-3 bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white rounded-2xl px-4 py-5 min-h-18 transition-colors shadow-sm select-none"
        >
          <TrendingDown size={22} />
          <span className="text-base font-bold">Registrar gasto</span>
        </button>
      </div>

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 capitalize">{monthLabel}</h1>
          <p className="text-sm text-slate-400 mt-0.5">Totales en USD · Resumen financiero</p>
        </div>
        <MonthPicker value={month} onChange={setMonth} />
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 size={26} className="animate-spin text-indigo-400" />
        </div>
      ) : (
        <>
          {/* ── Summary (USD) ── */}
          <SummaryCards income={income} expense={expense} balance={balance} pending={pending} />

          {/* ── Per-user breakdown (side by side) ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <UserBreakdown user="NICO" txns={transactions.filter((t) => t.registered_by === 'NICO')} />
            <UserBreakdown user="CLAU" txns={transactions.filter((t) => t.registered_by === 'CLAU')} />

            {/* Combined */}
            <div className="rounded-2xl p-4 border border-slate-200 bg-slate-50">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-bold text-slate-700">TOTAL</span>
                <span className="text-xs text-slate-400">{transactions.length} movs.</span>
              </div>
              <div className="space-y-1.5">
                <Row label="Ingresos" value={formatUSD(income)}  color="text-emerald-600" />
                <Row label="Egresos"  value={formatUSD(expense)} color="text-rose-500" />
                <div className="border-t border-slate-200 pt-1.5 mt-1">
                  <Row label="Balance" value={formatUSD(balance)}
                    color={balance >= 0 ? 'text-indigo-700 font-bold' : 'text-orange-600 font-bold'} bold />
                </div>
              </div>
            </div>
          </div>

          {/* ── Pie charts ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <PieChartCard title="Ingresos por categoría (USD)" total={income} data={incomePie} emptyLabel="Sin ingresos este mes" />
            <PieChartCard title="Egresos por categoría (USD)"  total={expense} data={expensePie} emptyLabel="Sin egresos este mes" />
          </div>

          {/* ── Monthly trend ── */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Tendencia — últimos 6 meses (USD)</h3>
            {trendLoading ? (
              <div className="flex justify-center py-10"><Loader2 size={18} className="animate-spin text-indigo-300" /></div>
            ) : trend.every((m) => m.income === 0 && m.expense === 0) ? (
              <p className="text-sm text-slate-400 text-center py-8">Sin datos suficientes</p>
            ) : (
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={trend} margin={{ top: 0, right: 4, left: 0, bottom: 0 }} barGap={3}>
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => `$${v}`} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={52} />
                  <Tooltip content={<TrendTooltip />} cursor={{ fill: '#f8fafc', radius: 6 }} />
                  <Legend formatter={(v) => <span className="text-xs text-slate-600">{v}</span>} iconType="circle" iconSize={7} />
                  <Bar dataKey="income"  name="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="expense" name="Egresos"  fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* ── Recent ── */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-sm font-semibold text-slate-700">Últimos movimientos</h3>
              <Link to="/transacciones" className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1 font-semibold">
                Ver todos <ArrowRight size={13} />
              </Link>
            </div>
            <TransactionList transactions={transactions} onDeleted={handleDelete} compact />
          </div>
        </>
      )}

      {showModal && (
        <QuickEntryModal
          type={modalType}
          onClose={() => setShowModal(false)}
          onAdded={handleQuickAdded}
        />
      )}
    </div>
  );
}
