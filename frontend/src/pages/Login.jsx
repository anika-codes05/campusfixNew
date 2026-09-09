import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { login } from '../api/auth';

export default function Login() {
  const { setAuth } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handle = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login({ email, password });
      setAuth(data);
      toast('Welcome back!', 'success');
      navigate(data.role === 'admin' ? '/admin' : '/', { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-fade-rise">
        <div className="rounded-2xl border border-[#E4EEEC] bg-white p-8 shadow-sm">
          <div className="mb-6 flex flex-col items-center text-center">
            <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#028090] text-white">
              <MapPin size={26} />
            </span>
            <h1 className="text-2xl font-bold text-[#1B2A2E]">Welcome back</h1>
            <p className="mt-1 text-sm text-[#5C6B6E]">Log in to CampusFix</p>
          </div>

          {error && (
            <div className="mb-4 rounded-xl bg-[#FDEDE4] px-4 py-3 text-sm text-[#E8734A]">
              {error}
            </div>
          )}

          <form onSubmit={handle} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-[#1B2A2E]">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@kiet.edu"
                className="w-full rounded-xl border border-[#E4EEEC] bg-[#F4FAF9] px-4 py-2.5 text-[#1B2A2E] outline-none transition-colors focus:border-[#028090]"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#1B2A2E]">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-[#E4EEEC] bg-[#F4FAF9] px-4 py-2.5 text-[#1B2A2E] outline-none transition-colors focus:border-[#028090]"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-press flex w-full items-center justify-center gap-2 rounded-xl bg-[#028090] px-4 py-2.5 font-semibold text-white transition-colors hover:bg-[#01707f] disabled:opacity-60"
            >
              <LogIn size={18} />
              {loading ? 'Logging in…' : 'Log in'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[#5C6B6E]">
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-[#028090] hover:underline">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
