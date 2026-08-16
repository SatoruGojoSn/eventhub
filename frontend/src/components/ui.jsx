import { useEffect } from 'react';

export function PageHeader({ title, subtitle, action }) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function Notice({ tone = 'ok', children, onClose }) {
  if (!children) return null;
  return (
    <div className={`notice notice-${tone}`} role="status">
      <span>{children}</span>
      {onClose && (
        <button type="button" onClick={onClose} aria-label="Fermer le message">
          ×
        </button>
      )}
    </div>
  );
}

export function Loading({ label = 'Chargement en cours…' }) {
  return <p className="loading">{label}</p>;
}

export function Blank({ title, description }) {
  return (
    <div className="blank">
      <strong>{title}</strong>
      {description && <p>{description}</p>}
    </div>
  );
}

export function Figure({ label, value, note }) {
  return (
    <div className="figure">
      <span className="overline">{label}</span>
      <strong className="figure-value">{value}</strong>
      {note && <span className="figure-note">{note}</span>}
    </div>
  );
}

export function Tag({ children, tone }) {
  return <span className={`tag${tone ? ` ${tone}` : ''}`}>{children}</span>;
}

/** Jauge de remplissage. Le filet passe en rouge une fois la capacité atteinte. */
export function Meter({ value, max, showValue = true }) {
  const percent = max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0;
  return (
    <>
      <span className="meter" role="img" aria-label={`${value} sur ${max}`}>
        <span
          className={`meter-fill${percent >= 100 ? ' full' : ''}`}
          style={{ width: `${percent}%` }}
        />
      </span>
      {showValue && <span className="meter-value">{percent}%</span>}
    </>
  );
}

export function Dialog({ title, onClose, children }) {
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="overlay" onClick={onClose} role="presentation">
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="dialog-head">
          <h2>{title}</h2>
          <button type="button" className="btn btn-quiet" onClick={onClose} aria-label="Fermer">
            ×
          </button>
        </header>
        <div className="dialog-body">{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

const DATE_FORMAT = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
});

export const formatDate = (value) => (value ? DATE_FORMAT.format(new Date(value)) : 'n.c.');

/** Convertit une date ISO en valeur acceptée par <input type="datetime-local">. */
export const toInputDateTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};
