import { useState, useEffect, useRef } from 'react';
import { X, TrendingUp, TrendingDown, CheckCircle } from 'lucide-react';
import TransactionForm from './TransactionForm';

const QUICK_CATEGORIES = {
  Ingreso: ['TURNOS', 'CLASES', 'OTROS'],
  Egreso:  ['INSUMOS', 'INFRAESTRUCTURA', 'OTROS'],
};

// Ingreso: siempre inicia en TURNOS (sin persistencia).
// Egreso: recuerda la última categoría usada en localStorage.
const LS_EGRESO_CAT = 'qe_last_egreso_cat';

function getInitialCategory(type) {
  if (type === 'Ingreso') return 'TURNOS';
  try { return localStorage.getItem(LS_EGRESO_CAT) ?? 'INSUMOS'; }
  catch { return 'INSUMOS'; }
}

function saveEgresoCategory(category) {
  try { localStorage.setItem(LS_EGRESO_CAT, category); }
  catch {}
}

export default function QuickEntryModal({ type = 'Ingreso', onClose, onAdded }) {
  const [showToast,   setShowToast]   = useState(false);
  const toastTimerRef = useRef(null);
  const closeTimerRef = useRef(null);
  const isIngreso     = type === 'Ingreso';

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      clearTimeout(toastTimerRef.current);
      clearTimeout(closeTimerRef.current);
    };
  }, [onClose]);

  function triggerToast() {
    setShowToast(true);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setShowToast(false), 1500);
  }

  // Guardar (cierra modal)
  function handleAdded(tx) {
    if (!isIngreso) saveEgresoCategory(tx.category);
    onAdded?.(tx);
    triggerToast();
    closeTimerRef.current = setTimeout(onClose, 350);
  }

  // Guardar y cargar otro (modal permanece abierto)
  function handleSavedAndNew(tx) {
    if (!isIngreso) saveEgresoCategory(tx.category);
    onAdded?.(tx);
    triggerToast();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[5vh]">

      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Toast — confirmación visual */}
        {showToast && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-slate-800/90 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-lg pointer-events-none whitespace-nowrap">
            <CheckCircle size={15} className="text-emerald-400" />
            Movimiento registrado
          </div>
        )}

        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 shrink-0 ${
          isIngreso ? 'bg-emerald-600' : 'bg-rose-500'
        }`}>
          <div className="flex items-center gap-2.5">
            {isIngreso
              ? <TrendingUp  size={20} className="text-white" />
              : <TrendingDown size={20} className="text-white" />
            }
            <span className="text-base font-bold text-white">
              {isIngreso ? 'Registrar cobro' : 'Registrar gasto'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/20 transition-colors"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form — scrollable */}
        <div className="overflow-y-auto bg-stone-50 flex-1">
          <div className="p-4">
            <TransactionForm
              initialType={type}
              showTitle={false}
              large
              autoFocusAmount
              initialCategory={getInitialCategory(type)}
              quickCategories={QUICK_CATEGORIES[type] ?? []}
              submitLabel={isIngreso ? 'Guardar cobro' : 'Guardar gasto'}
              onAdded={handleAdded}
              onSavedAndNew={handleSavedAndNew}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
