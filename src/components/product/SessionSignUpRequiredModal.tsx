"use client";

const SITE_HOME = "https://www.motiion.app";

export function SessionSignUpRequiredModal({
  sharePath,
  onClose,
}: {
  sharePath: string;
  onClose: () => void;
}) {
  const appHref = `${SITE_HOME}${sharePath.startsWith("/") ? sharePath : `/${sharePath}`}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-signup-title"
      className="casting-modal-backdrop"
      onClick={onClose}
    >
      <div className="casting-modal-card" onClick={(event) => event.stopPropagation()}>
        <h2 id="session-signup-title" className="casting-modal-title">
          Account required
        </h2>
        <p className="casting-body-copy">
          To request to join this session, download the Motiion app, create an account, then open this link again.
        </p>
        <div className="casting-modal-actions">
          <a href={appHref} className="casting-modal-primary">
            Get the app
          </a>
          <button type="button" onClick={onClose} className="casting-modal-dismiss">
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
