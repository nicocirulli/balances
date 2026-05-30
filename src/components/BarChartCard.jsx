/**
 * Reusable Bar Chart component.
 *
 * Props
 * ─────
 * title         string                    — chart title
 * data          { name, income, expense, balance }[]  or  { label, value }[]
 * type          'comparison' | 'trend'    — determines data shape and rendering
 * showLegend    boolean?                  — default true
 * height        number?                   — chart height in px, default 280
 */

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatUSD, formatMoney } from '../constants';

function CustomTooltip({ active, payload, type }) {
  if (!active || !payload?.length) return null;

  if (type === 'comparison') {
    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-2 text-xs space-y-1">
        {payload.map((entry, i) => (
          <p key={i} style={{ color: entry.color }} className="font-semibold">
            {entry.name}: {formatUSD(entry.value)}
          </p>
        ))}
      </div>
    );
  }

  // trend type
  const { name, income, expense, balance } = payload[0].payload;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-2 text-xs space-y-1">
      <p className="font-semibold text-slate-800">{name}</p>
      <p className="text-emerald-600">Ingresos: {formatUSD(income)}</p>
      <p className="text-rose-600">Egresos: {formatUSD(expense)}</p>
      <p className="text-slate-600 border-t border-slate-200 mt-1 pt-1">
        Balance: <span className={balance >= 0 ? 'text-indigo-600' : 'text-orange-600'} style={{ fontWeight: 'bold' }}>
          {balance >= 0 ? '+' : ''}{formatUSD(balance)}
        </span>
      </p>
    </div>
  );
}

export default function BarChartCard({
  title,
  data         = [],
  type         = 'comparison', // 'comparison' | 'trend'
  showLegend   = true,
  height       = 280,
}) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">{title}</h3>
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-slate-400">Sin datos en este período</p>
        </div>
      </div>
    );
  }

  const barSize = type === 'comparison' ? 60 : 40;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey={type === 'comparison' ? 'name' : 'label'}
            tick={{ fontSize: 12, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 12, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip type={type} />} />
          {showLegend && <Legend />}

          {type === 'comparison' ? (
            <>
              <Bar dataKey="income" fill="#10b981" name="Ingresos" radius={[8, 8, 0, 0]} barSize={barSize} />
              <Bar dataKey="expense" fill="#f43f5e" name="Egresos" radius={[8, 8, 0, 0]} barSize={barSize} />
            </>
          ) : (
            // trend type
            <>
              <Bar dataKey="income" fill="#10b981" name="Ingresos" radius={[8, 8, 0, 0]} barSize={barSize} />
              <Bar dataKey="expense" fill="#f43f5e" name="Egresos" radius={[8, 8, 0, 0]} barSize={barSize} />
            </>
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
