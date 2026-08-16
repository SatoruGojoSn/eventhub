import { NavLink } from 'react-router-dom';

const SECTIONS = [
  { to: '/', label: 'Tableau de bord', end: true },
  { to: '/evenements', label: 'Événements' },
  { to: '/participants', label: 'Participants' },
  { to: '/inscriptions', label: 'Inscriptions' }
];

export default function Layout({ children }) {
  return (
    <>
      <header className="masthead">
        <div className="masthead-inner">
          <NavLink to="/" className="wordmark">
            <span className="wordmark-name">EventHub</span>
            <span className="wordmark-org">Dakar Institute of Technology</span>
          </NavLink>

          <nav className="tabs">
            {SECTIONS.map((section) => (
              <NavLink
                key={section.to}
                to={section.to}
                end={section.end}
                className={({ isActive }) => `tab${isActive ? ' active' : ''}`}
              >
                {section.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="content">{children}</main>

      <footer className="colophon">
        Architecture microservices : events-service, participants-service,
        registrations-service.
      </footer>
    </>
  );
}
