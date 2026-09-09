import { useEffect, useState, useCallback } from 'react';
import {
  AlertTriangle, Clock, CheckCircle2, Layers, MapIcon, List, Download,
  RefreshCw, Search, Users as UsersIcon, ShieldCheck,
} from 'lucide-react';
import { getSocket } from '../socket';
import {
  getStats, getTrends, getOverdue, adminGetIssues, getUsers,
  setUserRole, setUserTeam, exportCsv,
} from '../api/admin';
import { CATEGORIES, STATUSES, TEAMS, timeAgo } from '../constants';
import Loader from '../components/Loader';
import AdminTable from '../components/AdminTable';
import IssueMap from '../components/IssueMap';
import { StatCard, CategoryBreakdown, MiniBar, OverdueList } from '../components/AdminCharts';
import { updateStatus, updatePriority, assignIssue } from '../api/issues';
import { useToast } from '../context/ToastContext';

export default function AdminDashboard() {
  const toast = useToast();

  const [stats, setStats] = useState(null);
  const [trends, setTrends] = useState([]);
  const [overdue, setOverdue] = useState([]);
  const [issues, setIssues] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [view, setView] = useState('table');
  const [filters, setFilters] = useState({});
  const [selecting, setSelecting] = useState(new Set());
  const [showUsers, setShowUsers] = useState(false);
  const [issuesPage, setIssuesPage] = useState(1);
  const [hasMoreIssues, setHasMoreIssues] = useState(false);
  const ADMIN_LIMIT = 20;

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      const [s, t, o, i, u] = await Promise.all([getStats(), getTrends(14), getOverdue(3), adminGetIssues({ ...filters, page: 1, limit: ADMIN_LIMIT }), getUsers()]);
      setStats(s);
      setTrends(t);
      setOverdue(o);
      setIssues(i.issues || []);
      setIssuesPage(1);
      setHasMoreIssues(ADMIN_LIMIT < (i.pagination?.total || 0));
      setUsers(u);
    } catch (err) {
      toast(err.message || 'Failed to load dashboard.', 'error');
    } finally {
      setLoading(false);
    }
  }, [filters, toast]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const matchesFilters = useCallback((issue) => {
    if (filters.category && issue.category !== filters.category) return false;
    if (filters.status && issue.status !== filters.status) return false;
    if (filters.priority && issue.priority !== filters.priority) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const title = String(issue.title || '').toLowerCase();
      const block = String(issue.location?.blockName || '').toLowerCase();
      if (!title.includes(q) && !block.includes(q)) return false;
    }
    return true;
  }, [filters]);

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
        return prev.map((i) => (i._id === issue._id ? issue : i));
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

  const refresh = useCallback(() => loadAll(), [loadAll]);

  const loadMoreIssues = useCallback(async () => {
    const next = issuesPage + 1;
    try {
      const data = await adminGetIssues({ ...filters, page: next, limit: ADMIN_LIMIT });
      setIssues((prev) => [...prev, ...(data.issues || [])]);
      setIssuesPage(next);
      setHasMoreIssues(next * ADMIN_LIMIT < (data.pagination?.total || 0));
    } catch (err) {
      toast(err.message || 'Failed to load more.', 'error');
    }
  }, [filters, issuesPage, toast]);

  const handleStatusChange = async (id, status) => {
    try {
      const updated = await updateStatus(id, status);
      setIssues((prev) => prev.map((i) => (i._id === id ? { ...i, status: updated.status } : i)));
      toast('Status updated.', 'success');
      loadAll();
    } catch (err) {
      toast(err.message || 'Failed to update status.', 'error');
    }
  };

  const handlePriorityChange = async (id, priority) => {
    try {
      await updatePriority(id, priority);
      setIssues((prev) => prev.map((i) => (i._id === id ? { ...i, priority } : i)));
      toast('Priority updated.', 'success');
      loadAll();
    } catch (err) {
      toast(err.message || 'Failed to update priority.', 'error');
    }
  };

  const handleAssign = async (id, assignedTo) => {
    try {
      await assignIssue(id, assignedTo || null);
      const user = users.find((u) => u._id === assignedTo);
      setIssues((prev) => prev.map((i) => (i._id === id ? { ...i, assignedTo: user ? { _id: user._id, name: user.name } : null } : i)));
      toast('Assignment updated.', 'success');
      loadAll();
    } catch (err) {
      toast(err.message || 'Failed to assign.', 'error');
    }
  };

  const handleBulk = async (action, value) => {
    const ids = [...selecting];
    if (ids.length === 0) {
      toast('Select at least one issue first.', 'error');
      return;
    }
    try {
      await Promise.all(ids.map((id) => (action === 'status' ? updateStatus(id, value) : updatePriority(id, value))));
      toast(`Updated ${ids.length} issue(s).`, 'success');
      setSelecting(new Set());
      loadAll();
    } catch (err) {
      toast(err.message || 'Bulk update failed.', 'error');
    }
  };

  const handleExport = async () => {
    try {
      const csv = await exportCsv();
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'campusfix-export.csv';
      a.click();
      URL.revokeObjectURL(url);
      toast('Export downloaded.', 'success');
    } catch (err) {
      toast(err.message || 'Export failed.', 'error');
    }
  };

  const filterList = [
    {
      key: 'category',
      options: [{ value: '', label: 'All categories' }, ...CATEGORIES],
    },
    {
      key: 'status',
      options: [{ value: '', label: 'All statuses' }, ...STATUSES],
    },
    {
      key: 'priority',
      options: [
        { value: '', label: 'All priorities' },
        { value: 'low', label: 'Low' },
        { value: 'medium', label: 'Medium' },
        { value: 'high', label: 'High' },
        { value: 'urgent', label: 'Urgent' },
      ],
    },
  ];

  if (loading && !stats) {
    return <div className="mx-auto max-w-6xl px-4 py-16"><Loader label="Loading dashboard…" /></div>;
  }

  const trendData = (trends.labels || []).map((label, i) => ({
    label: label.slice(5),
    value: (trends.counts || {})[label] || 0,
  }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1B2A2E]">Admin Dashboard</h1>
          <p className="text-sm text-[#5C6B6E]">Monitor, prioritize, and resolve campus issues — live from the backend.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="btn-press inline-flex items-center gap-1.5 rounded-xl border border-[#E4EEEC] bg-white px-4 py-2.5 text-sm font-semibold text-[#5C6B6E] hover:text-[#028090]">
            <Download size={16} /> Export CSV
          </button>
          <button onClick={refresh} className="btn-press inline-flex items-center gap-1.5 rounded-xl bg-[#028090] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#01707f]">
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Reported" value={stats.open} color="#E8734A" icon={AlertTriangle} />
          <StatCard label="In Progress" value={stats.inProgress} color="#E8AC3C" icon={Clock} />
          <StatCard label="Resolved" value={stats.resolved} color="#02C39A" icon={CheckCircle2} />
          <StatCard label="Total" value={stats.total} color="#028090" icon={Layers} />
        </div>
      )}

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#E4EEEC] bg-white p-5">
          <h2 className="mb-4 text-lg font-bold text-[#1B2A2E]">Issues by category</h2>
          <CategoryBreakdown byCategory={stats?.byCategory} />
        </div>
        <div className="rounded-2xl border border-[#E4EEEC] bg-white p-5">
          <h2 className="mb-4 text-lg font-bold text-[#1B2A2E]">Reports — last 14 days</h2>
          <MiniBar data={trendData} color="#028090" />
        </div>
      </div>

      <div className="mb-6">
        <h2 className="mb-3 text-lg font-bold text-[#1B2A2E]">Overdue (3+ days)</h2>
        <OverdueList overdue={overdue} />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {filterList.map((f) => (
            <select
              key={f.key}
              value={filters[f.key] || ''}
              onChange={(e) => setFilters((prev) => ({ ...prev, [f.key]: e.target.value }))}
              className="rounded-xl border border-[#E4EEEC] bg-white px-3 py-2 text-sm outline-none focus:border-[#028090]"
            >
              {f.options.map((o) => (
                <option key={o.value || `all-${f.key}`} value={o.value}>{o.label}</option>
              ))}
            </select>
          ))}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5C6B6E]" />
            <input
              value={filters.search || ''}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              placeholder="Search title / block…"
              className="w-52 rounded-xl border border-[#E4EEEC] bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-[#028090]"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selecting.size > 0 && (
            <>
              <select
                onChange={(e) => { handleBulk('status', e.target.value); e.target.value = ''; }}
                className="rounded-xl border border-[#028090] bg-[#E4F2F2] px-3 py-2 text-sm font-medium text-[#028090] outline-none"
              >
                <option value="">Bulk status…</option>
                {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <select
                onChange={(e) => { handleBulk('priority', e.target.value); e.target.value = ''; }}
                className="rounded-xl border border-[#028090] bg-[#E4F2F2] px-3 py-2 text-sm font-medium text-[#028090] outline-none"
              >
                <option value="">Bulk priority…</option>
                {['low', 'medium', 'high', 'urgent'].map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <button onClick={() => setSelecting(new Set())} className="rounded-xl px-3 py-2 text-sm text-[#5C6B6E] hover:text-[#E8734A]">
                Clear ({selecting.size})
              </button>
            </>
          )}
          <div className="flex overflow-hidden rounded-xl border border-[#E4EEEC] bg-white">
            <button onClick={() => setView('table')} className={`btn-press flex items-center gap-1.5 px-3 py-2 text-sm font-medium ${view === 'table' ? 'bg-[#028090] text-white' : 'text-[#5C6B6E]'}`}>
              <List size={16} /> Table
            </button>
            <button onClick={() => setView('map')} className={`btn-press flex items-center gap-1.5 px-3 py-2 text-sm font-medium ${view === 'map' ? 'bg-[#028090] text-white' : 'text-[#5C6B6E]'}`}>
              <MapIcon size={16} /> Map
            </button>
          </div>
        </div>
      </div>

      {loading && <Loader label="Refreshing…" />}

      {!loading && view === 'table' && (
        <>
        <AdminTable
          issues={issues}
          users={users}
          onStatusChange={handleStatusChange}
          onPriorityChange={handlePriorityChange}
          onAssign={handleAssign}
          selecting={selecting}
          onToggleSelect={(id) => setSelecting((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
          })}
          onToggleSelectAll={(list) => {
            setSelecting((prev) => {
              const next = new Set(prev);
              const selected = list.filter((i) => next.has(i._id));
              if (selected.length === list.length) {
                list.forEach((i) => next.delete(i._id));
              } else {
                list.forEach((i) => next.add(i._id));
              }
              return next;
            });
          }}
        />
        {hasMoreIssues && (
          <div className="mt-4 text-center">
            <button
              onClick={loadMoreIssues}
              className="btn-press inline-flex items-center gap-2 rounded-xl border border-[#E4EEEC] bg-white px-5 py-2.5 text-sm font-semibold text-[#028090] hover:border-[#028090]"
            >
              <RefreshCw size={15} /> Load more issues
            </button>
          </div>
        )}
        </>
      )}

      {!loading && view === 'map' && (
        <div className="h-[520px] overflow-hidden rounded-2xl border border-[#E4EEEC]">
          <IssueMap issues={issues} onStatusChange={handleStatusChange} />
        </div>
      )}

      <div className="mt-10">
        <button
          onClick={() => setShowUsers((s) => !s)}
          className="btn-press inline-flex items-center gap-2 rounded-xl border border-[#E4EEEC] bg-white px-4 py-2.5 font-semibold text-[#1B2A2E] hover:text-[#028090]"
        >
          <UsersIcon size={18} /> {showUsers ? 'Hide user management' : 'User management'}
        </button>

        {showUsers && (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-[#E4EEEC] bg-white">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-[#E4EEEC] bg-[#F4FAF9] text-xs uppercase text-[#5C6B6E]">
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Team</th>
                  <th className="px-4 py-3">Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id} className="border-b border-[#E4EEEC] hover:bg-[#F4FAF9]">
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2 font-semibold text-[#1B2A2E]">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#02C39A] text-xs font-bold text-white">
                          {u.name?.charAt(0).toUpperCase()}
                        </span>
                        {u.name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#5C6B6E]">{u.email}</td>
                    <td className="px-4 py-3">
                      <select
                        value={u.role}
                        onChange={async (e) => {
                          try {
                            await setUserRole(u._id, e.target.value);
                            toast('Role updated.', 'success');
                            refresh();
                          } catch (err) { toast(err.message, 'error'); }
                        }}
                        className="rounded-lg border border-[#E4EEEC] bg-white px-2 py-1 text-xs"
                      >
                        <option value="student">student</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={u.team}
                        onChange={async (e) => {
                          try {
                            await setUserTeam(u._id, e.target.value);
                            toast('Team updated.', 'success');
                            refresh();
                          } catch (err) { toast(err.message, 'error'); }
                        }}
                        className="rounded-lg border border-[#E4EEEC] bg-white px-2 py-1 text-xs"
                      >
                        {TEAMS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#5C6B6E]">{timeAgo(u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-10 rounded-2xl border border-dashed border-[#B9D6D2] bg-[#F4FAF9] p-6">
        <div className="flex items-center gap-3">
          <ShieldCheck size={22} className="text-[#028090]" />
          <div>
            <p className="font-semibold text-[#1B2A2E]">Manage users & roles</p>
            <p className="text-sm text-[#5C6B6E]">Promote students to admins (or maintenance staff) and assign them to teams. Use the User management toggle above.</p>
          </div>
        </div>
      </div>
    </div>
  );
}