import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Send, Trash2, CheckCircle2, RotateCcw, BellRing, MessageSquare,
} from 'lucide-react';
import { getIssue, addComment, confirmResolved, reopenIssue, subscribe, deleteIssue, toggleUpvote } from '../api/issues';
import { getSocket } from '../socket';
import StatusBadge from '../components/StatusBadge';
import PriorityBadge from '../components/PriorityBadge';
import CategoryPill from '../components/CategoryPill';
import Loader from '../components/Loader';
import IssueMap from '../components/IssueMap';
import { timeAgo, statusLabel } from '../constants';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function IssueDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [comment, setComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [upvoteLoading, setUpvoteLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getIssue(id);
      setIssue(data);
    } catch (err) {
      setError(err.message || 'Failed to load issue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const s = getSocket();
    if (!s || !id) return;
    const onUpdated = (updated) => {
      if (updated._id === id) {
        setIssue((prev) => (prev ? { ...updated, upvotedByMe: prev.upvotedByMe ?? false, confirmedByMe: prev.confirmedByMe ?? false } : updated));
      }
    };
    const onDeleted = (deletedId) => {
      if (deletedId === id) {
        toast('Issue was deleted.', 'info');
        navigate('/');
      }
    };
    s.on('issue:updated', onUpdated);
    s.on('issue:deleted', onDeleted);
    return () => {
      s.off('issue:updated', onUpdated);
      s.off('issue:deleted', onDeleted);
    };
  }, [id, toast, navigate]);

  if (loading) return <div className="mx-auto max-w-4xl px-4 py-16"><Loader label="Loading issue…" /></div>;
  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16">
        <div className="rounded-2xl bg-[#FDEDE4] p-8 text-center text-[#E8734A]">{error}</div>
        <div className="mt-4 text-center"><Link to="/" className="text-sm font-semibold text-[#028090] hover:underline">Back to feed</Link></div>
      </div>
    );
  }

  const isReporter = issue.reportedBy?.some((u) => u._id === user?._id);
  const canManage = user?.role === 'admin' || isReporter;

  const handleUpvote = async () => {
    setUpvoteLoading(true);
    try {
      const res = await toggleUpvote(issue._id);
      setIssue((prev) => ({ ...prev, upvotedByMe: res.upvoted, upvoteCount: res.upvoteCount }));
    } catch {
      toast('Failed to update upvote.', 'error');
    } finally {
      setUpvoteLoading(false);
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setSendingComment(true);
    try {
      const updated = await addComment(id, comment);
      setIssue(updated);
      setComment('');
      toast('Comment added.', 'success');
    } catch (err) {
      toast(err.message || 'Failed to add comment.', 'error');
    } finally {
      setSendingComment(false);
    }
  };

  const handleConfirm = async () => {
    try {
      const updated = await confirmResolved(id);
      setIssue(updated);
      toast('Thanks for confirming — this helps us close out the issue.', 'success');
    } catch (err) {
      toast(err.message || 'Failed to confirm.', 'error');
    }
  };

  const handleReopen = async () => {
    try {
      const updated = await reopenIssue(id);
      setIssue(updated);
      toast('Issue reopened.', 'success');
    } catch (err) {
      toast(err.message || 'Failed to reopen.', 'error');
    }
  };

  const handleSubscribe = async () => {
    try {
      await subscribe(id);
      toast('You\'ve subscribed to updates for this issue.', 'success');
    } catch (err) {
      toast(err.message || 'Failed to subscribe.', 'error');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this issue permanently?')) return;
    setDeleting(true);
    try {
      await deleteIssue(id);
      toast('Issue deleted.', 'success');
      navigate('/');
    } catch (err) {
      toast(err.message || 'Failed to delete.', 'error');
      setDeleting(false);
    }
  };

  const timeline = [...(issue.timeline || [])].reverse();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-[#5C6B6E] hover:text-[#028090]">
        <ArrowLeft size={16} /> Back to feed
      </Link>

      <div className="mt-4 rounded-2xl border border-[#E4EEEC] bg-white overflow-hidden">
        {issue.photoUrl && (
          <img src={issue.photoUrl} alt={issue.title} className="max-h-80 w-full object-cover" />
        )}
        <div className="p-6">
          <div className="flex flex-wrap items-center gap-2">
            <CategoryPill category={issue.category} />
            <StatusBadge status={issue.status} />
            <PriorityBadge priority={issue.priority} />
          </div>

          <h1 className="mt-3 text-2xl font-bold text-[#1B2A2E]">{issue.title}</h1>
          <p className="mt-2 text-[#5C6B6E] whitespace-pre-wrap">{issue.description}</p>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-[#5C6B6E]">
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={15} className="text-[#028090]" />
              {issue.location.blockName}{issue.location.floorRoom ? ` · ${issue.location.floorRoom}` : ''}
            </span>
            <span>Reported {timeAgo(issue.createdAt)}</span>
            {issue.status === 'resolved' && issue.resolvedAt && (
              <span className="text-[#02C39A]">Resolved {timeAgo(issue.resolvedAt)}</span>
            )}
            {issue.assignedTo && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-[#E4F2F2] px-2 py-0.5 text-xs font-medium text-[#028090]">
                Assigned: {issue.assignedTo.name}
              </span>
            )}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button
              onClick={handleUpvote}
              disabled={upvoteLoading}
              className={`btn-press inline-flex items-center gap-1.5 rounded-xl px-4 py-2 font-semibold transition-colors ${
                issue.upvotedByMe ? 'bg-[#028090] text-white' : 'border border-[#E4EEEC] bg-white text-[#5C6B6E] hover:text-[#028090]'
              }`}
            >
              ▲ {issue.upvoteCount} Upvoted
            </button>
            <button onClick={handleSubscribe} className="btn-press inline-flex items-center gap-1.5 rounded-xl border border-[#E4EEEC] bg-white px-4 py-2 text-sm font-medium text-[#5C6B6E] hover:text-[#028090]">
              <BellRing size={16} /> Follow updates
            </button>
            {issue.status === 'resolved' && !issue.confirmedByMe && (
              <button onClick={handleConfirm} className="btn-press inline-flex items-center gap-1.5 rounded-xl bg-[#02C39A] px-4 py-2 font-semibold text-white hover:opacity-90">
                <CheckCircle2 size={16} /> Confirm fixed
              </button>
            )}
            {issue.status === 'resolved' && issue.confirmedByMe && (
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-[#E1F7EF] px-4 py-2 text-sm font-medium text-[#02C39A]">
                <CheckCircle2 size={16} /> You confirmed this
              </span>
            )}
            {user?.role === 'admin' && (
              <button onClick={handleReopen} className="btn-press inline-flex items-center gap-1.5 rounded-xl border border-[#E8AC3C] bg-[#FCF2DA] px-4 py-2 text-sm font-semibold text-[#E8AC3C] hover:bg-[#F9E8B8]">
                <RotateCcw size={16} /> Reopen
              </button>
            )}
            {canManage && (
              <button onClick={handleDelete} disabled={deleting} className="btn-press ml-auto inline-flex items-center gap-1.5 rounded-xl border border-[#FDEDE4] bg-white px-4 py-2 text-sm font-medium text-[#E8734A] hover:bg-[#FDEDE4]">
                <Trash2 size={16} /> {deleting ? 'Deleting…' : 'Delete'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#E4EEEC] bg-white p-6">
          <h2 className="mb-4 text-lg font-bold text-[#1B2A2E]">Tracking history</h2>
          {timeline.length === 0 && <p className="text-sm text-[#5C6B6E]">No status changes yet.</p>}
          <div className="relative space-y-5 before:absolute before:left-[7px] before:top-1 before:bottom-1 before:w-px before:bg-[#E4EEEC]">
            {timeline.map((entry, idx) => {
              const colors = entry.status === 'reported' ? '#E8734A' : entry.status === 'in_progress' ? '#E8AC3C' : '#02C39A';
              return (
                <div key={idx} className="relative pl-6">
                  <span className="absolute left-0 top-1 h-[15px] w-[15px] rounded-full border-2 bg-white" style={{ borderColor: colors }} />
                  <div className="text-sm text-[#1B2A2E]">
                    <span className="font-semibold">{statusLabel(entry.status)}</span>
                    {entry.note ? <span className="text-[#5C6B6E]"> — {entry.note}</span> : null}
                  </div>
                  <div className="text-xs text-[#5C6B6E]">
                    {entry.by?.name || 'System'} · {timeAgo(entry.createdAt)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-[#E4EEEC] bg-white p-6">
          <h2 className="mb-4 text-lg font-bold text-[#1B2A2E]">Comments</h2>
          <div className="space-y-3">
            {(issue.comments || []).length === 0 && <p className="text-sm text-[#5C6B6E]">No comments yet.</p>}
            {issue.comments?.map((c) => (
              <div key={c._id || c.createdAt} className="rounded-xl bg-[#F4FAF9] p-3">
                <div className="flex items-center justify-between text-xs text-[#5C6B6E]">
                  <span className="font-semibold text-[#1B2A2E]">{c.user?.name}</span>
                  <span>{timeAgo(c.createdAt)}</span>
                </div>
                <p className="mt-1 text-sm text-[#1B2A2E]">{c.text}</p>
              </div>
            ))}
          </div>
          <form onSubmit={handleComment} className="mt-4 flex gap-2">
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a comment…"
              className="flex-1 rounded-xl border border-[#E4EEEC] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#028090]"
            />
            <button type="submit" disabled={sendingComment || !comment.trim()} className="btn-press inline-flex items-center gap-1.5 rounded-xl bg-[#028090] px-4 py-2.5 font-semibold text-white hover:bg-[#01707f] disabled:opacity-50">
              <Send size={16} />
              <span className="hidden sm:inline">{sendingComment ? '…' : 'Send'}</span>
            </button>
          </form>
        </div>
      </div>

      <div className="mt-6 h-80 overflow-hidden rounded-2xl border border-[#E4EEEC]">
        <IssueMap issues={[issue]} height="320px" />
      </div>
    </div>
  );
}