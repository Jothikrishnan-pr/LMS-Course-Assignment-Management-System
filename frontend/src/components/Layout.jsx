import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const role = user.role;

  // Close the mobile drawer on navigation / Escape; lock body scroll while open.
  useEffect(() => { setOpen(false); window.scrollTo(0, 0); }, [pathname]);
  useEffect(() => {
    document.body.classList.toggle('no-scroll', open);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); document.body.classList.remove('no-scroll'); };
  }, [open]);

  const main = [['/', 'Dashboard'], ['/courses', 'Available Courses'], ['/my-courses', 'My Courses'], ['/assignments', 'Assignments'], ['/submissions', 'Submissions']];
  const manage = role !== 'STUDENT' ? [['/manage/courses', role === 'ADMIN' ? 'Manage Courses' : 'Trainer Dashboard']] : [];
  const admin = role === 'ADMIN' ? [['/admin/users', 'Users'], ['/admin/audit', 'Audit Log']] : [];
  const group = (links) => links.map(([to, label]) => <NavLink key={to} to={to} end={to === '/'}>{label}</NavLink>);

  return (
    <div className="shell">
      <header className="topbar">
        <button className="burger" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}><span /></button>
        <div className="brand"><i />LMS</div>
      </header>
      <div className={`scrim ${open ? 'show' : ''}`} onClick={() => setOpen(false)} />
      <aside className={`rail ${open ? 'open' : ''}`}>
        <div className="brand"><i />LMS</div>
        <nav aria-label="Main">
          {group(main)}
          {manage.length > 0 && <div className="nav-sep" />}
          {group(manage)}
          {admin.length > 0 && <div className="nav-sep" />}
          {group(admin)}
        </nav>
        <div className="me">
          <div className="avatar">{user.name?.[0]?.toUpperCase()}</div>
          <div className="me-info"><b>{user.name}</b><span>{role.charAt(0) + role.slice(1).toLowerCase()}</span></div>
          <button className="logout" onClick={async () => { await logout(); navigate('/login'); }}>Logout</button>
        </div>
      </aside>
      <main className="content">
        <div className="page" key={pathname}><Outlet /></div>
      </main>
    </div>
  );
}
