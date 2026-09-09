import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Plus, MapIcon, List, Search, RefreshCw, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { getIssues } from '../api/issues';
import { getSocket } from '../socket';
import IssueCard from '../components/IssueCard';
import IssueMap from '../components/IssueMap';
import Loader from '../components/Loader';
import { CATEGORIES, STATUSES } from '../constants';
import { useToast } from '../context/ToastContext';

export default function StudentFeed() {
  const toast = useToast();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState('list');

  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchApplied, setSearchApplied] = useState('');
  const [sort, setSort] = useState('newest');
  const [queryVersion, setQueryVersion] = useState(0);
  const searchTimer = useRef(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const LIST_LIMIT = 10;

  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setSearchApplied(searchInput), 300);
    return () => clearTimeout(searchTimer.current);
  }, [searchInput]);

  const fetchPage = useCallback(async (targetPage, append) => {
    try {
      setLoading(true);
      setError('');
      const data = await getIssues({ category, status, search: searchApplied, sort, page: targetPage, limit: LIST_LIMIT });
      const list = data.issues || [];
      const total = data.pagination?.total || 0;
      setIssues((prev) => (append ? [...prev, ...list] : list));
      setPage(targetPage);
      setHasMore(targetPage * LIST_LIMIT < total);
    } catch (err) {
      setError(err.message || 'Failed to load issues.');
      toast('Failed to load issues.', 'error');
    } finally {
      setLoading(false);
    }
  }, [category, status, searchApplied, sort, toast]);

  const refetch = useCallback(() => fetchPage(1, false), [fetchPage]);
  const loadMore = useCallback(() => fetchPage(page + 1, true), [fetchPage, page]);

  useEffect(() => {
    refetch();
  }, [queryVersion, refetch]);

  const reload = useCallback(() => setQueryVersion((v) => v + 1), []);

  const matchesFilters = useCallback((issue) => {
    if (category && issue.category !== category) return false;
    if (status && issue.status !== status) return false;
    if (searchApplied) {
      const q = searchApplied.toLowerCase();
      const title = String(issue.title || '').toLowerCase();
      const block = String(issue.location?.blockName || '').toLowerCase();
      if (!title.includes(q) && !block.includes(q)) return false;
    }
    return true;
  }, [category, status, searchApplied]);

  useEffect(() => {
    const s = getSocket();
    if (!s) return;
    const onNew = (issue) => {
      if (matchesFilters(issue)) {
        setIssues((prev) => [issue, ...prev.filter((i) => i._id !== issue._id)]);
      }
    };
    const onUpdated = (issue) => {
      setIssues((prev) => {
        if (!prev.some((i) => i._id === issue._id)) return prev;
        if (!matchesFilters(issue)) return prev.filter((i) => i._id !== issue._id);
        return prev.map((i) => (i._id === issue._id
          ? { ...issue, upvotedByMe: i.upvotedByMe ?? false, confirmedByMe: i.confirmedByMe ?? false }
          : i));
      });
    };
    const onDeleted = (id) => setIssues((prev) => prev.filter((i) => i._id !== id));
    s.on('issue:new', onNew);
    s.on('issue:updated', onUpdated);
    s.on('issue:deleted', onDeleted);
    return () => {
      s.off('issue:new', onNew);
      s.off('issue:updated', onUpdated);
      s.off('issue:deleted', onDeleted);
    };
  }, [matchesFilters]);

  const stats = useMemo(() => {
    return {
      reported: issues.filter((i) => i.status === 'reported').length,
      in_progress: issues.filter((i) => i.status === 'in_progress').length,
      resolved: issues.filter((i) => i.status === 'resolved').length,
      total: issues.length,
    };
  }, [issues]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1B2A2E]">Campus Feed</h1>
          <p className="text-sm text-[#5C6B6E]">See what's broken, what's fixed, and what needs your support.</p>
        </div>
        <Link
          to="/report"
          className="btn-press inline-flex items-center gap-2 rounded-xl bg-[#028090] px-4 py-2.5 font-semibold text-white transition-colors hover:bg-[#01707f]"
        >
          <Plus size={18} />
          Report an issue
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-[#E4EEEC] bg-white p-4">
          <div className="flex items-center gap-2 text-[#E8734A]"><AlertTriangle size={18} /><span className="text-xs font-semibold uppercase text-[#5C6B6E]">Reported</span></div>
          <p className="mt-1 text-2xl font-bold text-[#1B2A2E]">{stats.reported}</p>
        </div>
        <div className="rounded-2xl border border-[#E4EEEC] bg-white p-4">
          <div className="flex items-center gap-2 text-[#E8AC3C]"><Clock size={18} /><span className="text-xs font-semibold uppercase text-[#5C6B6E]">In Progress</span></div>
          <p className="mt-1 text-2xl font-bold text-[#1B2A2E]">{stats.in_progress}</p>
        </div>
        <div className="rounded-2xl border border-[#E4EEEC] bg-white p-4">
          <div className="flex items-center gap-2 text-[#02C39A]"><CheckCircle2 size={18} /><span className="text-xs font-semibold uppercase text-[#5C6B6E]">Resolved</span></div>
          <p className="mt-1 text-2xl font-bold text-[#1B2A2E]">{stats.resolved}</p>
        </div>
        <div className="rounded-2xl border border-[#E4EEEC] bg-white p-4">
          <div className="flex items-center gap-2 text-[#028090]"><RefreshCw size={18} /><span className="text-xs font-semibold uppercase text-[#5C6B6E]">Total</span></div>
          <p className="mt-1 text-2xl font-bold text-[#1B2A2E]">{stats.total}</p>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5C6B6E]" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search title or block…"
            className="w-56 rounded-xl border border-[#E4EEEC] bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-[#028090]"
          />
        </div>

        <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-xl border border-[#E4EEEC] bg-white px-3 py-2 text-sm outline-none focus:border-[#028090]">
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>

        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border border-[#E4EEEC] bg-white px-3 py-2 text-sm outline-none focus:border-[#028090]">
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>

        <select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-xl border border-[#E4EEEC] bg-white px-3 py-2 text-sm outline-none focus:border-[#028090]">
          <option value="newest">Newest first</option>
          <option value="upvotes">Most upvoted</option>
          <option value="priority">By priority</option>
          <option value="oldest">Oldest first</option>
        </select>

        <div className="ml-auto flex overflow-hidden rounded-xl border border-[#E4EEEC] bg-white">
          <button
            onClick={() => setView('list')}
            className={`btn-press flex items-center gap-1.5 px-3 py-2 text-sm font-medium ${view === 'list' ? 'bg-[#028090] text-white' : 'text-[#5C6B6E]'}`}
          >
            <List size={16} /> List
          </button>
          <button
            onClick={() => setView('map')}
            className={`btn-press flex items-center gap-1.5 px-3 py-2 text-sm font-medium ${view === 'map' ? 'bg-[#028090] text-white' : 'text-[#5C6B6E]'}`}
          >
            <MapIcon size={16} /> Map
          </button>
        </div>
      </div>

      {loading && issues.length === 0 && <Loader label="Loading issues…" />}
      {loading && issues.length > 0 && (
        <div className="mb-3 flex items-center gap-2 text-xs text-[#5C6B6E]">
          <RefreshCw size={13} className="animate-spin" /> Refreshing…
        </div>
      )}

      {error && !loading && (
        <div className="rounded-2xl bg-[#FDEDE4] p-6 text-center text-sm text-[#E8734A]">
          {error}
        </div>
      )}

      {!error && view === 'list' && issues.length === 0 && !loading && (
        <div className="rounded-2xl border border-[#E4EEEC] bg-white p-12 text-center">
          <p className="text-lg font-semibold text-[#1B2A2E]">No issues match your filters</p>
          <p className="mt-1 text-sm text-[#5C6B6E]">Try clearing some filters, or be the first to report one.</p>
          <Link to="/report" className="btn-press mt-4 inline-flex items-center gap-2 rounded-xl bg-[#028090] px-4 py-2 font-semibold text-white hover:bg-[#01707f]">
            <Plus size={16} /> Report an issue
          </Link>
        </div>
      )}

      {!error && view === 'list' && issues.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {issues.map((issue) => <IssueCard key={issue._id} issue={issue} onRefresh={reload} />)}
        </div>
      )}

      {!error && view === 'list' && hasMore && (
        <div className="mt-6 text-center">
          <button
            onClick={loadMore}
            disabled={loading}
            className="btn-press inline-flex items-center gap-2 rounded-xl border border-[#E4EEEC] bg-white px-5 py-2.5 text-sm font-semibold text-[#028090] hover:border-[#028090] disabled:opacity-60"
          >
            <RefreshCw size={15} /> Load more issues
          </button>
        </div>
      )}

      {!error && view === 'map' && (
        <div className="h-[520px] overflow-hidden rounded-2xl border border-[#E4EEEC]">
          <IssueMap issues={issues} />
        </div>
      )}
    </div>
  );
}