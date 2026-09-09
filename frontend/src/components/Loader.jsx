export default function Loader({ label = 'Loading…' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#E4EEEC] border-t-[#028090]" />
      <p className="text-sm text-[#5C6B6E]">{label}</p>
    </div>
  );
}
