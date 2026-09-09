import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import StatusBadge from './StatusBadge';
import PriorityBadge from './PriorityBadge';
import CategoryPill from './CategoryPill';
import UpvoteButton from './UpvoteButton';
import { timeAgo, affectedLabel } from '../constants';

export default function IssueCard({ issue, onRefresh }) {
  return (
    <Link
      to={`/issues/${issue._id}`}
      className="hover-lift block overflow-hidden rounded-2xl border border-[#E4EEEC] bg-white"
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-2">
          <CategoryPill category={issue.category} />
          <div className="flex gap-1.5">
            <PriorityBadge priority={issue.priority} />
          </div>
        </div>

        <h3 className="mt-3 text-lg font-bold text-[#1B2A2E] line-clamp-2">{issue.title}</h3>
        <p className="mt-1.5 text-sm text-[#5C6B6E] line-clamp-3">{issue.description}</p>

        {issue.photoUrl && (
          <img
            src={issue.photoUrl}
            alt={issue.title}
            className="mt-3 h-40 w-full rounded-xl object-cover"
          />
        )}

        <div className="mt-3 flex items-center gap-1 text-sm text-[#5C6B6E]">
          <MapPin size={15} className="shrink-0 text-[#028090]" />
          <span className="truncate">
            {issue.location.blockName}
            {issue.location.floorRoom ? ` · ${issue.location.floorRoom}` : ''}
          </span>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <StatusBadge status={issue.status} />
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#5C6B6E]">{timeAgo(issue.createdAt)}</span>
          </div>
        </div>
      </div>

      <div
        className="flex items-center justify-between border-t border-[#E4EEEC] bg-[#F4FAF9] px-5 py-3"
        onClick={(e) => e.preventDefault()}
      >
        <span className="text-xs text-[#5C6B6E]">Tap to view tracking</span>
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-[11px] font-medium text-[#028090]">{affectedLabel(issue.affectedCount)}</span>
          <UpvoteButton issue={issue} onChanged={onRefresh} />
        </div>
      </div>
    </Link>
  );
}