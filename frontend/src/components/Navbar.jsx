import { useEffect, useState, useRef } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, LogOut, MapPin, Bell, FileText, Compass, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getNotifications, markRead, markAllRead } from '../api/notifications';
import { getSocket } from '../socket';
import { useToast } from '../context/ToastContext';
import { timeAgo } from '../constants';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [notifs, setNotifs] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const bellRef = useRef(null);

  useEffect(() => {
    let active = true;
    if (user) {
      getNotifications().then((res) => {
        if (!active) return;
        setNotifs(res.notifications || []);
        setUnread(res.unread || 0);
      }).catch(() => {});
    }
    return () => { active = false; };
  }, [user]);

  useEffect(() => {
    const s = getSocket();
    if (!s || !user) return;
    const onNotification = (n) => {
      setNotifs((prev) => [n, ...prev]);
      setUnread((u) => u + 1);
      toast(n.text, 'info');
    };
    s.on('notification:new', onNotification);
    return () => { s.off('notification:new', onNotification); };
  }, [user, toast]);

  useEffect(() => {
    const handler = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const openAll = async () => {
    setOpen(true);
    if (unread === 0) return;
    setUnread(0);
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
    try { await markAllRead(); } catch {}
  };

  const linkClass = ({ isActive }) =>
    `btn-press inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-200 ${
      isActive ? 'bg-[#E4F2F2] text-[#028090]' : 'text-[#5C6B6E] hover:text-[#028090]'
    }`;

  return (
    <header className="sticky top-0 z-50 border-b border-[#E4EEEC] bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#028090] text-white">
            <MapPin size={20} />
          </span>
          <div className="leading-tight">
            <span className="block text-lg font-bold text-[#1B2A2E]">CampusFix</span>
            <span className="block text-[11px] text-[#5C6B6E]">KIET · Ghaziabad</span>
          </div>
        </Link>

        {user && (
          <nav className="flex items-center gap-1">
            <NavLink to="/" className={linkClass}>
              <Compass size={16} /> Feed
            </NavLink>
            <NavLink to="/report" className={linkClass}>
              <FileText size={16} /> Report
            </NavLink>
            <NavLink to="/my-issues" className={linkClass}>
              <LayoutDashboard size={16} /> My Issues
            </NavLink>
            {user.role === 'admin' && (
              <NavLink to="/admin" className={linkClass}>
                <ShieldCheck size={16} /> Admin
              </NavLink>
            )}
          </nav>
        )}

        {user && (
          <div className="flex items-center gap-2">
            <div className="relative" ref={bellRef}>
              <button
                onClick={openAll}
                className="btn-press relative rounded-lg p-2 text-[#5C6B6E] hover:bg-[#E4F2F2] hover:text-[#028090]"
                aria-label="Notifications"
              >
                <Bell size={20} />
                {unread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#E8734A] px-1 text-[11px] font-bold text-white">
                    {unread}
                  </span>
                )}
              </button>
              {open && (
                <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-auto rounded-2xl border border-[#E4EEEC] bg-white shadow-xl animate-fade-rise">
                  <div className="flex items-center justify-between border-b border-[#E4EEEC] px-4 py-2.5">
                    <span className="text-sm font-semibold text-[#1B2A2E]">Notifications</span>
                    {unread > 0 && (
                      <button onClick={markAllRead} className="text-xs text-[#028090] hover:underline">
                        Mark all read
                      </button>
                    )}
                  </div>
                  {notifs.length === 0 && (
                    <p className="px-4 py-6 text-center text-sm text-[#5C6B6E]">No notifications yet.</p>
                  )}
                  {notifs.map((n) => (
                    <button
                      key={n._id}
                      onClick={async () => {
                        setOpen(false);
                        if (n.issue?._id) navigate(`/issues/${n.issue._id}`);
                        if (!n.read) {
                          setUnread((u) => Math.max(0, u - 1));
                          try { await markRead(n._id); } catch {}
                        }
                      }}
                      className={`btn-press block w-full text-left px-4 py-3 hover:bg-[#F4FAF9] ${
                        n.read ? 'opacity-70' : ''
                      } ${n._id !== notifs[notifs.length - 1]?._id ? 'border-b border-[#E4EEEC]' : ''}`}
                    >
                      <p className="text-sm text-[#1B2A2E]">{n.text}</p>
                      <p className="mt-0.5 text-xs text-[#5C6B6E]">{timeAgo(n.createdAt)}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="hidden sm:flex h-9 w-9 items-center justify-center rounded-full bg-[#02C39A] text-sm font-bold text-white">
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <button
              onClick={handleLogout}
              className="btn-press inline-flex items-center gap-1.5 rounded-lg border border-[#E4EEEC] px-3 py-1.5 text-sm font-medium text-[#5C6B6E] hover:border-[#E8734A] hover:text-[#E8734A]"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
