import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function MonthPicker({ value, onChange }) {
  const [year, mon] = value.split('-').map(Number);

  function shift(delta) {
    const d = new Date(year, mon - 1 + delta);
    const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    onChange(next);
  }

  const label = new Date(year, mon - 1).toLocaleDateString('es-AR', {
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-1 py-1 shadow-sm">
      <button
        onClick={() => shift(-1)}
        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
        title="Mes anterior"
      >
        <ChevronLeft size={16} />
      </button>
      <span className="text-sm font-medium text-slate-700 px-2 capitalize min-w-[110px] text-center">
        {label}
      </span>
      <button
        onClick={() => shift(1)}
        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
        title="Mes siguiente"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
