import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#E4F2F2]">
        <MapPin size={30} className="text-[#028090]" />
      </div>
      <h1 className="text-3xl font-bold text-[#1B2A2E]">404 — lost on campus</h1>
      <p className="mt-2 max-w-sm text-[#5C6B6E]">This page doesn't exist. Let's get you back somewhere useful.</p>
      <Link to="/" className="btn-press mt-6 rounded-xl bg-[#028090] px-5 py-2.5 font-semibold text-white hover:bg-[#01707f]">
        Back to feed
      </Link>
    </div>
  );
}