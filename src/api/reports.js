/**
 * Reports API
 *
 * Mirrors a REST interface:
 *   GET /api/reports?dateFrom=&dateTo=   → getReport(filters)
 *   GET /api/reports/trend?months=6      → getMonthlyTrend(months)
 *
 * All functions return { data, error } — never throw.
 */

import { safeCall, ok, fail, validateDateRange } from './index';
import { fetchTransactions as dbFetch } from '../lib/db';

// ─── GET /api/reports ─────────────────────────────────────────────────────────

/**
 * Generate a full financial report for a date range.
 *
 * Returns:
 * {
 *   period:    { dateFrom, dateTo }
 *   summary:   { income, expense, balance, count }
 *   byCategory: { name, type, count, total, pct, color }[]
 *   byUser:     Record<'NICO'|'CLAU', { income, expense, count }>
 *   items:      Transaction[]
 * }
 */
export async function getReport({ dateFrom, dateTo } = {}) {
  return safeCall(async () => {
    const rangeErrs = validateDateRange({ dateFrom, dateTo });
    if (Object.keys(rangeErrs).length) return fail('Rango de fechas inválido.', rangeErrs);

    const { data, error } = await dbFetch({ dateFrom, dateTo });
    if (error) return fail(error.message ?? 'Error al generar el reporte.');

    const items = data ?? [];

    // ── Summary (all values in USD)
    let income = 0, expense = 0;
    items.forEach((t) => {
      const usd = Number(t.amount_usd) || 0;
      if (t.type === 'Ingreso') income  += usd;
      else                       expense += usd;
    });
    const summary = { income, expense, balance: income - expense, count: items.length };

    // ── By category (USD)
    const catMap = {};
    const grand  = income + expense;
    items.forEach((t) => {
      const usd = Number(t.amount_usd) || 0;
      if (!catMap[t.category]) {
        catMap[t.category] = {
          name:  t.category,
          type:  t.type,
          count: 0,
          total: 0,
          color: t.category_color ?? '#6b7280',
        };
      }
      catMap[t.category].count++;
      catMap[t.category].total += usd;
    });
    const byCategory = Object.values(catMap)
      .sort((a, b) => b.total - a.total)
      .map((r) => ({ ...r, pct: grand > 0 ? Math.round((r.total / grand) * 100) : 0 }));

    // ── By user (USD)
    const byUser = { NICO: { income: 0, expense: 0, count: 0 }, CLAU: { income: 0, expense: 0, count: 0 } };
    items.forEach((t) => {
      const u = byUser[t.registered_by];
      if (!u) return;
      const usd = Number(t.amount_usd) || 0;
      u.count++;
      if (t.type === 'Ingreso') u.income  += usd;
      else                       u.expense += usd;
    });

    return ok({ period: { dateFrom, dateTo }, summary, byCategory, byUser, items });
  });
}

// ─── GET /api/reports/trend ───────────────────────────────────────────────────

/**
 * Monthly income-vs-expense trend for the last N months.
 *
 * Returns:
 * {
 *   months: { key: 'YYYY-MM', label: 'Ene', income: N, expense: N, balance: N }[]
 * }
 */
export async function getMonthlyTrend(months = 6) {
  return safeCall(async () => {
    const now     = new Date();
    const dateFrom = (() => {
      const d = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
      return d.toISOString().split('T')[0];
    })();
    const dateTo = now.toISOString().split('T')[0];

    const { data, error } = await dbFetch({ dateFrom, dateTo });
    if (error) return fail(error.message ?? 'Error al obtener tendencia.');

    // Build ordered month slots
    const slots = {};
    for (let i = 0; i < months; i++) {
      const d   = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('es-AR', { month: 'short' });
      // Capitalise first letter
      slots[key] = { key, label: label.charAt(0).toUpperCase() + label.slice(1), income: 0, expense: 0, balance: 0 };
    }

    // Aggregate (USD)
    (data ?? []).forEach((t) => {
      const key = t.date.slice(0, 7);
      if (!slots[key]) return;
      const usd = Number(t.amount_usd) || 0;
      if (t.type === 'Ingreso') slots[key].income  += usd;
      else                       slots[key].expense += usd;
    });

    // Compute balance per month
    Object.values(slots).forEach((s) => { s.balance = s.income - s.expense; });

    return ok({ months: Object.values(slots) });
  });
}
