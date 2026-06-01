import { useState, useEffect, useRef } from 'react';
import { Plus, TrendingUp, TrendingDown, Loader2, AlertCircle, DollarSign, RefreshCw } from 'lucide-react';
import {
  USERS, PAYMENT_METHODS, CATEGORIES, USER_COLORS, today, formatUSD,
} from '../constants';
import { createTransaction }   from '../api/transactions';
import { fetchCategories }     from '../lib/db';
import { fetchBancoNacionVentaRate, EXCHANGE_RATE_SOURCE } from '../lib/exchange';
import { validateTransaction } from '../api/index';
import { useUser }             from '../context/UserContext';
import UserBadge               from './UserBadge';

function buildEmpty(user, initialType = 'Ingreso') {
  return {
    date:           today(),
    type:           initialType,
    currency:       'USD',
    category:       CATEGORIES[0].name,
    concept:        '',
    amount:         '',
    amount_usd:     '',
    exchange_rate:  '',
    payment_method: 'Efectivo',
    registered_by:  user,
    notes:          '',
  };
}

function FieldError({ msg }) {
  if (!msg) return null;
  return (
    <p className="flex items-center gap-1 text-[11px] text-rose-600 mt-1">
      <AlertCircle size={10} className="flex-shrink-0" /> {msg}
    </p>
  );
}

const BASE = 'w-full px-3 py-2 text-sm border rounded-xl outline-none transition-all bg-white';
function cls(err) {
  return `${BASE} ${err
    ? 'border-rose-300 focus:ring-2 focus:ring-rose-200'
    : 'border-slate-200 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400'}`;
}

