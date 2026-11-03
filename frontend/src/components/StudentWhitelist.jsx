import { useState } from 'react';
import { Upload, ListChecks, Trash2 } from 'lucide-react';
import { getStudents, uploadStudents, deleteStudent } from '../api/admin';
import { useToast } from '../context/ToastContext';

// Admin tool: upload a CSV/TXT of valid roll numbers. Only these can register.
export default function StudentWhitelist() {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [students, setStudents] = useState([]);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      setStudents(await getStudents());
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const toggle = () => {
    if (!open) load();
    setOpen((o) => !o);
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const text = await file.text();
      const rollNumbers = text.split(/[\s,;]+/).filter(Boolean);
      const res = await uploadStudents(rollNumbers);
      toast(`${res.added} new roll numbers added (${res.received} read).`, 'success');
      load();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    try {
      await deleteStudent(id);
      setStudents((list) => list.filter((s) => s._id !== id));
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  return (
    <div className="mt-10">
      <button
        onClick={toggle}
        className="btn-press inline-flex items-center gap-2 rounded-xl border border-[#E4EEEC] bg-white px-4 py-2.5 font-semibold text-[#1B2A2E] hover:text-[#028090]"
      >
        <ListChecks size={18} /> {open ? 'Hide allowed students' : 'Allowed students (roll numbers)'}
      </button>

      {open && (
        <div className="mt-4 rounded-2xl border border-[#E4EEEC] bg-white p-4">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <label className="btn-press inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#028090] px-4 py-2 text-sm font-semibold text-white hover:bg-[#01707f]">
              <Upload size={16} /> {busy ? 'Uploading…' : 'Upload CSV / TXT'}
              <input type="file" accept=".csv,.txt" className="hidden" onChange={handleFile} disabled={busy} />
            </label>
            <span className="text-sm text-[#5C6B6E]">
              One roll number per line (or comma-separated). {students.length} on the list.
            </span>
          </div>

          <div className="max-h-72 overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#E4EEEC] text-xs uppercase text-[#5C6B6E]">
                  <th className="px-3 py-2">Roll number</th>
                  <th className="px-3 py-2">Registered</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s._id} className="border-b border-[#E4EEEC]">
                    <td className="px-3 py-2 font-medium text-[#1B2A2E]">{s.rollNumber}</td>
                    <td className="px-3 py-2 text-[#5C6B6E]">{s.registered ? 'Yes' : 'No'}</td>
                    <td className="px-3 py-2 text-right">
                      <button onClick={() => remove(s._id)} className="text-[#E8734A] hover:opacity-70" aria-label="Remove">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {students.length === 0 && (
                  <tr><td colSpan={3} className="px-3 py-6 text-center text-[#5C6B6E]">No roll numbers yet. Upload a file to allow students to register.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
