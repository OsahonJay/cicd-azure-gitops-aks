import { useEffect, useState } from 'react';
import { getCourses, createCourse, updateCourse, deleteCourse } from '../api';
import type { Course } from '../types';

type CourseForm = Omit<Course, 'id' | 'enrolledCount'>;
const blank: CourseForm = { code: '', name: '', instructor: '', credits: 3, schedule: '', status: 'Active' };

export default function Courses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [modal,   setModal]   = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [form,    setForm]    = useState<CourseForm>(blank);
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    getCourses()
      .then(setCourses)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const openCreate = () => { setEditing(null); setForm(blank); setError(''); setModal(true); };
  const openEdit   = (c: Course) => { setEditing(c); setForm({ code: c.code, name: c.name, instructor: c.instructor, credits: c.credits, schedule: c.schedule, status: c.status }); setError(''); setModal(true); };
  const closeModal = () => { setModal(false); setError(''); };

  const handleSave = async () => {
    if (!form.code || !form.name) { setError('Code and name are required'); return; }
    setSaving(true);
    try {
      if (editing) {
        const updated = await updateCourse(editing.id, form);
        setCourses(prev => prev.map(c => c.id === editing.id ? updated : c));
      } else {
        const created = await createCourse(form);
        setCourses(prev => [...prev, { ...created, enrolledCount: 0 }]);
      }
      closeModal();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this course?')) return;
    try {
      await deleteCourse(id);
      setCourses(prev => prev.filter(c => c.id !== id));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  if (loading) return <div className="loading">Loading courses…</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Courses</h1>
          <p>{courses.length} courses in the catalogue</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Add Course</button>
      </div>

      {error && !modal && <div className="error-msg">{error}</div>}

      <div className="card">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Code</th><th>Name</th><th>Instructor</th>
                <th>Credits</th><th>Schedule</th><th>Enrolled</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {courses.map(c => (
                <tr key={c.id}>
                  <td><span className="badge badge-navy" style={{ fontFamily: 'monospace' }}>{c.code}</span></td>
                  <td style={{ fontWeight: 600 }}>{c.name}</td>
                  <td style={{ color: 'var(--muted)' }}>{c.instructor}</td>
                  <td>{c.credits}</td>
                  <td style={{ color: 'var(--muted)', fontSize: 12 }}>{c.schedule}</td>
                  <td><span className="badge badge-blue">{c.enrolledCount ?? 0} students</span></td>
                  <td>
                    <span className={`badge ${c.status === 'Active' ? 'badge-green' : 'badge-grey'}`}>
                      {c.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(c)}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c.id)}>Delete</button>
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
            <h2>{editing ? 'Edit Course' : 'Add Course'}</h2>
            {error && <div className="error-msg">{error}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label>Course Code</label>
                <input value={form.code} disabled={!!editing}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="e.g. CLO101" />
              </div>
              <div className="form-group">
                <label>Credits</label>
                <select value={form.credits} onChange={e => setForm(f => ({ ...f, credits: Number(e.target.value) }))}>
                  {[1, 2, 3, 4, 5].map(n => <option key={n}>{n}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Course Name</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Cloud Engineering Fundamentals" />
            </div>
            <div className="form-group">
              <label>Instructor</label>
              <input value={form.instructor} onChange={e => setForm(f => ({ ...f, instructor: e.target.value }))} placeholder="e.g. Dr. Afolabi" />
            </div>
            <div className="form-group">
              <label>Schedule</label>
              <input value={form.schedule} onChange={e => setForm(f => ({ ...f, schedule: e.target.value }))} placeholder="e.g. Mon/Wed 09:00" />
            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={closeModal}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Course'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
