/**
 * Transactions API
 *
 * Mirrors a REST interface:
 *   GET  /api/transactions  → listTransactions(filters)
 *   POST /api/transactions  → createTransaction(payload)
 *   DEL  /api/transactions/:id → removeTransaction(id)
 *
 * All functions return { data, error } — never throw.
 * Validation happens here; db.js is treated as a dumb data store.
 */

import {
  safeCall, ok, fail,
  validateTransaction, validateDateRange,
  ValidationError,
} from './index';
import {
  fetchTransactions as dbFetch,
  insertTransaction  as dbInsert,
  deleteTransaction  as dbDelete,
} from '../lib/db';

// ─── GET /api/transactions ────────────────────────────────────────────────────

/**
 * List transactions with optional server-side date range and
 * optional client-side filters.
 *
 * @param {object} params
 * @param {string}  [params.dateFrom]    YYYY-MM-DD
 * @param {string}  [params.dateTo]      YYYY-MM-DD
 * @param {string}  [params.type]        'Ingreso' | 'Egreso'
 * @param {string}  [params.category]    category name
 * @param {string}  [params.user]        'NICO' | 'CLAU'
 * @param {string}  [params.search]      free-text search on concept + notes
 */
export async function listTransactions(params = {}) {
  return safeCall(async () => {
    const { dateFrom, dateTo, type, category, user, search } = params;

    // Validate date range
    const rangeErrs = validateDateRange({ dateFrom, dateTo });
    if (Object.keys(rangeErrs).length) throw new ValidationError(rangeErrs);

    // Fetch from DB (server-side date filter)
    const { data, error } = await dbFetch({ dateFrom, dateTo });
    if (error) return fail(error.message ?? 'Error al obtener movimientos.');

    // Apply client-side filters
    let rows = data ?? [];
    if (type)     rows = rows.filter((t) => t.type          === type);
    if (category) rows = rows.filter((t) => t.category      === category);
    if (user)     rows = rows.filter((t) => t.registered_by === user);
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (t) =>
          t.concept.toLowerCase().includes(q) ||
          (t.notes ?? '').toLowerCase().includes(q),
      );
    }

    const income  = rows.filter((t) => t.type === 'Ingreso').reduce((s, t) => s + Number(t.amount), 0);
    const expense = rows.filter((t) => t.type === 'Egreso' ).reduce((s, t) => s + Number(t.amount), 0);

    return ok({
      items: rows,
      meta: {
        total:   rows.length,
        income,
        expense,
        balance: income - expense,
      },
    });
  });
}

// ─── POST /api/transactions ───────────────────────────────────────────────────

/**
 * Create a new transaction after full validation.
 *
 * @param {object} payload
 * @param {string}  payload.date
 * @param {string}  payload.type          'Ingreso' | 'Egreso'
 * @param {string}  payload.category      category name
 * @param {string}  payload.concept
 * @param {number|string} payload.amount
 * @param {string}  payload.payment_method
 * @param {string}  payload.registered_by  'NICO' | 'CLAU'
 * @param {string}  [payload.notes]
 */
export async function createTransaction(payload) {
  return safeCall(async () => {
    // Field-level validation
    const errs = validateTransaction(payload);
    if (Object.keys(errs).length) throw new ValidationError(errs);

    // Sanitise
    const currency = payload.currency ?? 'USD';
    const amount = parseFloat(payload.amount);
    const exchangeRate = payload.exchange_rate !== '' && payload.exchange_rate != null
      ? parseFloat(payload.exchange_rate)
      : null;

    const clean = {
      date:           payload.date,
      type:           payload.type,
      category:       payload.category.trim(),
      concept:        payload.concept.trim(),
      amount,
      payment_method: payload.payment_method,
      registered_by:  payload.registered_by,
      notes:          (payload.notes ?? '').trim(),
      currency,
      exchange_rate:  currency === 'ARS' ? exchangeRate : null,
      amount_usd:     currency === 'USD'
        ? amount
        : (exchangeRate ? Number((amount / exchangeRate).toFixed(2)) : null),
    };

    const { data, error } = await dbInsert(clean);
    if (error) return fail(error.message ?? 'Error al guardar el movimiento.');

    return ok(data);
  });
}

// ─── DELETE /api/transactions/:id ─────────────────────────────────────────────

/**
 * Delete a transaction by id.
 *
 * @param {string} id  UUID
 */
export async function removeTransaction(id) {
  return safeCall(async () => {
    if (!id || typeof id !== 'string') return fail('ID de movimiento inválido.');

    const { error } = await dbDelete(id);
    if (error) return fail(error.message ?? 'Error al eliminar el movimiento.');

    return ok({ id });
  });
}
