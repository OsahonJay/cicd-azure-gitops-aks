import { useEffect, useState } from 'react';
import { getStudents, createStudent, updateStudent, deleteStudent } from '../api';
import type { Student } from '../types';

const PROGRAMMES = ['Cloud Engineering', 'DevOps Engineering', 'Cloud Security'];
const YEARS      = [1, 2, 3, 4];
const STATUSES   = ['Active', 'Inactive'];

type StudentForm = Omit<Student, 'id'>;
const blank: StudentForm = { name: '', email: '', year: 1, programme: 'Cloud Engineering', status: 'Active' };

export default function Students() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [modal,    setModal]    = useState(false);
  const [editing,  setEditing]  = useState<Student | null>(null);
  const [form,     setForm]     = useState<StudentForm>(blank);
  const [saving,   setSaving]   = useState(false);

  useEffect(() => {
    getStudents()
      .then(setStudents)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const openCreate = () => { setEditing(null); setForm(blank); setError(''); setModal(true); };
  const openEdit   = (s: Student) => { setEditing(s); setForm({ name: s.name, email: s.email, year: s.year, programme: s.programme, status: s.status }); setError(''); setModal(true); };
  const closeModal = () => { setModal(false); setError(''); };

  const handleSave = async () => {
    if (!form.name || !form.email) { setError('Name and email are required'); return; }
    setSaving(true);
    try {
      if (editing) {
        const updated = await updateStudent(editing.id, form);
        setStudents(prev => prev.map(s => s.id === editing.id ? updated : s));
      } else {
        const created = await createStudent(form);
        setStudents(prev => [...prev, created]);
      }
      closeModal();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this student?')) return;
    try {
      await deleteStudent(id);
      setStudents(prev => prev.filter(s => s.id !== id));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  if (loading) return <div className="loading">Loading students…</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Students</h1>
          <p>{students.length} registered students</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Add Student</button>
      </div>

      {error && !modal && <div className="error-msg">{error}</div>}

      <div className="card">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>ID</th><th>Name</th><th>Email</th>
                <th>Year</th><th>Programme</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map(s => (
                <tr key={s.id}>
                  <td style={{ fontFamily: 'monospace', color: 'var(--muted)', fontSize: 12 }}>{s.id}</td>
                  <td style={{ fontWeight: 600 }}>{s.name}</td>
                  <td style={{ color: 'var(--muted)' }}>{s.email}</td>
                  <td>Year {s.year}</td>
                  <td><span className="badge badge-blue">{s.programme}</span></td>
                  <td>
                    <span className={`badge ${s.status === 'Active' ? 'badge-green' : 'badge-red'}`}>
                      {s.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(s)}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{editing ? 'Edit Student' : 'Add Student'}</h2>
            {error && <div className="error-msg">{error}</div>}

            <div className="form-group">
              <label>Full Name</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Wisdom Uwaga" />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="e.g. name@cloudboosta.ac" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label>Year</label>
                <select value={form.year} onChange={e => setForm(f => ({ ...f, year: Number(e.target.value) }))}>
                  {YEARS.map(y => <option key={y}>{y}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  {STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Programme</label>
              <select value={form.programme} onChange={e => setForm(f => ({ ...f, programme: e.target.value }))}>
                {PROGRAMMES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={closeModal}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Student'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
