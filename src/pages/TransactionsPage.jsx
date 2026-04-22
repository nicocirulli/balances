import { useState, useEffect, useMemo } from 'react';
import { Loader2, SlidersHorizontal, X } from 'lucide-react';

import { listTransactions } from '../api/transactions';
import { fetchCategories }  from '../lib/db';
import { exportCSV } from '../lib/export';
import {
  formatUSD,
  ALL_CATEGORIES,
  USERS,
  USER_COLORS,
  sumUSD,
} from '../constants';
import SummaryCards from '../components/SummaryCards';
import TransactionForm from '../components/TransactionForm';
import TransactionList from '../components/TransactionList';
import DateRangePicker from '../components/DateRangePicker';
import UserBadge from '../components/UserBadge';

// Default to current month
function defaultRange() {
  const now   = new Date();
  const year  = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const first = `${year}-${month}-01`;
  const last  = new Date(year, now.getMonth() + 1, 0).toISOString().split('T')[0];
  return { dateFrom: first, dateTo: last };
}

export default function TransactionsPage() {
  const { dateFrom: initFrom, dateTo: initTo } = defaultRange();
  const [dateFrom, setDateFrom] = useState(initFrom);
  const [dateTo,   setDateTo]   = useState(initTo);

  const [transactions, setTransactions] = useState([]);
  const [categories,   setCategories]   = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [showForm,     setShowForm]     = useState(false);

  // Client-side filters (applied on top of the server-side date range)
  const [filterType,     setFilterType]     = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterUser,     setFilterUser]     = useState('');
  const [filterText,     setFilterText]     = useState('');

  // Load categories once for the filter dropdown
  useEffect(() => {
    fetchCategories().then(({ data }) => setCategories(data ?? []));
  }, []);

  // Re-fetch whenever the date range changes
  useEffect(() => {
    if (!dateFrom || !dateTo || dateFrom > dateTo) return;
    setLoading(true);
    listTransactions({ dateFrom, dateTo }).then(({ data }) => {
      setTransactions(data?.items ?? []);
      setLoading(false);
    });
  }, [dateFrom, dateTo]);

  function handleRangeChange(from, to) {
    setDateFrom(from);
    setDateTo(to);
  }

  function handleAdded(newTx) {
    setTransactions((prev) => [newTx, ...prev]);
    setShowForm(false);
  }

  function handleDeleted(id) {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  }

  // Client-side filtering
  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (filterType     && t.type          !== filterType)     return false;
      if (filterCategory && t.category      !== filterCategory) return false;
      if (filterUser     && t.registered_by !== filterUser)     return false;
      if (filterText) {
        const q = filterText.toLowerCase();
        if (!t.concept.toLowerCase().includes(q) && !t.notes?.toLowerCase().includes(q))
          return false;
      }
      return true;
    });
  }, [transactions, filterType, filterCategory, filterUser, filterText]);

  const summary = useMemo(() => {
    const income  = sumUSD(filtered, 'Ingreso');
    const expense = sumUSD(filtered, 'Egreso');
    const pending = filtered.filter((t) => t.currency === 'ARS' && t.amount_usd == null).length;
    return { income, expense, balance: income - expense, pending };
  }, [filtered]);

  const hasFilters = filterType || filterCategory || filterUser || filterText;

  function clearFilters() {
    setFilterType('');
    setFilterCategory('');
    setFilterUser('');
    setFilterText('');
  }

  function handleExportCSV() {
    exportCSV({
      transactions: filtered,
      summary,
      dateFrom,
      dateTo,
      filename: `Padel_Movimientos_${dateFrom}_${dateTo}.csv`,
    });
  }

  const periodLabel = (() => {
    const a = new Date(dateFrom + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
    const b = new Date(dateTo   + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
    return dateFrom === dateTo ? a : `${a} — ${b}`;
  })();

  return (
    <div className="space-y-5">
      {/* ── Page header ── */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Movimientos</h1>
            <p className="text-sm text-slate-500 mt-0.5 capitalize">{periodLabel}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 text-sm font-medium bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-xl transition-colors shadow-sm"
            >
              ↓ Excel
            </button>
            <button
              onClick={() => setShowForm((v) => !v)}
              className="flex items-center gap-1.5 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-xl transition-colors shadow-sm"
            >
              {showForm ? <X size={15} /> : '+ Nuevo'}
            </button>
          </div>
        </div>

        {/* ── Date range picker ── */}
        <DateRangePicker dateFrom={dateFrom} dateTo={dateTo} onChange={handleRangeChange} />
      </div>

      {/* ── New transaction form ── */}
      {showForm && (
        <div className="max-w-md">
          <TransactionForm onAdded={handleAdded} />
        </div>
      )}

      {/* ── Summary cards in USD ── */}
      <SummaryCards {...summary} />

      {/* ── Filter bar ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <SlidersHorizontal size={15} className="text-slate-400 flex-shrink-0" />

          <input
            type="text"
            placeholder="Buscar concepto..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-indigo-400 w-40"
          />

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
          >
            <option value="">Todos los tipos</option>
            <option value="Ingreso">Ingreso</option>
            <option value="Egreso">Egreso</option>
          </select>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
          >
            <option value="">Todas las categorías</option>
            {(categories.length > 0
              ? categories
              : ALL_CATEGORIES.map((n) => ({ id: n, name: n }))
            ).map((c) => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>

          {/* User filter */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
            <button
              onClick={() => setFilterUser('')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                filterUser === '' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Todos
            </button>
            {USERS.map((u) => {
              const c = USER_COLORS[u];
              const isActive = filterUser === u;
              return (
                <button
                  key={u}
                  onClick={() => setFilterUser(isActive ? '' : u)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                    isActive
                      ? `${c.activeBg} ${c.activeText} shadow-sm`
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {u}
                </button>
              );
            })}
          </div>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs text-rose-500 hover:text-rose-700 font-medium px-2 py-1.5 rounded-lg hover:bg-rose-50 transition-colors"
            >
              <X size={12} /> Limpiar
            </button>
          )}

          <span className="ml-auto text-xs text-slate-400">
            {filtered.length}{hasFilters && ` de ${transactions.length}`} registros
          </span>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-sm font-semibold text-slate-700">Historial</h2>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="text-emerald-600 font-medium tabular-nums">+{formatUSD(summary.income)}</span>
            <span className="text-rose-500 font-medium tabular-nums">−{formatUSD(summary.expense)}</span>
            <span className={`font-bold tabular-nums ${summary.balance >= 0 ? 'text-slate-800' : 'text-rose-600'}`}>
              = {formatUSD(summary.balance)}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={24} className="animate-spin text-indigo-400" />
          </div>
        ) : (
          <TransactionList transactions={filtered} onDeleted={handleDeleted} isFiltered={!!hasFilters} />
        )}
      </div>
    </div>
  );
}
