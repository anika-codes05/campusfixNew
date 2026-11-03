import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { register } from '../api/auth';

export default function Register() {
  const { setAuth } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handle = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      const data = await register({ name, rollNumber, password });
      setAuth(data);
      toast('Account created — welcome to CampusFix!', 'success');
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
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
            <h1 className="text-2xl font-bold text-[#1B2A2E]">Join CampusFix</h1>
            <p className="mt-1 text-sm text-[#5C6B6E]">Make campus maintenance visible</p>
          </div>

          {error && (
            <div className="mb-4 rounded-xl bg-[#FDEDE4] px-4 py-3 text-sm text-[#E8734A]">
              {error}
            </div>
          )}

          <form onSubmit={handle} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-[#1B2A2E]">Full name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Riya Sharma"
                className="w-full rounded-xl border border-[#E4EEEC] bg-[#F4FAF9] px-4 py-2.5 text-[#1B2A2E] outline-none transition-colors focus:border-[#028090]"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#1B2A2E]">Roll number</label>
              <input
                type="text"
                required
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value.toUpperCase())}
                placeholder="Your roll / registration number"
                className="w-full rounded-xl border border-[#E4EEEC] bg-[#F4FAF9] px-4 py-2.5 text-[#1B2A2E] outline-none transition-colors focus:border-[#028090]"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#1B2A2E]">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full rounded-xl border border-[#E4EEEC] bg-[#F4FAF9] px-4 py-2.5 text-[#1B2A2E] outline-none transition-colors focus:border-[#028090]"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-press flex w-full items-center justify-center gap-2 rounded-xl bg-[#028090] px-4 py-2.5 font-semibold text-white transition-colors hover:bg-[#01707f] disabled:opacity-60"
            >
              <UserPlus size={18} />
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[#5C6B6E]">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-[#028090] hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}