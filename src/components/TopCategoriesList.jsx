/**
 * Top categories ranking list for income or expense.
 *
 * Props
 * ─────
 * title string
 * rows  { category, total, pct, color }[]
 * total number
 * accent string
 */
import { formatMoney, CATEGORY_COLORS } from '../constants';

export default function TopCategoriesList({ title, rows = [], total = 0, accent = 'text-slate-800' }) {
  const topRows = rows.slice(0, 3);
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm h-full">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
          <p className="text-xs text-slate-400">Total: {formatMoney(total)}</p>
        </div>
        <span className={`text-xs font-semibold ${accent}`}>{rows.length} categorías</span>
      </div>
      {topRows.length === 0 ? (
        <p className="text-sm text-slate-400">Sin datos disponibles</p>
      ) : (
        <div className="space-y-3">
          {topRows.map((row, index) => {
            const category = row.category ?? row.name;
            return (
              <div key={category} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: row.color ?? CATEGORY_COLORS[category] ?? '#e2e8f0' }}>
                    <span className="text-xs font-semibold text-white">{index + 1}</span>
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{category}</p>
                    <p className="text-xs text-slate-400">{row.pct}% del total</p>
                  </div>
                </div>
                <p className="text-sm font-semibold text-slate-900 tabular-nums">{formatMoney(row.total)}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
