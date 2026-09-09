import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Upload, Send, CheckCircle2, GitMerge, ImageOff,
} from 'lucide-react';
import IssueMap from '../components/IssueMap';
import Loader from '../components/Loader';
import { CATEGORIES, DEFAULT_CENTER, AFFECTED_PRESETS } from '../constants';
import { checkDuplicate, createIssue } from '../api/issues';
import { useToast } from '../context/ToastContext';

export default function ReportIssue() {
  const toast = useToast();
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [pin, setPin] = useState(null);
  const [blockName, setBlockName] = useState('');
  const [floorRoom, setFloorRoom] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [affected, setAffected] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(null);

  const [phase, setPhase] = useState('form'); // form | duplicates | submitting | done
  const [duplicates, setDuplicates] = useState([]);
  const [submittedIssue, setSubmittedIssue] = useState(null);

  const validate = () => {
    if (!pin) return 'Tap the map to drop a pin first.';
    if (!blockName.trim()) return 'Block / building name is required.';
    if (!title.trim()) return 'A short title is required.';
    if (!description.trim()) return 'A description is required.';
    if (!category) return 'Pick a category.';
    if (!affected) return 'Select how many people this affects.';
    return '';
  };

  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast('Only image files are allowed.', 'error');
      return;
    }
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  };

  const submit = async () => {
    const err = validate();
    if (err) {
      toast(err, 'error');
      return;
    }
    setPhase('submitting');
    try {
      const dup = await checkDuplicate({ lat: pin[0], lng: pin[1], category });
      if (dup.hasDuplicates) {
        setDuplicates(dup.matches);
        setPhase('duplicates');
        return;
      }
      await actuallyCreate();
    } catch (e) {
      toast(e.message || 'Duplicate check failed.', 'error');
      setPhase('form');
    }
  };

  const actuallyCreate = async () => {
    const fd = new FormData();
    fd.append('title', title);
    fd.append('description', description);
    fd.append('category', category);
    fd.append('affectedCount', affected);
    fd.append('lat', pin[0]);
    fd.append('lng', pin[1]);
    fd.append('blockName', blockName);
    if (floorRoom) fd.append('floorRoom', floorRoom);
    if (photo) fd.append('photo', photo);
    try {
      const res = await createIssue(fd);
      setSubmittedIssue(res.issue || null);
      setPhase('done');
      toast('Issue reported — thank you!', 'success');
    } catch (e) {
      toast(e.message || 'Failed to submit issue.', 'error');
      setPhase('form');
    }
  };

  const joinExisting = async (issueId) => {
    setPhase('submitting');
    const fd = new FormData();
    fd.append('joinExistingId', issueId);
    try {
      const res = await createIssue(fd);
      setSubmittedIssue(res.issue || null);
      setPhase('done');
      toast('You joined an existing report — the upvote count went up.', 'success');
    } catch (e) {
      toast(e.message || 'Failed to join issue.', 'error');
      setPhase('duplicates');
    }
  };

  const resetForm = () => {
    setPhase('form');
    setPin(null);
    setBlockName('');
    setFloorRoom('');
    setTitle('');
    setDescription('');
    setCategory('');
    setAffected(null);
    setPhoto(null);
    setPreview(null);
    setDuplicates([]);
    setSubmittedIssue(null);
  };

  const inputCls = "w-full rounded-xl border border-[#E4EEEC] bg-white px-4 py-2.5 text-[#1B2A2E] outline-none transition-colors focus:border-[#028090]";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-[#5C6B6E] hover:text-[#028090]">
          <ArrowLeft size={16} /> Back to feed
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-[#1B2A2E]">Report an issue</h1>
        <p className="text-sm text-[#5C6B6E]">Pin the exact spot, describe it, add a photo. We'll check for duplicates automatically.</p>
      </div>

      {phase === 'form' && (
        <div className="space-y-5 rounded-2xl border border-[#E4EEEC] bg-white p-6">
          <div>
            <label className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-[#1B2A2E]">
              <MapPin size={16} className="text-[#028090]" /> Location <span className="font-normal text-[#5C6B6E]">— tap the map to drop a pin</span>
            </label>
            <div className={`h-72 overflow-hidden rounded-2xl border ${pin ? 'border-[#00A896]' : 'border-[#E4EEEC]'}`}>
              <IssueMap issues={[]} onPick={(p) => setPin(p)} height="288px" />
            </div>
            {pin ? (
              <p className="mt-2 inline-flex items-center gap-1 rounded-lg bg-[#E1F7EF] px-2.5 py-1 text-xs font-medium text-[#02C39A]">
                <MapPin size={13} /> Pin set at {pin[0].toFixed(5)}, {pin[1].toFixed(5)}
              </p>
            ) : (
              <p className="mt-2 text-xs text-[#5C6B6E]">Default view is centered on KIET, Ghaziabad.</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-[#1B2A2E]">Block / building *</label>
              <input value={blockName} onChange={(e) => setBlockName(e.target.value)} placeholder="e.g. Block C" className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-[#1B2A2E]">Floor / room <span className="font-normal text-[#5C6B6E]">(optional)</span></label>
              <input value={floorRoom} onChange={(e) => setFloorRoom(e.target.value)} placeholder="e.g. Room 204" className={inputCls} />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-[#1B2A2E]">Short title *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder="e.g. Broken AC in Block C, Room 204" className={inputCls} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-[#1B2A2E]">Description *</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} maxLength={4000} placeholder="What's wrong? When did you notice it? How severe is it?" className={`${inputCls} resize-none`} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-[#1B2A2E]">Category *</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
                <option value="">Select…</option>
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-[#1B2A2E]">Photo <span className="font-normal text-[#5C6B6E]">(optional)</span></label>
              <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
              {preview ? (
                <div className="relative overflow-hidden rounded-xl border border-[#E4EEEC]">
                  <img src={preview} alt="preview" className="h-24 w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => { setPhoto(null); setPreview(null); fileRef.current.value = ''; }}
                    className="absolute right-2 top-2 rounded-lg bg-white/90 p-1 text-[#E8734A] hover:bg-white"
                  >
                    <ImageOff size={16} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex h-24 w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-[#B9D6D2] text-[#5C6B6E] transition-colors hover:border-[#028090] hover:text-[#028090]"
                >
                  <Upload size={20} />
                  <span className="text-xs">Upload photo</span>
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-[#1B2A2E]">How many people does this affect? *</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {AFFECTED_PRESETS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setAffected(p.value)}
                  className={`btn-press rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                    affected === p.value
                      ? 'border-[#028090] bg-[#E4F2F2] text-[#028090]'
                      : 'border-[#E4EEEC] bg-white text-[#5C6B6E] hover:border-[#028090] hover:text-[#028090]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-[#5C6B6E]">Helps us set the starting priority — issues affecting more people get flagged higher.</p>
          </div>

          <button onClick={submit} className="btn-press inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#028090] px-4 py-3 font-semibold text-white transition-colors hover:bg-[#01707f]">
            <Send size={18} /> Check & submit
          </button>
        </div>
      )}

      {phase === 'duplicates' && (
        <div className="rounded-2xl border border-[#FCF2DA] bg-[#FCF2DA]/40 p-6">
          <div className="mb-4 flex items-start gap-3">
            <GitMerge size={26} className="mt-0.5 text-[#E8AC3C]" />
            <div>
              <h2 className="text-lg font-bold text-[#1B2A2E]">Is this the same issue?</h2>
              <p className="text-sm text-[#5C6B6E]">
                Similar reports already exist within 50m of your pin. Joining one of them bumps its upvote count so it gets fixed faster — instead of filing a separate report.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {duplicates.map((d) => (
              <div key={d._id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E4EEEC] bg-white p-4">
                <div>
                  <p className="font-semibold text-[#1B2A2E]">{d.title}</p>
                  <p className="text-xs text-[#5C6B6E]">{d.blockName} · {CATEGORIES.find((c) => c.value === d.category)?.label || d.category}</p>
                  <p className="text-xs font-semibold text-[#028090]">▲ {d.upvoteCount} upvotes</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => joinExisting(d._id)} className="btn-press rounded-xl bg-[#028090] px-3 py-2 text-sm font-semibold text-white hover:bg-[#01707f]">
                    Yes, join it
                  </button>
                  <Link to={`/issues/${d._id}`} className="btn-press rounded-xl border border-[#E4EEEC] px-3 py-2 text-sm font-medium text-[#5C6B6E] hover:text-[#028090]">
                    View
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button onClick={actuallyCreate} className="btn-press rounded-xl border-2 border-[#028090] bg-white px-4 py-2.5 font-semibold text-[#028090] hover:bg-[#E4F2F2]">
              No — submit mine as a new report
            </button>
            <button onClick={() => setPhase('form')} className="btn-press rounded-xl border border-[#E4EEEC] bg-white px-4 py-2.5 text-sm text-[#5C6B6E] hover:text-[#1B2A2E]">
              Back
            </button>
          </div>
        </div>
      )}

      {phase === 'submitting' && <Loader label="Checking for duplicates…" />}

      {phase === 'done' && (
        <div className="rounded-2xl border border-[#E4EEEC] bg-white p-10 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#E1F7EF]">
            <CheckCircle2 size={32} className="text-[#02C39A]" />
          </div>
          <h2 className="text-2xl font-bold text-[#1B2A2E]">Thank you for reporting!</h2>
          {submittedIssue && (
            <p className="mt-2 text-[#5C6B6E]">
              Your issue <Link to={`/issues/${submittedIssue._id}`} className="font-semibold text-[#028090] hover:underline">“{submittedIssue.title}”</Link>{' '}
              has been logged{submittedIssue.status === 'reported' ? ' and is now tracked' : ''}.
            </p>
          )}
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/" className="btn-press rounded-xl border border-[#E4EEEC] bg-white px-4 py-2.5 font-semibold text-[#5C6B6E] hover:text-[#028090]">
              Back to feed
            </Link>
            <button onClick={resetForm} className="btn-press rounded-xl bg-[#028090] px-4 py-2.5 font-semibold text-white hover:bg-[#01707f]">
              Report another issue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}