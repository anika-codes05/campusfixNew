import { PRIORITY_COLORS, priorityLabel } from '../constants';

export default function PriorityBadge({ priority }) {
  const colors = PRIORITY_COLORS[priority] || PRIORITY_COLORS.medium;
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide"
      style={{ backgroundColor: colors.bg, color: colors.fg }}
    >
      {priorityLabel(priority)}
    </span>
  );
}
