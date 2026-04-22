import { USER_COLORS } from '../constants';

export default function UserBadge({ user, size = 'sm' }) {
  const colors = USER_COLORS[user] ?? { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' };

  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold rounded-full ${colors.bg} ${colors.text} ${
        size === 'xs' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${colors.dot}`} />
      {user}
    </span>
  );
}
