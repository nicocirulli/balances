/**
 * Data access layer.
 *
 * When Supabase is configured (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY):
 *   - All operations hit the real PostgreSQL database.
 *   - Transactions are fetched with a JOIN on categories so every row carries
 *     `category` (name string) and `category_color` — the same shape returned
 *     by localStorage mode so all UI components work without changes.
 *
 * When running locally (no .env.local):
 *   - Falls back to localStorage.  Categories come from hardcoded constants.
 */

import { supabase, isConfigured } from './supabase';
import { CATEGORIES, CATEGORY_COLORS } from '../constants';

// ─── localStorage helpers ─────────────────────────────────────────────────────

const LS_KEY = 'mis-balances:transactions';
function lsGetAll() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]'); }
  catch { return []; }
}
function lsSave(rows) { localStorage.setItem(LS_KEY, JSON.stringify(rows)); }

// ─── Categories cache ─────────────────────────────────────────────────────────

let _categoriesCache = null;

export async function fetchCategories() {
  if (!isConfigured) {
    const data = CATEGORIES.map(({ name, color }) => ({ id: name, name, color }));
    return { data, error: null };
  }
  if (_categoriesCache) return { data: _categoriesCache, error: null };

  const { data, error } = await supabase
    .from('categories')
    .select('id, name, color')
    .order('name');

  if (!error && data) _categoriesCache = data;
  return { data: data ?? [], error };
}

// ─── Normalise joined rows ────────────────────────────────────────────────────

function normalize(row) {
  if (!row) return row;
  const { cat, ...rest } = row;
  return {
    ...rest,
    category:       cat?.name  ?? rest.category ?? '',
    category_color: cat?.color ?? CATEGORY_COLORS[rest.category] ?? '#6b7280',
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch transactions filtered by an optional date range.
 *
 * @param {object} opts
 * @param {string} [opts.dateFrom]  ISO date string (YYYY-MM-DD), inclusive
 * @param {string} [opts.dateTo]    ISO date string (YYYY-MM-DD), inclusive
 *
 * Returns { data: Transaction[], error }
 */
export async function fetchTransactions({ dateFrom, dateTo } = {}) {
  if (isConfigured) {
    let query = supabase
      .from('transactions')
      .select('*, cat:categories!category_id(id, name, color)')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (dateFrom) query = query.gte('date', dateFrom);
    if (dateTo)   query = query.lte('date', dateTo);

    const { data, error } = await query;
    return { data: (data ?? []).map(normalize), error };
  }

  let rows = lsGetAll();
  if (dateFrom) rows = rows.filter((r) => r.date >= dateFrom);
  if (dateTo)   rows = rows.filter((r) => r.date <= dateTo);
  rows.sort((a, b) => (a.date < b.date ? 1 : -1));

  return {
    data: rows.map((r) => ({
      ...r,
      category_color: r.category_color ?? CATEGORY_COLORS[r.category] ?? '#6b7280',
    })),
    error: null,
  };
}

/**
 * Insert a new transaction.
 * Accepts `category` as a name string; resolves to `category_id` automatically.
 * Also attaches `user_id` from the current Supabase Auth session when available.
 */
export async function insertTransaction(tx) {
  if (isConfigured) {
    const { data: cats } = await fetchCategories();
    const cat = cats.find((c) => c.name === tx.category);
    if (!cat) return { data: null, error: { message: `Categoría no encontrada: "${tx.category}"` } };

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id ?? null;

    const currency   = tx.currency   ?? 'USD';
    const amount_usd = currency === 'USD'
      ? tx.amount                                   // USD → amount_usd = amount
      : (tx.amount_usd != null && tx.amount_usd !== '' ? Number(tx.amount_usd) : null);

    const payload = {
      date: tx.date, type: tx.type, concept: tx.concept,
      category_id: cat.id, amount: tx.amount,
      payment_method: tx.payment_method, registered_by: tx.registered_by,
      user_id: userId, notes: tx.notes ?? '',
      currency,
      amount_usd,
    };

    const { data, error } = await supabase
      .from('transactions')
      .insert(payload)
      .select('*, cat:categories!category_id(id, name, color)')
      .single();

    return { data: normalize(data), error };
  }

  const currency   = tx.currency ?? 'USD';
  const amount_usd = currency === 'USD' ? tx.amount
    : (tx.amount_usd != null && tx.amount_usd !== '' ? Number(tx.amount_usd) : null);

  const newRow = {
    ...tx, id: crypto.randomUUID(), created_at: new Date().toISOString(),
    category_color: CATEGORY_COLORS[tx.category] ?? '#6b7280',
    currency,
    amount_usd,
  };
  lsSave([newRow, ...lsGetAll()]);
  return { data: newRow, error: null };
}

/** Delete a transaction by id. Returns { error } */
export async function deleteTransaction(id) {
  if (isConfigured) {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    return { error };
  }
  lsSave(lsGetAll().filter((r) => r.id !== id));
  return { error: null };
}
