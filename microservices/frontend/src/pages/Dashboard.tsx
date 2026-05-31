import { useEffect, useState } from 'react';
import { getReportSummary, getTopStudents } from '../api';
import type { ReportSummary, TopStudent } from '../types';

export default function Dashboard() {
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [top,     setTop]     = useState<TopStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    Promise.all([getReportSummary(), getTopStudents()])
      .then(([s, t]) => { setSummary(s); setTop(t); })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading dashboard…</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Cloudboosta Academy — AWS Cloud DevOps Training Overview</p>
        </div>
      </div>

      {error && <div className="error-msg">{error}</div>}

      {summary && (
        <>
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-label">Total Students</div>
              <div className="stat-value">{summary.totalStudents}</div>
              <div className="stat-sub">{summary.activeStudents} active</div>
            </div>
            <div className="stat-card accent">
              <div className="stat-label">Courses</div>
              <div className="stat-value">{summary.totalCourses}</div>
              <div className="stat-sub">All active</div>
            </div>
            <div className="stat-card green">
              <div className="stat-label">Enrolments</div>
              <div className="stat-value">{summary.totalEnrolments}</div>
              <div className="stat-sub">Active records</div>
            </div>
            <div className="stat-card amber">
              <div className="stat-label">Avg GPA</div>
              <div className="stat-value">{summary.averageGpa}</div>
              <div className="stat-sub">Out of 4.0</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Grade Distribution */}
            <div className="card">
              <div className="card-body">
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)', marginBottom: 16 }}>
                  Grade Distribution
                </h3>
                {(Object.entries(summary.gradeDistribution) as [string, number][]).map(([grade, count]) => {
                  const pct     = Math.round((count / summary.totalEnrolments) * 100);
                  const colours: Record<string, string> = { A: 'var(--success)', B: 'var(--accent)', C: 'var(--warning)' };
                  return (
                    <div key={grade} style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontWeight: 700 }}>Grade {grade}</span>
                        <span style={{ color: 'var(--muted)' }}>{count} ({pct}%)</span>
                      </div>
                      <div className="gpa-bar-wrap">
                        <div className="gpa-bar" style={{ width: `${pct}%`, background: colours[grade] }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Enrolments per Course */}
            <div className="card">
              <div className="card-body">
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)', marginBottom: 16 }}>
                  Enrolments per Course
                </h3>
                <div className="course-bar-list">
                  {summary.enrolmentsPerCourse.map(({ code, count }) => {
                    const max = summary.enrolmentsPerCourse[0].count;
                    const pct = Math.round((count / max) * 100);
                    return (
                      <div key={code} className="course-bar-row">
                        <span className="course-bar-label">{code}</span>
                        <div className="gpa-bar-wrap" style={{ flex: 1 }}>
                          <div className="course-bar-fill" style={{ width: `${pct}%` }}>
                            <span>{count}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {top.length > 0 && (
        <div className="card" style={{ marginTop: 20 }}>
          <div className="card-body">
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)', marginBottom: 16 }}>
              Top 5 Students by GPA
            </h3>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr><th>#</th><th>Name</th><th>Programme</th><th>Courses</th><th>GPA</th></tr>
                </thead>
                <tbody>
                  {top.map((s, i) => (
                    <tr key={s.id}>
                      <td>
                        <span className={`rank-badge rank-${i < 3 ? i + 1 : 'n'}`}>{i + 1}</span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{s.name}</td>
                      <td><span className="badge badge-navy">{s.programme}</span></td>
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
    </div>
  );
}
