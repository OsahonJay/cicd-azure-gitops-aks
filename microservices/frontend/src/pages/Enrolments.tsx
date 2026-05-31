import { useEffect, useState } from 'react';
import { getEnrolments, getStudents, getCourses, createEnrolment, dropEnrolment } from '../api';
import type { Enrolment, Student, Course } from '../types';

const GRADES = ['A', 'B', 'C', 'D', 'Pending'];

interface EnrolForm {
  studentId: string;
  courseId:  string;
  grade:     string;
}

export default function Enrolments() {
  const [enrolments, setEnrolments] = useState<Enrolment[]>([]);
  const [students,   setStudents]   = useState<Student[]>([]);
  const [courses,    setCourses]    = useState<Course[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [modal,      setModal]      = useState(false);
  const [form,       setForm]       = useState<EnrolForm>({ studentId: '', courseId: '', grade: 'Pending' });
  const [saving,     setSaving]     = useState(false);
  const [filter,     setFilter]     = useState('');

  useEffect(() => {
    Promise.all([getEnrolments(), getStudents(), getCourses()])
      .then(([e, s, c]) => { setEnrolments(e); setStudents(s); setCourses(c); })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const studentName = (id: string) => students.find(s => s.id === id)?.name ?? id;
  const courseName  = (id: string) => courses.find(c => c.id === id)?.name  ?? id;

  const openModal  = () => {
    setForm({ studentId: students[0]?.id ?? '', courseId: courses[0]?.id ?? '', grade: 'Pending' });
    setError('');
    setModal(true);
  };
  const closeModal = () => { setModal(false); setError(''); };

  const handleEnrol = async () => {
    if (!form.studentId || !form.courseId) { setError('Student and course are required'); return; }
    setSaving(true);
    try {
      const created = await createEnrolment(form);
      setEnrolments(prev => [...prev, created]);
      closeModal();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDrop = async (id: string) => {
    if (!window.confirm('Drop this enrolment?')) return;
    try {
      await dropEnrolment(id);
      setEnrolments(prev => prev.map(e => e.id === id ? { ...e, status: 'Dropped' } : e));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const filtered = filter
    ? enrolments.filter(e =>
        studentName(e.studentId).toLowerCase().includes(filter.toLowerCase()) ||
        courseName(e.courseId).toLowerCase().includes(filter.toLowerCase())
      )
    : enrolments;

  if (loading) return <div className="loading">Loading enrolments…</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Enrolments</h1>
          <p>{enrolments.filter(e => e.status === 'Active').length} active enrolments</p>
        </div>
        <button className="btn btn-primary" onClick={openModal}>+ Enrol Student</button>
      </div>

      {error && !modal && <div className="error-msg">{error}</div>}

      <div className="toolbar">
        <input
          style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, width: 260 }}
          placeholder="Search by student or course…"
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
        <span style={{ color: 'var(--muted)', fontSize: 13 }}>{filtered.length} records</span>
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>ID</th><th>Student</th><th>Course</th>
                <th>Enrolled</th><th>Grade</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => (
                <tr key={e.id}>
                  <td style={{ fontFamily: 'monospace', color: 'var(--muted)', fontSize: 12 }}>{e.id}</td>
                  <td style={{ fontWeight: 600 }}>{studentName(e.studentId)}</td>
                  <td>{courseName(e.courseId)}</td>
                  <td style={{ color: 'var(--muted)', fontSize: 12 }}>{e.enrolledAt}</td>
                  <td><span className={`grade-${e.grade}`}>{e.grade}</span></td>
                  <td>
                    <span className={`badge ${e.status === 'Active' ? 'badge-green' : 'badge-red'}`}>
                      {e.status}
                    </span>
                  </td>
                  <td>
                    {e.status === 'Active' && (
                      <button className="btn btn-danger btn-sm" onClick={() => handleDrop(e.id)}>
                        Drop
                      </button>
                    )}
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
            <h2>Enrol Student</h2>
            {error && <div className="error-msg">{error}</div>}

            <div className="form-group">
              <label>Student</label>
              <select value={form.studentId} onChange={e => setForm(f => ({ ...f, studentId: e.target.value }))}>
                {students.filter(s => s.status === 'Active').map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.id})</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Course</label>
              <select value={form.courseId} onChange={e => setForm(f => ({ ...f, courseId: e.target.value }))}>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Initial Grade</label>
              <select value={form.grade} onChange={e => setForm(f => ({ ...f, grade: e.target.value }))}>
                {GRADES.map(g => <option key={g}>{g}</option>)}
              </select>
            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={closeModal}>Cancel</button>
              <button className="btn btn-success" onClick={handleEnrol} disabled={saving}>
                {saving ? 'Enrolling…' : 'Confirm Enrolment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