export default function TransactionForm({
  onAdded,
  initialType     = 'Ingreso',
  showTitle       = true,
  quickCategories = [],
  autoFocusAmount = false,
  onSavedAndNew   = null,
  initialCategory = null,
  large           = false,
  submitLabel     = 'Agregar movimiento',
}) {
  const { activeUser, isAuthMode } = useUser();
  const [categoryList, setCategoryList] = useState([]);
  const [form,         setForm]         = useState(() => buildEmpty(activeUser, initialType));
  const [fieldErrors,  setFieldErrors]  = useState({});
  const [submitError,  setSubmitError]  = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [touched,      setTouched]      = useState({});
  const [rate,         setRate]         = useState(null);
  const [rateLoading,  setRateLoading]  = useState(false);
  const [rateError,    setRateError]    = useState(null);

  const amountRef         = useRef(null);
  const categoryPresetRef = useRef(initialCategory);

  useEffect(() => {
    fetchCategories().then(({ data }) => {
      if (data?.length) {
        setCategoryList(data);
        if (!categoryPresetRef.current) {
          setForm((prev) => ({ ...prev, category: data[0].name }));
        }
      }
    });
  }, []);

  useEffect(() => {
    if (isAuthMode && activeUser)
      setForm((prev) => ({ ...prev, registered_by: activeUser }));
  }, [activeUser, isAuthMode]);

  const categoryNames = categoryList.length > 0
    ? categoryList.map((c) => c.name)
    : CATEGORIES.map((c) => c.name);

  async function loadRate() {
    if (form.currency !== 'ARS') return;
    setRateLoading(true);
    setRateError(null);

    try {
      const fetchedRate = await fetchBancoNacionVentaRate();
      setRate(fetchedRate);
      setForm((prev) => ({
        ...prev,
        exchange_rate: fetchedRate.toFixed(2),
      }));
    } catch (err) {
      setRate(null);
      setRateError(err?.message ?? 'No se pudo obtener la cotización.');
    } finally {
      setRateLoading(false);
    }
  }

  useEffect(() => {
    if (form.currency !== 'ARS') return;
    if (!form.amount || !form.exchange_rate) {
      setForm((prev) => ({ ...prev, amount_usd: '' }));
      return;
    }

    const rate = parseFloat(form.exchange_rate);
    const amt  = parseFloat(form.amount);
    if (!isNaN(rate) && rate > 0 && !isNaN(amt)) {
      const usd = Number((amt / rate).toFixed(2));
      setForm((prev) => ({ ...prev, amount_usd: usd }));
    }
  }, [form.exchange_rate, form.amount, form.currency]);

  useEffect(() => {
    if (form.currency === 'ARS' && !form.exchange_rate) {
      loadRate();
    }
  }, [form.currency]);

  useEffect(() => {
    if (categoryPresetRef.current) {
      setForm((prev) => ({ ...prev, category: categoryPresetRef.current }));
    }
    if (autoFocusAmount) {
      setTimeout(() => amountRef.current?.focus(), 50);
    }
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'amount' && prev.currency === 'USD') {
        next.amount_usd = value;
      }
      return next;
    });
    if (fieldErrors[name]) setFieldErrors((prev) => { const n = { ...prev }; delete n[name]; return n; });
  }

  function handleCurrencyToggle(cur) {
    setRateError(null);
    setRate(null);
    setForm((prev) => ({
      ...prev,
      currency:      cur,
      amount_usd:    cur === 'USD' ? prev.amount : '',
      exchange_rate: cur === 'USD' ? '' : '',
    }));
  }

  function handleBlur(e) {
    const { name } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    const errs = validateTransaction(form);
    if (errs[name]) setFieldErrors((prev) => ({ ...prev, [name]: errs[name] }));
    else setFieldErrors((prev) => { const n = { ...prev }; delete n[name]; return n; });
  }

  async function runSubmit(keepOpen) {
    setTouched({ date: true, concept: true, amount: true, category: true });
    setSubmitError(null);
    setLoading(true);
    const { data, error } = await createTransaction(form);
    setLoading(false);
    if (error) {
      if (error.fields) { setFieldErrors(error.fields); setSubmitError('Corregí los errores.'); }
      else setSubmitError(error.message);
      return;
    }
    setFieldErrors({}); setSubmitError(null); setTouched({});
    if (keepOpen) {
      setForm((prev) => ({
        ...buildEmpty(activeUser, prev.type),
        type:           prev.type,
        currency:       prev.currency,
        payment_method: prev.payment_method,
        registered_by:  prev.registered_by,
        category:       prev.category,
        date:           prev.date,
      }));
      setTimeout(() => amountRef.current?.focus(), 0);
      onSavedAndNew?.(data);
    } else {
      onAdded?.(data);
      setForm((prev) => ({ ...buildEmpty(activeUser), date: prev.date, currency: prev.currency }));
    }
  }

  function handleSubmit(e) { e.preventDefault(); runSubmit(false); }

  const isARS = form.currency === 'ARS';
  const fe    = fieldErrors;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6">
      {showTitle && (
        <h2 className="text-sm font-bold text-slate-800 mb-5 pb-3 border-b border-slate-100 tracking-tight">
          Nuevo movimiento
        </h2>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">

        {/* ── Type toggle ── */}
        <div className="grid grid-cols-2 gap-2">
          {['Ingreso', 'Egreso'].map((t) => (
            <label key={t}
              className={`flex items-center justify-center gap-2 ${large ? 'min-h-12 py-2.5' : 'py-2.5'} border rounded-xl cursor-pointer text-sm font-semibold transition-all ${
                form.type === t
                  ? t === 'Ingreso'
                    ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm'
                    : 'bg-rose-500 border-rose-500 text-white shadow-sm'
                  : 'border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}
            >
              <input type="radio" name="type" value={t} checked={form.type === t}
                onChange={handleChange} className="hidden" />
              {t === 'Ingreso' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {t}
            </label>
          ))}
        </div>

        {/* ── Currency ── */}
        <div>
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
            Moneda
          </label>
          <div className="grid grid-cols-2 gap-2">
            {['USD', 'ARS'].map((cur) => (
              <button key={cur} type="button" onClick={() => handleCurrencyToggle(cur)}
                className={`${large ? 'min-h-12 ' : ''}py-2 rounded-xl text-sm font-bold border transition-all ${
                  form.currency === cur
                    ? cur === 'USD'
                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                      : 'bg-blue-500 border-blue-500 text-white shadow-sm'
                    : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                {cur === 'USD' ? '$ USD' : '$ ARS'}
              </button>
            ))}
          </div>
        </div>

        {/* ── Date + Medio ── */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Fecha</label>
            <input type="date" name="date" value={form.date}
              onChange={handleChange} onBlur={handleBlur} required className={cls(touched.date && fe.date)} />
            <FieldError msg={touched.date && fe.date} />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Medio de pago</label>
            <select name="payment_method" value={form.payment_method}
              onChange={handleChange} className={cls(false)}>
              {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
        </div>

        {/* ── Quick categories ── */}
        {quickCategories.length > 0 && (
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2">
              Categoría rápida
            </label>
            <div className="flex flex-wrap gap-2">
              {quickCategories.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, category: name }))}
                  className={`px-3 py-2.5 min-h-11 rounded-xl text-sm font-semibold border transition-all ${
                    form.category === name
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-700'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Category + Amount ── */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Categoría</label>
            <select name="category" value={form.category}
              onChange={handleChange} onBlur={handleBlur} required className={cls(touched.category && fe.category)}>
              {categoryNames.map((name) => <option key={name}>{name}</option>)}
            </select>
            <FieldError msg={touched.category && fe.category} />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
              Monto ({form.currency})
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm select-none">$</span>
              <input
                ref={amountRef}
                type="number"
                name="amount"
                value={form.amount}
                onChange={handleChange}
                onBlur={handleBlur}
                onFocus={(e) => { const t = e.target; setTimeout(() => { try { t.select(); } catch {} }, 0); }}
                placeholder="0"
                min="0.01"
                step="0.01"
                required
                className={`${cls(touched.amount && fe.amount)} pl-7`}
              />
            </div>
            <FieldError msg={touched.amount && fe.amount} />
          </div>
        </div>

        {/* ── ARS → USD conversion block ── */}
        {isARS && (
          <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3.5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700">
                  <DollarSign size={13} />
                  Cotización BNA Venta
                </div>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {rateLoading ? 'Cargando cotización...' : rate ? `${formatUSD(rate)} ARS` : 'No disponible'}
                </p>
                <p className="text-[10px] text-slate-500 mt-1">
                  Fuente: {EXCHANGE_RATE_SOURCE}
                </p>
              </div>
              <button type="button" onClick={loadRate}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-50 disabled:opacity-60"
                disabled={rateLoading}
              >
                <RefreshCw size={14} />
                {rateLoading ? 'Actualizando' : 'Actualizar'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-semibold text-blue-600/80 uppercase tracking-wide mb-1">
                  Tipo de cambio
                  <span className="normal-case font-normal text-blue-500 ml-1">(ARS por USD)</span>
                </label>
                <input type="text" name="exchange_rate" value={form.exchange_rate}
                  readOnly
                  className="w-full pl-4 pr-3 py-2 text-sm border border-blue-200 rounded-lg bg-slate-50 text-slate-900" />
                {rateError && (
                  <p className="text-[10px] text-rose-600 mt-1">{rateError}</p>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-blue-600/80 uppercase tracking-wide mb-1">
                  USD equivalente
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-blue-400 text-xs select-none">$</span>
                  <input type="text" value={form.amount_usd}
                    readOnly
                    className="w-full pl-7 pr-3 py-2 text-sm border border-blue-200 rounded-lg bg-slate-50 text-slate-900" />
                </div>
              </div>
            </div>

            <p className="text-[10px] text-blue-500">
              La cotización se obtiene automáticamente desde {EXCHANGE_RATE_SOURCE} y se usa para calcular el equivalente en USD.
            </p>
          </div>
        )}


        {/* ── Concepto ── */}
        <div>
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Concepto</label>
          <input type="text" name="concept" value={form.concept}
            onChange={handleChange} onBlur={handleBlur}
            placeholder="Ej. Clases grupo martes" required className={cls(touched.concept && fe.concept)} />
          <FieldError msg={touched.concept && fe.concept} />
        </div>

        {/* ── Registered by ── */}
        {isAuthMode ? (
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Registrado por</span>
            <UserBadge user={activeUser} />
          </div>
        ) : (
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Registrado por</label>
            <div className="grid grid-cols-2 gap-2">
              {USERS.map((u) => {
                const c = USER_COLORS[u];
                return (
                  <button key={u} type="button"
                    onClick={() => setForm((prev) => ({ ...prev, registered_by: u }))}
                    className={`py-2 rounded-xl text-sm font-bold border transition-all ${
                      form.registered_by === u
                        ? `${c.activeBg} ${c.activeText} border-transparent shadow-sm`
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >{u}</button>
                );
              })}
            </div>
            <FieldError msg={fe.registered_by} />
          </div>
        )}

        {/* ── Descripción ── */}
        <div>
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
            Descripción <span className="normal-case font-normal text-slate-400">(opcional)</span>
          </label>
          <textarea name="notes" value={form.notes} onChange={handleChange}
            rows={2} placeholder="Detalle adicional..."
            className={`${cls(false)} resize-none`} />
        </div>

        {submitError && (
          <div className="flex items-start gap-2 text-xs text-rose-700 bg-rose-50 border border-rose-100 px-3 py-2.5 rounded-xl">
            <AlertCircle size={12} className="flex-shrink-0 mt-0.5" /> {submitError}
          </div>
        )}

        <button type="submit" disabled={loading || (isARS && (!rate || rateError))}
          className={`w-full flex justify-center items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white ${large ? 'py-3.5' : 'py-2.5'} rounded-xl font-semibold text-sm transition-colors shadow-sm shadow-indigo-200`}
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
          {loading ? 'Guardando...' : submitLabel}
        </button>

        {onSavedAndNew && (
          <button
            type="button"
            onClick={() => runSubmit(true)}
            disabled={loading || (isARS && (!rate || rateError))}
            className={`w-full flex justify-center items-center gap-2 border-2 border-indigo-400 text-indigo-700 hover:bg-indigo-50 disabled:opacity-60 ${large ? 'py-3' : 'py-2'} rounded-xl font-semibold text-sm transition-colors`}
          >
            <RefreshCw size={15} />
            {loading ? 'Guardando...' : 'Guardar y cargar otro'}
          </button>
        )}
      </form>
    </div>
  );
}
