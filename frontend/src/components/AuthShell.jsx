// Split-screen layout shared by Login and Register.
export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="auth">
      <section className="auth-art" aria-hidden="true">
        <div className="blob a" /><div className="blob b" />
        <div className="brand"><i />LMS</div>
        <div>
          <h1>Courses, assignments and marks in one place.</h1>
          <p>Trainers publish work, students submit it, and feedback lands where it can be seen.</p>
        </div>
      </section>
      <section className="auth-form">
        <div className="panel">
          <h2 style={{ marginBottom: 4 }}>{title}</h2>
          <p className="muted" style={{ marginTop: 0 }}>{subtitle}</p>
          {children}
          <p className="muted" style={{ marginTop: 18 }}>{footer}</p>
        </div>
      </section>
    </div>
  );
}
