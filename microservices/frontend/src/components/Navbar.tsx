import { NavLink } from 'react-router-dom';

interface NavItem {
  to:    string;
  icon:  string;
  label: string;
}

const links: NavItem[] = [
  { to: '/dashboard',  icon: '📊', label: 'Dashboard'  },
  { to: '/students',   icon: '👥', label: 'Students'   },
  { to: '/courses',    icon: '📚', label: 'Courses'    },
  { to: '/enrolments', icon: '📋', label: 'Enrolments' },
  { to: '/reports',    icon: '📈', label: 'Reports'    },
];

export default function Navbar() {
  return (
    <nav className="sidebar">
      <div className="sidebar-brand">
        <h2>Cloudboosta Academy</h2>
        <span>Student Management</span>
      </div>

      <div className="sidebar-nav">
        {links.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            <span className="nav-icon">{icon}</span>
            {label}
          </NavLink>
        ))}
      </div>

      <div className="sidebar-footer">
        <div>Group 2 &bull; May 2026</div>
        <div style={{ marginTop: 2 }}>CI/CD &bull; AKS &bull; GitOps</div>
      </div>
    </nav>
  );
}
