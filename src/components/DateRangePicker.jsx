/**
 * DateRangePicker — "from" and "to" date inputs with one-click presets.
 *
 * Props:
 *   dateFrom  string (YYYY-MM-DD)
 *   dateTo    string (YYYY-MM-DD)
 *   onChange  (dateFrom: string, dateTo: string) => void
 */

const fmt = (d) => d.toISOString().split('T')[0];

function monthBounds(offset = 0) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + offset;
  const first = new Date(y, m, 1);
  const last  = new Date(y, m + 1, 0);
  return { from: fmt(first), to: fmt(last) };
}

export const PRESETS = [
  {
    label: 'Este mes',
    range: () => monthBounds(0),
  },
  {
    label: 'Mes anterior',
    range: () => monthBounds(-1),
  },
  {
    label: 'Últ. 30 días',
    range: () => {
      const to   = new Date();
      const from = new Date();
      from.setDate(from.getDate() - 29);
      return { from: fmt(from), to: fmt(to) };
    },
  },
  {
    label: 'Este año',
    range: () => {
      const y = new Date().getFullYear();
      return { from: `${y}-01-01`, to: `${y}-12-31` };
    },
  },
];

export default function DateRangePicker({ dateFrom, dateTo, onChange }) {
  function applyPreset(preset) {
    const { from, to } = preset.range();
    onChange(from, to);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Preset quick buttons */}
      <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
        {PRESETS.map((p) => {
          const { from, to } = p.range();
          const active = dateFrom === from && dateTo === to;
          return (
            <button
              key={p.label}
              onClick={() => applyPreset(p)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                active
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/60'
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Manual inputs */}
      <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
        <input
          type="date"
          value={dateFrom}
          max={dateTo}
          onChange={(e) => onChange(e.target.value, dateTo)}
          className="text-sm text-slate-700 outline-none bg-transparent w-32"
        />
        <span className="text-slate-300 text-sm">→</span>
        <input
          type="date"
          value={dateTo}
          min={dateFrom}
          onChange={(e) => onChange(dateFrom, e.target.value)}
          className="text-sm text-slate-700 outline-none bg-transparent w-32"
        />
      </div>
    </div>
  );
}
