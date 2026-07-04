import type { ReactNode } from "react";

type SetupFlowFormPanelProps = {
  title: string;
  subtitle?: string;
  progressLabel?: string;
  progressPercent?: number;
  progressCurrent?: number;
  progressTotal?: number;
  children: ReactNode;
  footer: ReactNode;
  error?: string | null;
};

export function SetupFlowFormPanel({
  title,
  subtitle,
  progressLabel,
  progressPercent,
  progressCurrent,
  progressTotal,
  children,
  footer,
  error,
}: SetupFlowFormPanelProps) {
  const showProgress =
    progressPercent !== undefined &&
    progressCurrent !== undefined &&
    progressTotal !== undefined;

  return (
    <div className="signup-split-form signup-split-form--onboarding">
      <div>
        <h1 className="signup-split-form__title">{title}</h1>
        {subtitle ? <p className="signup-split-form__subtitle">{subtitle}</p> : null}
      </div>

      {showProgress ? (
        <div className="signup-split-form__progress" aria-hidden={false}>
          <div className="signup-split-form__progress-meta">
            <span className="signup-split-form__progress-label">{progressLabel}</span>
            <span className="signup-split-form__progress-count">
              {progressCurrent} of {progressTotal}
            </span>
          </div>
          <div
            className="signup-split-form__progress-track"
            role="progressbar"
            aria-valuenow={progressCurrent}
            aria-valuemin={1}
            aria-valuemax={progressTotal}
            aria-label={progressLabel ? `${progressLabel}: step ${progressCurrent} of ${progressTotal}` : undefined}
          >
            <div
              className="signup-split-form__progress-bar"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      ) : null}

      <div className="signup-split-form__body">{children}</div>

      {error ? <div className="signup-split-error">{error}</div> : null}

      <div className="signup-split-form__footer">{footer}</div>
    </div>
  );
}
