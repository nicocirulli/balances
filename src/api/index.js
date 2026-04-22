/**
 * API core — shared error classes and validation helpers.
 *
 * Design intent
 * ─────────────
 * This layer sits between UI components and src/lib/db.js.
 * It owns all business-rule validation so components stay presentation-only.
 * The same interfaces could be exposed as real HTTP endpoints (e.g. Next.js
 * API routes or Express) with minimal changes — just swap the db calls for
 * fetch() calls and the return shapes stay identical.
 *
 * Response envelope:  { data, error }
 *   data  → the payload on success, null on failure
 *   error → null on success, { message, fields? } on failure
 */

import { formatMoney } from '../constants';

// ─── Error classes ────────────────────────────────────────────────────────────

/** Generic API error (network / DB / unknown). */
export class APIError extends Error {
  constructor(message, cause) {
    super(message);
    this.name  = 'APIError';
    this.cause = cause ?? null;
  }
}

/**
 * Validation error — carries per-field messages so the form can show
 * inline hints instead of a single generic banner.
 *
 * Usage:
 *   throw new ValidationError({ amount: 'Must be positive', concept: 'Required' })
 */
export class ValidationError extends APIError {
  constructor(fields) {
    super('Validation failed');
    this.name   = 'ValidationError';
    this.fields = fields; // Record<fieldName, errorString>
  }
}

// ─── Response helpers ─────────────────────────────────────────────────────────

export function ok(data) {
  return { data, error: null };
}

export function fail(message, fields) {
  return { data: null, error: { message, fields: fields ?? null } };
}

/** Wraps an async fn so any thrown error becomes a fail() response. */
export async function safeCall(fn) {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof ValidationError) {
      return fail(err.message, err.fields);
    }
    return fail(err?.message ?? 'Error inesperado');
  }
}

// ─── Validation helpers ───────────────────────────────────────────────────────

const MAX_AMOUNT      = 99_999_999;
const MAX_CONCEPT_LEN = 200;
const MIN_CONCEPT_LEN = 2;

const VALID_TYPES      = ['Ingreso', 'Egreso'];
const VALID_USERS      = ['NICO', 'CLAU'];
const VALID_CURRENCIES = ['USD', 'ARS'];
const DATE_RE          = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validate a transaction payload.
 * Returns a Record<field, message> — empty object means valid.
 */
export function validateTransaction(payload) {
  const errs = {};

  // concept
  const concept = payload.concept?.trim() ?? '';
  if (!concept)
    errs.concept = 'El concepto es requerido.';
  else if (concept.length < MIN_CONCEPT_LEN)
    errs.concept = `Mínimo ${MIN_CONCEPT_LEN} caracteres.`;
  else if (concept.length > MAX_CONCEPT_LEN)
    errs.concept = `Máximo ${MAX_CONCEPT_LEN} caracteres.`;

  // amount
  const amount = Number(payload.amount);
  if (!payload.amount && payload.amount !== 0)
    errs.amount = 'El monto es requerido.';
  else if (isNaN(amount))
    errs.amount = 'El monto debe ser un número.';
  else if (amount <= 0)
    errs.amount = 'El monto debe ser mayor que cero.';
  else if (amount > MAX_AMOUNT)
    errs.amount = `El monto máximo es ${formatMoney(MAX_AMOUNT)}.`;

  // date
  if (!payload.date)
    errs.date = 'La fecha es requerida.';
  else if (!DATE_RE.test(payload.date))
    errs.date = 'Formato de fecha inválido.';
  else {
    const d = new Date(payload.date + 'T12:00:00');
    if (isNaN(d.getTime()))
      errs.date = 'Fecha inválida.';
  }

  // type
  if (!VALID_TYPES.includes(payload.type))
    errs.type = 'Tipo debe ser Ingreso o Egreso.';

  // category
  if (!payload.category?.trim())
    errs.category = 'La categoría es requerida.';

  // registered_by
  if (!VALID_USERS.includes(payload.registered_by))
    errs.registered_by = `Usuario debe ser ${VALID_USERS.join(' o ')}.`;

  // currency
  const currency = payload.currency ?? 'USD';
  if (!VALID_CURRENCIES.includes(currency))
    errs.currency = 'Moneda debe ser USD o ARS.';

  // amount_usd — required for USD, optional for ARS
  if (currency === 'USD') {
    // will be set equal to amount — no extra validation needed
  } else if (payload.amount_usd !== undefined && payload.amount_usd !== '' && payload.amount_usd !== null) {
    const usd = Number(payload.amount_usd);
    if (isNaN(usd) || usd < 0)
      errs.amount_usd = 'El equivalente USD debe ser un número positivo.';
  }

  return errs;
}

/**
 * Validate date-range filter parameters.
 * Returns a Record<field, message> — empty object means valid.
 */
export function validateDateRange({ dateFrom, dateTo } = {}) {
  const errs = {};
  if (dateFrom && !DATE_RE.test(dateFrom)) errs.dateFrom = 'Fecha de inicio inválida.';
  if (dateTo   && !DATE_RE.test(dateTo))   errs.dateTo   = 'Fecha de fin inválida.';
  if (dateFrom && dateTo && dateFrom > dateTo)
    errs.dateTo = 'La fecha de fin debe ser posterior a la de inicio.';
  return errs;
}
