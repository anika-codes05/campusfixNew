import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Clock } from 'lucide-react';
import { getMyReports } from '../api/issues';
import { getSocket } from '../socket';
import IssueCard from '../components/IssueCard';
import Loader from '../components/Loader';
import { STATUSES } from '../constants';

export default function MyIssues() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('all');

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getMyReports();
      setIssues(data);
    } catch (err) {
      setError(err.message || 'Failed to load your reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const s = getSocket();
    if (!s) return;
    const onUpdated = (issue) => {
      setIssues((prev) => prev.map((i) => (i._id === issue._id
        ? { ...issue, upvotedByMe: i.upvotedByMe ?? false, confirmedByMe: i.confirmedByMe ?? false }
        : i)));
    };
    const onDeleted = (id) => setIssues((prev) => prev.filter((i) => i._id !== id));
    s.on('issue:updated', onUpdated);
    s.on('issue:deleted', onDeleted);
    return () => {
      s.off('issue:updated', onUpdated);
      s.off('issue:deleted', onDeleted);
    };
  }, []);

  const filtered = tab === 'all' ? issues : issues.filter((i) => i.status === tab);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1B2A2E]">My Issues</h1>
          <p className="text-sm text-[#5C6B6E]">Everything you reported or upvoted — live status tracking.</p>
        </div>
        <Link to="/report" className="btn-press inline-flex items-center gap-2 rounded-xl bg-[#028090] px-4 py-2.5 font-semibold text-white hover:bg-[#01707f]">
          <Plus size={18} /> Report an issue
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <button onClick={() => setTab('all')} className={`btn-press rounded-xl px-4 py-2 text-sm font-medium ${tab === 'all' ? 'bg-[#028090] text-white' : 'border border-[#E4EEEC] bg-white text-[#5C6B6E]'}`}>
          All ({issues.length})
        </button>
        {STATUSES.map((s) => (
          <button key={s.value} onClick={() => setTab(s.value)} className={`btn-press rounded-xl px-4 py-2 text-sm font-medium ${tab === s.value ? 'bg-[#028090] text-white' : 'border border-[#E4EEEC] bg-white text-[#5C6B6E]'}`}>
            {s.label} ({issues.filter((i) => i.status === s.value).length})
          </button>
        ))}
      </div>

      {loading && <Loader label="Loading your issues…" />}

      {error && !loading && (
        <div className="rounded-2xl bg-[#FDEDE4] p-6 text-center text-sm text-[#E8734A]">{error}</div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="rounded-2xl border border-[#E4EEEC] bg-white p-12 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#E4F2F2]">
            <Clock size={26} className="text-[#028090]" />
          </div>
          <p className="text-lg font-semibold text-[#1B2A2E]">Nothing here yet</p>
          <p className="mt-1 text-sm text-[#5C6B6E]">Report your first issue and track it from one place.</p>
          <Link to="/report" className="btn-press mt-4 inline-flex items-center gap-2 rounded-xl bg-[#028090] px-4 py-2.5 font-semibold text-white hover:bg-[#01707f]">
            <Plus size={16} /> Report an issue
          </Link>
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((issue) => <IssueCard key={issue._id} issue={issue} onRefresh={load} />)}
        </div>
      )}
    </div>
  );
}