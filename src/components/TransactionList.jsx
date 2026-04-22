import React, { useState } from 'react';
import { Trash2, TrendingUp, TrendingDown, ChevronDown, ChevronUp, Loader2, ReceiptText, FilterX } from 'lucide-react';
import { formatMoney, formatUSD } from '../constants';
import { removeTransaction } from '../api/transactions';
import CategoryPill from './CategoryPill';
import UserBadge from './UserBadge';

/**
 * Props:
 *   transactions  Transaction[]
 *   onDeleted     (id: string) => void
 *   compact       boolean — abbreviated view (dashboard)
 *   isFiltered    boolean — true when client-side filters are active (changes empty-state copy)
 */
export default function TransactionList({ transactions, onDeleted, compact = false, isFiltered = false }) {
  const [deletingId, setDeletingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  async function handleDelete(id) {
    if (!window.confirm('¿Eliminar este movimiento?')) return;
    setDeletingId(id);
    const { error } = await removeTransaction(id);
    setDeletingId(null);
    if (!error) onDeleted?.(id);
  }

  if (transactions.length === 0) {
    return isFiltered ? (
      /* Filters applied but no matches */
      <div className="py-14 flex flex-col items-center gap-3 text-center">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-400">
          <FilterX size={24} />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-700">Sin resultados</p>
          <p className="text-xs text-slate-400 mt-1">
            Ningún movimiento coincide con los filtros aplicados.<br />
            Probá ampliar el rango de fechas o limpiar los filtros.
          </p>
        </div>
      </div>
    ) : (
      /* No transactions at all */
      <div className="py-14 flex flex-col items-center gap-3 text-center">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-300">
          <ReceiptText size={24} />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-700">Sin movimientos</p>
          <p className="text-xs text-slate-400 mt-1">
            No hay registros en el período seleccionado.<br />
            {!compact && 'Hacé clic en "+ Nuevo" para agregar el primero.'}
          </p>
        </div>
      </div>
    );
  }

  const rows = compact ? transactions.slice(0, 8) : transactions;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="text-xs font-semibold uppercase tracking-wide text-slate-400 border-b border-slate-100">
            <th className="px-4 py-3">Fecha</th>
            <th className="px-4 py-3">Concepto</th>
            {!compact && <th className="px-4 py-3">Categoría</th>}
            {!compact && <th className="px-4 py-3">Medio</th>}
            <th className="px-4 py-3">Por</th>
            <th className="px-4 py-3 text-right">Monto</th>
            {!compact && <th className="px-4 py-3 text-center">Acc.</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <React.Fragment key={t.id}>
              <tr
                className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors"
              >
                <td className="px-4 py-3 text-sm text-slate-500 whitespace-nowrap">
                  {new Date(t.date + 'T12:00:00').toLocaleDateString('es-AR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: '2-digit',
                  })}
                </td>

                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
                        t.type === 'Ingreso'
                          ? 'bg-emerald-100 text-emerald-600'
                          : 'bg-rose-100 text-rose-600'
                      }`}
                    >
                      {t.type === 'Ingreso' ? (
                        <TrendingUp size={11} />
                      ) : (
                        <TrendingDown size={11} />
                      )}
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-slate-800 leading-tight">{t.concept}</p>
                        {t.currency === 'ARS' && (
                          <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-blue-100 text-blue-600 leading-none">ARS</span>
                        )}
                      </div>
                      {compact && (
                        <p className="text-xs text-slate-400 mt-0.5">{t.category}</p>
                      )}
                    </div>
                  </div>
                </td>

                {!compact && (
                  <td className="px-4 py-3">
                    <CategoryPill category={t.category} color={t.category_color} />
                  </td>
                )}

                {!compact && (
                  <td className="px-4 py-3 text-xs text-slate-500">{t.payment_method}</td>
                )}

                <td className="px-4 py-3">
                  <UserBadge user={t.registered_by} size={compact ? 'xs' : 'sm'} />
                </td>

                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <div className={`text-sm font-semibold ${t.type === 'Ingreso' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {t.type === 'Egreso' ? '−' : '+'}
                    {t.currency === 'ARS' ? formatMoney(t.amount) : formatUSD(t.amount)}
                  </div>
                  {/* ARS → show USD equiv below */}
                  {t.currency === 'ARS' && t.amount_usd != null && (
                    <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                      ≈ {formatUSD(t.amount_usd)}
                    </div>
                  )}
                  {t.currency === 'ARS' && t.amount_usd == null && (
                    <div className="text-[10px] text-amber-500 font-medium mt-0.5">sin USD</div>
                  )}
                </td>

                {!compact && (
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {t.notes && (
                        <button
                          onClick={() =>
                            setExpandedId((prev) => (prev === t.id ? null : t.id))
                          }
                          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Ver notas"
                        >
                          {expandedId === t.id ? (
                            <ChevronUp size={15} />
                          ) : (
                            <ChevronDown size={15} />
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(t.id)}
                        disabled={deletingId === t.id}
                        className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Eliminar"
                      >
                        {deletingId === t.id ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <Trash2 size={15} />
                        )}
                      </button>
                    </div>
                  </td>
                )}
              </tr>

              {!compact && expandedId === t.id && t.notes && (
                <tr className="bg-slate-50 border-b border-slate-100">
                  <td colSpan={7} className="px-4 py-2 text-xs text-slate-500 italic">
                    {t.notes}
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
