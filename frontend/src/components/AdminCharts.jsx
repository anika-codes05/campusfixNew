import { Link } from 'react-router-dom';

export function StatCard({ label, value, color, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-[#E4EEEC] bg-white p-4">
      <div className="flex items-center gap-2" style={{ color }}>
        <Icon size={18} />
        <span className="text-xs font-semibold uppercase text-[#5C6B6E]">{label}</span>
      </div>
      <p className="mt-1 text-2xl font-bold text-[#1B2A2E]">{value}</p>
    </div>
  );
}

export function MiniBar({ data, color = '#028090' }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex h-32 items-end gap-2">
      {data.map((d, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
          <span className="text-[11px] font-semibold text-[#5C6B6E]">{d.value}</span>
          <div
            className="w-full rounded-t-lg transition-all duration-500"
            style={{ height: `${Math.max((d.value / max) * 100, 4)}%`, backgroundColor: color }}
            title={`${d.label}: ${d.value}`}
          />
          <span className="text-[10px] text-[#5C6B6E]">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export function CategoryBreakdown({ byCategory }) {
  const cats = Object.entries(byCategory || {});
  const palette = ['#028090', '#00A896', '#02C39A', '#E8AC3C', '#E8734A'];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {cats.map(([key, val], idx) => (
        <div key={key} className="rounded-2xl border border-[#E4EEEC] bg-white p-4">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: palette[idx % palette.length] }} />
            <span className="text-xs font-semibold uppercase text-[#5C6B6E]">{key}</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-[#1B2A2E]">{val.total}</p>
          <div className="mt-2 space-y-1 text-xs text-[#5C6B6E]">
            <div className="flex justify-between"><span>Reported</span><span className="font-semibold text-[#E8734A]">{val.open}</span></div>
            <div className="flex justify-between"><span>In progress</span><span className="font-semibold text-[#E8AC3C]">{val.inProgress}</span></div>
            <div className="flex justify-between"><span>Resolved</span><span className="font-semibold text-[#02C39A]">{val.resolved}</span></div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function OverdueList({ overdue }) {
  if (!overdue || overdue.length === 0) {
    return (
      <div className="rounded-2xl border border-[#E4EEEC] bg-white p-6 text-center text-sm text-[#5C6B6E]">
        No overdue issues — everything's moving.
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {overdue.map((o) => (
        <LinkToIssue key={o._id} o={o} />
      ))}
    </div>
  );
}

function LinkToIssue({ o }) {
  return (
    <Link to={`/issues/${o._id}`} className="hover-lift flex items-center justify-between gap-3 rounded-xl border border-[#E4EEEC] bg-white p-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-[#1B2A2E]">{o.title}</p>
        <p className="text-xs text-[#5C6B6E]">{o.location?.blockName} · {o.daysOld}d old</p>
      </div>
      <span className="shrink-0 rounded-full bg-[#FDEDE4] px-2 py-0.5 text-xs font-bold text-[#E8734A]">
        {o.daysOld}d
      </span>
    </Link>
  );
}