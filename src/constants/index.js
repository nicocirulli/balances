export const USERS = ['NICO', 'CLAU'];

export const USER_COLORS = {
  NICO: {
    bg:         'bg-indigo-100',
    text:       'text-indigo-700',
    border:     'border-indigo-400',
    activeBg:   'bg-indigo-600',
    activeText: 'text-white',
    dot:        'bg-indigo-500',
  },
  CLAU: {
    bg:         'bg-pink-100',
    text:       'text-pink-700',
    border:     'border-pink-400',
    activeBg:   'bg-pink-500',
    activeText: 'text-white',
    dot:        'bg-pink-500',
  },
};

export const PAYMENT_METHODS = [
  'Efectivo',
  'Transferencia',
  'MercadoPago',
  'Débito',
  'Crédito',
];

/**
 * 7 universal categories — apply to both Ingresos and Egresos.
 * The same category can be income or expense depending on context
 * (e.g., BUFFET can mean revenue from sales OR supplier costs).
 */
export const CATEGORIES = [
  { name: 'TURNOS',          color: '#6366f1' },
  { name: 'CLASES',          color: '#8b5cf6' },
  { name: 'ALQUILERES',      color: '#0ea5e9' },
  { name: 'BUFFET',          color: '#f59e0b' },
  { name: 'INSUMOS',         color: '#f97316' },
  { name: 'INFRAESTRUCTURA', color: '#ef4444' },
  { name: 'OTROS',           color: '#94a3b8' },
];

// Flat name arrays and color map kept for backward compat with existing components
export const INCOME_CATEGORIES  = CATEGORIES.map((c) => c.name);
export const EXPENSE_CATEGORIES = CATEGORIES.map((c) => c.name);
export const ALL_CATEGORIES     = CATEGORIES.map((c) => c.name);

export const CATEGORY_COLORS = Object.fromEntries(
  CATEGORIES.map((c) => [c.name, c.color]),
);

export const formatMoney = (amount) =>
  new Intl.NumberFormat('es-AR', {
    style:                 'currency',
    currency:              'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount ?? 0);

export const CURRENCIES = ['USD', 'ARS'];

/** Format as US dollars */
export const formatUSD = (amount) =>
  new Intl.NumberFormat('en-US', {
    style:                 'currency',
    currency:              'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount ?? 0);

/** Sum amount_usd across a transaction list (skips nulls). */
export const sumUSD = (txns, type) =>
  (type ? txns.filter((t) => t.type === type) : txns)
    .reduce((s, t) => s + (Number(t.amount_usd) || 0), 0);

export const today = () => new Date().toISOString().split('T')[0];

export const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
