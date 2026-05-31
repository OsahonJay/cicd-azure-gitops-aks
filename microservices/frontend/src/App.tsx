import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar     from './components/Navbar';
import Dashboard  from './pages/Dashboard';
import Students   from './pages/Students';
import Courses    from './pages/Courses';
import Enrolments from './pages/Enrolments';
import Reports    from './pages/Reports';

export default function App() {
  return (
    <div className="app-shell">
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/"            element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard"   element={<Dashboard />} />
          <Route path="/students"    element={<Students />} />
          <Route path="/courses"     element={<Courses />} />
          <Route path="/enrolments"  element={<Enrolments />} />
          <Route path="/reports"     element={<Reports />} />
        </Routes>
      </main>
    </div>
  );
}
