/**
 * Donut pie chart with an inline legend.
 *
 * Props
 * ─────
 * title      string
 * total      number            — displayed in the donut centre
 * data       { name, value, color }[]
 * emptyLabel string?           — copy when data is empty
 */

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { formatMoney } from '../constants';

function DonutTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { name, value, pct } = payload[0].payload;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-slate-800 mb-0.5">{name}</p>
      <p className="text-slate-600">{formatMoney(value)}</p>
      {pct !== undefined && <p className="text-slate-400">{pct}% del total</p>}
    </div>
  );
}

export default function PieChartCard({
  title,
  total     = 0,
  data      = [],
  emptyLabel = 'Sin datos en este período',
}) {
  const totalCalc = data.reduce((s, d) => s + d.value, 0);
  const enriched  = data.map((d) => ({
    ...d,
    pct: totalCalc > 0 ? Math.round((d.value / totalCalc) * 100) : 0,
  }));

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-4">
      <h3 className="text-sm font-semibold text-slate-700">{title}</h3>

      {enriched.length === 0 ? (
        <div className="flex-1 flex items-center justify-center py-8">
          <p className="text-sm text-slate-400">{emptyLabel}</p>
        </div>
      ) : (
        <div className="flex items-center gap-5">
          {/* Donut */}
          <div className="relative flex-shrink-0 w-[130px] h-[130px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={enriched}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={60}
                  paddingAngle={enriched.length > 1 ? 3 : 0}
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
                  stroke="none"
                >
                  {enriched.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<DonutTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Centre label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="text-[10px] text-slate-400 leading-none mb-0.5">Total</p>
              <p className="text-xs font-bold text-slate-800 leading-none text-center px-1 truncate max-w-[80px]">
                {formatMoney(total || totalCalc)}
              </p>
            </div>
          </div>

          {/* Legend */}
          <div className="flex-1 space-y-2 overflow-hidden">
            {enriched.map((item) => (
              <div key={item.name} className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs text-slate-600 truncate flex-1 min-w-0">
                  {item.name}
                </span>
                <span className="text-xs font-semibold text-slate-800 flex-shrink-0 tabular-nums">
                  {item.pct}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
