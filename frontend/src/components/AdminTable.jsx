import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Loader2 } from 'lucide-react';
import StatusBadge from './StatusBadge';
import PriorityBadge from './PriorityBadge';
import { timeAgo, affectedLabel } from '../constants';

function InlineControl({ value, onChange, options, loading, color }) {
  return (
    <div className="relative inline-flex items-center">
      <select
        value={value}
        disabled={loading}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-[#E4EEEC] bg-white py-1 pl-2 pr-7 text-xs font-medium text-[#1B2A2E] outline-none transition-colors focus:border-[#028090] disabled:opacity-60"
        style={{ color }}
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {loading && <Loader2 size={12} className="absolute right-1.5 animate-spin text-[#028090]" />}
    </div>
  );
}

export default function AdminTable({
  issues,
  users,
  onStatusChange,
  onPriorityChange,
  onAssign,
  selecting,
  onToggleSelect,
  onToggleSelectAll,
}) {
  const [busy, setBusy] = useState({});

  const markBusy = (id, key, fn) => async (value) => {
    setBusy((b) => ({ ...b, [`${id}_${key}`]: true }));
    try {
      await fn(id, value);
    } finally {
      setBusy((b) => ({ ...b, [`${id}_${key}`]: false }));
    }
  };

  const allSelected = issues.length > 0 && selecting.size === issues.length;

  return (
    <div className="overflow-x-auto rounded-2xl border border-[#E4EEEC] bg-white">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead>
          <tr className="border-b border-[#E4EEEC] bg-[#F4FAF9] text-xs uppercase text-[#5C6B6E]">
            <th className="px-4 py-3">
              <input type="checkbox" checked={allSelected} onChange={() => onToggleSelectAll(issues)} className="h-4 w-4 accent-[#028090]" />
            </th>
            <th className="px-4 py-3">Issue</th>
            <th className="px-4 py-3">Category</th>
            <th className="px-4 py-3">Location</th>
            <th className="px-4 py-3">Upvotes</th>
            <th className="px-4 py-3">Priority</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Assign</th>
            <th className="px-4 py-3">Reported</th>
          </tr>
        </thead>
        <tbody>
          {issues.map((issue) => {
            const assignOptions = [
              { value: '', label: 'Unassigned' },
              ...(users || [])
                .filter((u) => u.role === 'admin')
                .map((u) => ({ value: u._id, label: u.name })),
            ];
            return (
              <tr key={issue._id} className="border-b border-[#E4EEEC] transition-colors hover:bg-[#F4FAF9]">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selecting.has(issue._id)}
                    onChange={() => onToggleSelect(issue._id)}
                    className="h-4 w-4 accent-[#028090]"
                  />
                </td>
                <td className="max-w-[240px] px-4 py-3">
                  <Link to={`/issues/${issue._id}`} className="block font-semibold text-[#1B2A2E] hover:text-[#028090]">
                    {issue.title}
                  </Link>
                  <span className="block truncate text-xs text-[#5C6B6E]">{issue.description}</span>
                </td>
                <td className="px-4 py-3 text-[#5C6B6E]">{issue.category}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 text-xs text-[#5C6B6E]">
                    <MapPin size={13} className="text-[#028090]" />
                    {issue.location?.blockName}{issue.location?.floorRoom ? ` · ${issue.location.floorRoom}` : ''}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="font-semibold text-[#028090]">▲ {issue.upvoteCount}</div>
                  <div className="mt-0.5 text-[11px] text-[#5C6B6E]">{affectedLabel(issue.affectedCount)}</div>
                </td>
                <td className="px-4 py-3">
                  <PriorityBadge priority={issue.priority} />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={issue.status} />
                  <div className="mt-1.5">
                    <InlineControl
                      value={issue.status}
                      onChange={markBusy(issue._id, 'status', onStatusChange)}
                      options={[
                        { value: 'reported', label: 'Reported' },
                        { value: 'in_progress', label: 'In Progress' },
                        { value: 'resolved', label: 'Resolved' },
                      ]}
                      loading={busy[`${issue._id}_status`]}
                      color={{
                        reported: '#E8734A',
                        in_progress: '#E8AC3C',
                        resolved: '#02C39A',
                      }[issue.status]}
                    />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <InlineControl
                    value={issue.priority}
                    onChange={markBusy(issue._id, 'priority', onPriorityChange)}
                    options={[
                      { value: 'low', label: 'Low' },
                      { value: 'medium', label: 'Medium' },
                      { value: 'high', label: 'High' },
                      { value: 'urgent', label: 'Urgent' },
                    ]}
                    loading={busy[`${issue._id}_priority`]}
                  />
                  <div className="mt-1.5">
                    <InlineControl
                      value={issue.assignedTo?._id || ''}
                      onChange={markBusy(issue._id, 'assign', onAssign)}
                      options={assignOptions}
                      loading={busy[`${issue._id}_assign`]}
                    />
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-[#5C6B6E]">{timeAgo(issue.createdAt)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}