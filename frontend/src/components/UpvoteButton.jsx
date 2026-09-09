import { useState } from 'react';
import { ThumbsUp } from 'lucide-react';
import { toggleUpvote } from '../api/issues';

export default function UpvoteButton({ issue, onChanged }) {
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState(issue?.upvoteCount ?? 0);
  const [upvoted, setUpvoted] = useState(issue?.upvotedByMe ?? false);

  const handle = async () => {
    setLoading(true);
    try {
      const res = await toggleUpvote(issue._id);
      setCount(res.upvoteCount);
      setUpvoted(res.upvoted);
      onChanged?.(res);
    } catch {
      onChanged?.(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handle}
      disabled={loading}
      className={`btn-press inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm font-semibold transition-colors duration-200 ${
        upvoted
          ? 'border-[#028090] bg-[#028090] text-white'
          : 'border-[#E4EEEC] bg-white text-[#5C6B6E] hover:border-[#028090] hover:text-[#028090]'
      }`}
    >
      <ThumbsUp size={16} fill={upvoted ? 'currentColor' : 'none'} />
      <span>{count}</span>
    </button>
  );
}
