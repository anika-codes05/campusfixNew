import { STATUS_COLORS, statusLabel } from '../constants';

export default function StatusBadge({ status }) {
  const colors = STATUS_COLORS[status] || { fg: '#5C6B6E', bg: '#EFF3F2' };
  const dot = status === 'reported' ? '#E8734A' : status === 'in_progress' ? '#E8AC3C' : '#02C39A';
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors duration-300"
      style={{ backgroundColor: colors.bg, color: colors.fg }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: dot }} />
      {statusLabel(status)}
    </span>
  );
}
