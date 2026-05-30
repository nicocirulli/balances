/**
 * Simple KPI card for dashboard metrics.
 *
 * Props
 * ─────
 * label   string
 * value   string | number
 * sub     string
 * accent  string  — tailwind accent class for icon/bg
 */
export default function MetricCard({ label, value, sub, accent = 'bg-slate-100 text-slate-700' }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
          <p className="mt-2 text-lg font-semibold text-slate-900 tabular-nums truncate">{value}</p>
          {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
        </div>
        <div className={`rounded-2xl p-2 ${accent}`} />
      </div>
    </div>
  );
}
