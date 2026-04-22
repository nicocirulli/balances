import { CATEGORY_COLORS } from '../constants';

/**
 * Colored pill badge for a category.
 *
 * Props:
 *   category  — category name string (required)
 *   color     — hex color override (optional); comes from the DB join in Supabase
 *               mode and removes the need to look up CATEGORY_COLORS at runtime
 */
export default function CategoryPill({ category, color }) {
  const hex = color ?? CATEGORY_COLORS[category] ?? '#6b7280';

  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
      style={{ backgroundColor: `${hex}1a`, color: hex }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: hex }} />
      {category}
    </span>
  );
}
