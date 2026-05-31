import { useEffect, useState } from 'react';
import { getReportSummary, getTopStudents, getStudentReport, getCourseReport, getStudents, getCourses } from '../api';
import type { ReportSummary, TopStudent, StudentReport, CourseReport, Student, Course } from '../types';

export default function Reports() {
  const [summary,  setSummary]  = useState<ReportSummary | null>(null);
  const [top,      setTop]      = useState<TopStudent[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [courses,  setCourses]  = useState<Course[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  const [studentReport, setStudentReport] = useState<StudentReport | null>(null);
  const [courseReport,  setCourseReport]  = useState<CourseReport | null>(null);
  const [selStudent,    setSelStudent]    = useState('');
  const [selCourse,     setSelCourse]     = useState('');
  const [drillLoading,  setDrillLoading]  = useState(false);

  useEffect(() => {
    Promise.all([getReportSummary(), getTopStudents(), getStudents(), getCourses()])
      .then(([s, t, stu, cou]) => { setSummary(s); setTop(t); setStudents(stu); setCourses(cou); })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const loadStudentReport = async (id: string) => {
    if (!id) return;
    setDrillLoading(true);
    setCourseReport(null);
    try { setStudentReport(await getStudentReport(id)); }
    catch (e) { setError((e as Error).message); }
    finally   { setDrillLoading(false); }
  };

  const loadCourseReport = async (id: string) => {
    if (!id) return;
    setDrillLoading(true);
    setStudentReport(null);
    try { setCourseReport(await getCourseReport(id)); }
    catch (e) { setError((e as Error).message); }
    finally   { setDrillLoading(false); }
  };

  if (loading) return <div className="loading">Loading reports…</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Reports & Analytics</h1>
          <p>Academic performance overview — Cloudboosta Academy</p>
        </div>
      </div>

      {error && <div className="error-msg">{error}</div>}

      {summary && (
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-label">Total Students</div>
            <div className="stat-value">{summary.totalStudents}</div>
            <div className="stat-sub">{summary.activeStudents} active</div>
          </div>
          <div className="stat-card accent">
            <div className="stat-label">Total Enrolments</div>
            <div className="stat-value">{summary.totalEnrolments}</div>
          </div>
          <div className="stat-card green">
            <div className="stat-label">Avg GPA</div>
            <div className="stat-value">{summary.averageGpa}</div>
            <div className="stat-sub">Out of 4.0</div>
          </div>
          <div className="stat-card amber">
            <div className="stat-label">Grade A Students</div>
            <div className="stat-value">{summary.gradeDistribution.A}</div>
            <div className="stat-sub">Distinctions</div>
          </div>
        </div>
      )}

      {top.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-body">
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)', marginBottom: 16 }}>Top 5 Students</h3>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr><th>#</th><th>Name</th><th>Programme</th><th>Courses</th><th>GPA</th></tr>
                </thead>
                <tbody>
                  {top.map((s, i) => (
                    <tr key={s.id}>
                      <td><span className={`rank-badge rank-${i < 3 ? i + 1 : 'n'}`}>{i + 1}</span></td>
                      <td style={{ fontWeight: 600 }}>{s.name}</td>
                      <td><span className="badge badge-blue">{s.programme}</span></td>
                      <td>{s.courseCount}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <strong>{s.gpa.toFixed(1)}</strong>
                          <div className="gpa-bar-wrap" style={{ width: 80 }}>
                            <div className="gpa-bar" style={{ width: `${(s.gpa / 4) * 100}%` }} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Student drill-down */}
        <div className="card">
          <div className="card-body">
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)', marginBottom: 12 }}>Student Performance</h3>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <select
                style={{ flex: 1, padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13 }}
                value={selStudent}
                onChange={e => { setSelStudent(e.target.value); setStudentReport(null); }}
              >
                <option value="">Select student…</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <button className="btn btn-primary" onClick={() => loadStudentReport(selStudent)} disabled={!selStudent || drillLoading}>
                {drillLoading ? '…' : 'View'}
              </button>
            </div>

            {studentReport && (
              <div>
                <div style={{ marginBottom: 12 }}>
                  <strong style={{ fontSize: 15 }}>{studentReport.name}</strong>
                  <span className="badge badge-blue" style={{ marginLeft: 8 }}>{studentReport.programme}</span>
                  <span style={{ marginLeft: 8, color: 'var(--muted)', fontSize: 13 }}>
                    GPA: <strong>{studentReport.gpa.toFixed(2)}</strong>
                  </span>
                </div>
                <table>
                  <thead><tr><th>Course</th><th>Grade</th><th>GPA Pts</th></tr></thead>
                  <tbody>
                    {studentReport.courses.map(c => (
                      <tr key={c.courseId}>
                        <td>{c.courseName}</td>
                        <td><span className={`grade-${c.grade}`}>{c.grade}</span></td>
                        <td>{c.gpaPoints.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Course drill-down */}
        <div className="card">
          <div className="card-body">
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)', marginBottom: 12 }}>Course Analytics</h3>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <select
                style={{ flex: 1, padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13 }}
                value={selCourse}
                onChange={e => { setSelCourse(e.target.value); setCourseReport(null); }}
              >
                <option value="">Select course…</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
              </select>
              <button className="btn btn-primary" onClick={() => loadCourseReport(selCourse)} disabled={!selCourse || drillLoading}>
                {drillLoading ? '…' : 'View'}
              </button>
            </div>

            {courseReport && (
              <div>
                <div style={{ marginBottom: 12 }}>
                  <strong style={{ fontSize: 15 }}>{courseReport.name}</strong>
                  <div style={{ marginTop: 6, display: 'flex', gap: 16, color: 'var(--muted)', fontSize: 13 }}>
                    <span>Enrolled: <strong style={{ color: 'var(--text)' }}>{courseReport.enrolledCount}</strong></span>
                    <span>Avg GPA: <strong style={{ color: 'var(--text)' }}>{courseReport.averageGpa.toFixed(2)}</strong></span>
                    <span>Pass rate: <strong style={{ color: 'var(--success)' }}>{courseReport.passRate}%</strong></span>
                  </div>
                </div>
                <table>
                  <thead><tr><th>Grade</th><th>Count</th><th>Share</th></tr></thead>
                  <tbody>
                    {Object.entries(courseReport.gradeDistribution).map(([g, n]) => (
                      <tr key={g}>
                        <td><span className={`grade-${g}`}>{g}</span></td>
                        <td>{n}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div className="gpa-bar-wrap" style={{ width: 80 }}>
                              <div className="gpa-bar" style={{ width: `${courseReport.enrolledCount ? (n / courseReport.enrolledCount) * 100 : 0}%` }} />
                            </div>
                            <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                              {courseReport.enrolledCount ? Math.round((n / courseReport.enrolledCount) * 100) : 0}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
