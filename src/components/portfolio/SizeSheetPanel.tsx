"use client";

import { Download, Loader2, Share2, X } from "lucide-react";
import { useMemo, useState } from "react";

import { savePortfolioSizing } from "@/app/portfolio/material-actions";
import { FEET_RANGE, formatHeight, INCHES_RANGE, parseHeight } from "@/lib/onboarding/height";
import {
  buildSizingSummary,
  getSizingFieldsForTab,
  parseSizingSummary,
  type SizingTab,
  type SizingValues,
} from "@/lib/onboarding/sizing-options";

import { Notice, SaveButton } from "./PanelKit";
import { PanelActions, useReportDirty, type PortfolioPanelProps } from "./panel-shared";
import { buildSizeSheetPdf, sizeSheetFileName, sizeSheetRows } from "./size-sheet";
import { SizeSheetPaper } from "./PortfolioPaper";

const TABS: { key: SizingTab; label: string }[] = [
  { key: "general", label: "General" },
  { key: "men", label: "Men" },
  { key: "women", label: "Women" },
];

export function SizeSheetPanel({ owner, actionsHost, onDirtyChange, onSaved }: PortfolioPanelProps) {
  const [baseline, setBaseline] = useState({ sizing: owner.sizing, height: owner.height });
  const [values, setValues] = useState<SizingValues>(() => parseSizingSummary(owner.sizing));
  const [height, setHeight] = useState(owner.height);
  const [view, setView] = useState<"preview" | "edit">(owner.sizing || owner.height ? "preview" : "edit");
  const [tab, setTab] = useState<SizingTab>("general");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [exporting, setExporting] = useState<"share" | "download" | null>(null);

  const sizing = buildSizingSummary(values);
  const dirty = sizing !== baseline.sizing || height !== baseline.height;
  useReportDirty(dirty, onDirtyChange);

  const rows = useMemo(() => sizeSheetRows(height, sizing), [height, sizing]);
  const savedValues = useMemo(() => parseSizingSummary(baseline.sizing), [baseline.sizing]);
  const headshot = owner.headshotUrls[0] ?? null;
  const profileUrl = typeof window === "undefined" ? "" : `${window.location.origin}/profile/${owner.username ?? owner.userId}`;
  const parsedHeight = parseHeight(height);

  async function save() {
    setPending(true);
    setError(null);
    const result = await savePortfolioSizing({ sizing, height });
    setPending(false);
    if (!result.ok) return setError(result.error);
    setBaseline({ sizing, height });
    onSaved("Size sheet saved");
  }

  async function exportPdf(mode: "share" | "download") {
    setExporting(mode);
    setError(null);
    try {
      const blob = await buildSizeSheetPdf({
        name: owner.displayName,
        headshotUrl: headshot,
        location: owner.location,
        representation: owner.representation,
        height,
        sizing,
        profileUrl,
      });
      const fileName = sizeSheetFileName(owner.displayName);
      const file = new File([blob], fileName, { type: "application/pdf" });
      if (mode === "share" && typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: `${owner.displayName} size sheet` });
          return;
        } catch (reason) {
          if (reason instanceof DOMException && reason.name === "AbortError") return;
        }
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError("Could not create the PDF. Try again.");
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="portfolio-panel-stack">
      <PanelActions host={actionsHost}>
        <SaveButton dirty={dirty} pending={pending} onClick={() => void save()} />
      </PanelActions>

      <div className="portfolio-chips" role="tablist" aria-label="Size sheet view">
        <button type="button" role="tab" aria-selected={view === "preview"} onClick={() => setView("preview")}>Preview</button>
        <button type="button" role="tab" aria-selected={view === "edit"} onClick={() => setView("edit")}>Edit sizing</button>
      </div>

      {view === "preview" ? (
        <>
          <SizeSheetPaper
            name={owner.displayName}
            headshot={headshot}
            location={owner.location}
            representation={owner.representation}
            rows={rows}
            profileUrl={profileUrl}
          />
          <div className="portfolio-action-bar">
            <button type="button" className="portfolio-button-secondary" disabled={Boolean(exporting) || !rows.length} onClick={() => void exportPdf("download")}>
              {exporting === "download" ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <Download size={14} aria-hidden />} Download PDF
            </button>
            <button type="button" className="portfolio-panel-save" disabled={Boolean(exporting) || !rows.length} onClick={() => void exportPdf("share")}>
              {exporting === "share" ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <Share2 size={14} aria-hidden />} Share
            </button>
          </div>
          {dirty ? <Notice>You have unsaved sizing changes. The preview and PDF include them.</Notice> : null}
        </>
      ) : (
        <div className="portfolio-form">
          <fieldset className="portfolio-field-row">
            <legend>Height</legend>
            <div className="portfolio-field-pair">
              <select
                aria-label="Feet"
                value={height ? parsedHeight.feet : ""}
                onChange={(event) => setHeight(event.target.value ? formatHeight(Number(event.target.value), height ? parsedHeight.inches : 0) : "")}
              >
                <option value="">Feet</option>
                {FEET_RANGE.map((feet) => (
                  <option key={feet} value={feet}>{feet} ft</option>
                ))}
              </select>
              <select
                aria-label="Inches"
                value={height ? parsedHeight.inches : ""}
                disabled={!height}
                onChange={(event) => setHeight(formatHeight(parsedHeight.feet, Number(event.target.value)))}
              >
                <option value="">Inches</option>
                {INCHES_RANGE.map((inches) => (
                  <option key={inches} value={inches}>{inches} in</option>
                ))}
              </select>
            </div>
          </fieldset>

          <div className="portfolio-chips portfolio-chips--sub" role="tablist" aria-label="Sizing group">
            {TABS.map((item) => (
              <button key={item.key} type="button" role="tab" aria-selected={tab === item.key} onClick={() => setTab(item.key)}>
                {item.label}
              </button>
            ))}
          </div>

          {getSizingFieldsForTab(tab)
            .slice()
            .sort((a, b) => Number(Boolean(savedValues[b.key])) - Number(Boolean(savedValues[a.key])))
            .map((field) => (
              <label key={field.key} className="portfolio-field-row portfolio-field-row--inline">
                <span>
                  {field.label}
                  {field.units ? <small>{field.units}</small> : null}
                </span>
                <span className="portfolio-select-clear">
                  <select value={values[field.key]} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}>
                    <option value="">Not set</option>
                    {field.options.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                  {values[field.key] ? (
                    <button type="button" aria-label={`Clear ${field.label}`} onClick={() => setValues((current) => ({ ...current, [field.key]: "" }))}>
                      <X size={14} aria-hidden />
                    </button>
                  ) : null}
                </span>
              </label>
            ))}
        </div>
      )}

      {error ? <Notice tone="error" onDismiss={() => setError(null)}>{error}</Notice> : null}
    </div>
  );
}
