import { useState, useEffect, useMemo } from 'react';
import { Loader2, FileText, FileSpreadsheet } from 'lucide-react';

import { getReport } from '../api/reports';
import { exportCSV, exportPDF } from '../lib/export';
import { formatMoney, formatUSD, CATEGORY_COLORS } from '../constants';
import SummaryCards  from '../components/SummaryCards';
import DateRangePicker from '../components/DateRangePicker';
import PieChartCard  from '../components/PieChartCard';
import CategoryPill  from '../components/CategoryPill';
import UserBadge     from '../components/UserBadge';

// Default: current month
function defaultRange() {
  const now   = new Date();
  const year  = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return {
    dateFrom: `${year}-${month}-01`,
    dateTo:   new Date(year, now.getMonth() + 1, 0).toISOString().split('T')[0],
  };
}

function fmtDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export default function ReportePage() {
  const { dateFrom: initFrom, dateTo: initTo } = defaultRange();
  const [dateFrom, setDateFrom] = useState(initFrom);
  const [dateTo,   setDateTo]   = useState(initTo);
  const [report,   setReport]   = useState(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    if (!dateFrom || !dateTo || dateFrom > dateTo) return;
    setLoading(true);
    getReport({ dateFrom, dateTo }).then(({ data }) => {
      setReport(data);
      setLoading(false);
    });
  }, [dateFrom, dateTo]);

  const transactions     = report?.items ?? [];
  // Use amount_usd for totals (USD base)
  const summary = useMemo(() => {
    let income = 0, expense = 0;
    transactions.forEach((t) => {
      const usd = Number(t.amount_usd) || 0;
      if (t.type === 'Ingreso') income  += usd;
      else                       expense += usd;
    });
    return { income, expense, balance: income - expense, count: transactions.length };
  }, [transactions]);
  const { incomeRows, expenseRows } = useMemo(() => {
    const incomeMap  = {};
    const expenseMap = {};

    transactions.forEach((t) => {
      const usd = Number(t.amount_usd) || 0;
      const map = t.type === 'Ingreso' ? incomeMap : expenseMap;
      if (!map[t.category]) {
        map[t.category] = {
          name:  t.category,
          type:  t.type,
          count: 0,
          total: 0,
          color: t.category_color ?? CATEGORY_COLORS[t.category] ?? '#6b7280',
        };
      }
      map[t.category].count++;
      map[t.category].total += usd;
    });

    const toRows = (map, typeTotal) =>
      Object.values(map)
        .sort((a, b) => b.total - a.total)
        .map((r) => ({ ...r, pct: typeTotal > 0 ? Math.round((r.total / typeTotal) * 100) : 0 }));

    return {
      incomeRows:  toRows(incomeMap,  summary.income),
      expenseRows: toRows(expenseMap, summary.expense),
    };
  }, [transactions, summary]);

  function handleExportCSV() {
    exportCSV({ transactions, summary, dateFrom, dateTo });
  }

  function handleExportPDF() {
    exportPDF({ transactions, summary, dateFrom, dateTo });
  }

  const periodLabel = (() => {
    const a = new Date(dateFrom + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
    const b = new Date(dateTo   + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
    return dateFrom === dateTo ? a : `${a} — ${b}`;
  })();

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Reporte Financiero</h1>
            <p className="text-sm text-slate-500 mt-0.5 capitalize">{periodLabel}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExportCSV}
              disabled={loading || transactions.length === 0}
              className="flex items-center gap-1.5 text-sm font-medium bg-white border border-slate-200 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 text-slate-700 px-3 py-2 rounded-xl transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FileSpreadsheet size={15} />
              Excel
            </button>
            <button
              onClick={handleExportPDF}
              disabled={loading || transactions.length === 0}
              className="flex items-center gap-1.5 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-xl transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FileText size={15} />
              PDF
            </button>
          </div>
        </div>

        <DateRangePicker dateFrom={dateFrom} dateTo={dateTo} onChange={(f, t) => { setDateFrom(f); setDateTo(t); }} />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={28} className="animate-spin text-indigo-500" />
        </div>
      ) : transactions.length === 0 ? (
        <div className="py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <FileText size={24} className="text-slate-300" />
          </div>
          <p className="text-sm font-semibold text-slate-700">Sin datos en el período</p>
          <p className="text-xs text-slate-400 mt-1">Seleccioná otro rango de fechas para ver el reporte.</p>
        </div>
      ) : (
        <>
          {/* ── Summary cards ── */}
          <SummaryCards {...summary} />

          {/* ── Pie charts ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <PieChartCard
              title="Distribución de ingresos"
              total={summary.income}
              data={incomeRows.map((r) => ({ name: r.name, value: r.total, color: r.color ?? CATEGORY_COLORS[r.name] ?? '#6b7280' }))}
              emptyLabel="Sin ingresos en el período"
            />
            <PieChartCard
              title="Distribución de egresos"
              total={summary.expense}
              data={expenseRows.map((r) => ({ name: r.name, value: r.total, color: r.color ?? CATEGORY_COLORS[r.name] ?? '#6b7280' }))}
              emptyLabel="Sin egresos en el período"
            />
          </div>

          {/* ── Category breakdown tables ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CategoryTable title="Ingresos por categoría" rows={incomeRows} total={summary.income} accent="emerald" />
            <CategoryTable title="Egresos por categoría"  rows={expenseRows} total={summary.expense} accent="rose" />
          </div>

          {/* ── Transaction table ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-sm font-semibold text-slate-700">
                Listado de movimientos
              </h2>
              <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">
                {transactions.length} registros
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-xs font-semibold uppercase tracking-wide text-slate-400 border-b border-slate-100">
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Concepto</th>
                    <th className="px-4 py-3">Categoría</th>
                    <th className="px-4 py-3">Por</th>
                    <th className="px-4 py-3 text-right">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t) => (
                    <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 text-sm text-slate-500 whitespace-nowrap">
                        {fmtDate(t.date)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-slate-800">{t.concept}</p>
                        {t.notes && <p className="text-xs text-slate-400 mt-0.5 italic">{t.notes}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <CategoryPill category={t.category} color={t.category_color} />
                      </td>
                      <td className="px-4 py-3">
                        <UserBadge user={t.registered_by} size="xs" />
                      </td>
                      <td className={`px-4 py-3 text-right whitespace-nowrap`}>
                        <div className={`text-sm font-semibold tabular-nums ${t.type === 'Ingreso' ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {t.type === 'Egreso' ? '−' : '+'}
                          {t.currency === 'ARS' ? formatMoney(Number(t.amount)) : formatUSD(Number(t.amount))}
                        </div>
                        {t.currency === 'ARS' && t.amount_usd != null && (
                          <div className="text-[10px] text-slate-400 text-right">≈ {formatUSD(t.amount_usd)}</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                  <TotalRow label="Total Ingresos (USD)" value={summary.income}  color="text-emerald-600" />
                  <TotalRow label="Total Egresos (USD)"  value={summary.expense} color="text-rose-600" />
                  <TotalRow label="Balance Neto (USD)"   value={summary.balance} color={summary.balance >= 0 ? 'text-slate-900' : 'text-rose-600'} bold />
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function CategoryTable({ title, rows, total, accent }) {
  const accentColor = { emerald: 'text-emerald-600', rose: 'text-rose-600' }[accent] ?? 'text-slate-700';
  const barColor    = { emerald: 'bg-emerald-500',   rose: 'bg-rose-500'   }[accent] ?? 'bg-slate-400';

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
        <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
        <span className={`text-sm font-bold ${accentColor}`}>{formatUSD(total)}</span>
      </div>

      {rows.length === 0 ? (
        <p className="px-5 py-6 text-sm text-slate-400 text-center">Sin datos</p>
      ) : (
        <div className="divide-y divide-slate-50">
          {rows.map((r) => (
            <div key={r.name} className="px-5 py-3">
              <div className="flex justify-between items-center mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: r.color ?? CATEGORY_COLORS[r.name] ?? '#6b7280' }} />
                  <span className="text-sm text-slate-700">{r.name}</span>
                  <span className="text-xs text-slate-400">({r.count})</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-slate-800">{formatUSD(r.total)}</span>
                  <span className="text-xs text-slate-400 ml-1.5">{r.pct}%</span>
                </div>
              </div>
              {/* Progress bar */}
              <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${r.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TotalRow({ label, value, color, bold }) {
  return (
    <tr>
      <td colSpan={4} className={`px-4 py-2.5 text-sm ${bold ? 'font-bold' : 'font-semibold'} text-slate-600`}>
        {label}
      </td>
      <td className={`px-4 py-2.5 text-right text-sm ${bold ? 'font-bold text-base' : 'font-semibold'} ${color} tabular-nums`}>
        {formatUSD(value)}
      </td>
    </tr>
  );
}
