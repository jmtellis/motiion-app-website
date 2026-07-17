import type { ReactNode } from "react";

type SetupFlowFormPanelProps = {
  title: string;
  subtitle?: string;
  progressLabel?: string;
  progressPercent?: number;
  progressCurrent?: number;
  progressTotal?: number;
  showProgressMeta?: boolean;
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
  showProgressMeta = true,
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
      {title || subtitle ? (
        <div>
          {title ? <h1 className="signup-split-form__title">{title}</h1> : null}
          {subtitle ? <p className="signup-split-form__subtitle">{subtitle}</p> : null}
        </div>
      ) : null}

      {showProgress ? (
        <div className="signup-split-form__progress" aria-hidden={false}>
          {showProgressMeta ? (
            <div className="signup-split-form__progress-meta">
              <span className="signup-split-form__progress-label">{progressLabel}</span>
              <span className="signup-split-form__progress-count">
                {progressCurrent} of {progressTotal}
              </span>
            </div>
          ) : null}
          <div
            className="signup-split-form__progress-track"
            role="progressbar"
            aria-valuenow={progressCurrent}
            aria-valuemin={1}
            aria-valuemax={progressTotal}
            aria-label={
              progressLabel
                ? showProgressMeta
                  ? `${progressLabel}: step ${progressCurrent} of ${progressTotal}`
                  : progressLabel
                : undefined
            }
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
