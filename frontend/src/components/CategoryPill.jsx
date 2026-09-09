import { categoryEmoji, categoryLabel } from '../constants';

export default function CategoryPill({ category }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-lg bg-[#E4F2F2] px-2 py-0.5 text-xs font-medium text-[#028090]">
      <span>{categoryEmoji(category)}</span>
      {categoryLabel(category)}
    </span>
  );
}
