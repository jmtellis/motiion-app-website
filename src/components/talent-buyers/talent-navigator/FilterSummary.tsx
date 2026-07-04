type FilterSummaryProps = {
  summary: string;
  resultCount: number;
  rowIndex: number;
  rowCount: number;
  rowLabel: string;
  rowTalentCount: number;
};

export function FilterSummary({
  summary,
  resultCount,
  rowIndex,
  rowCount,
  rowLabel,
  rowTalentCount,
}: FilterSummaryProps) {
  return (
    <div className="talent-navigator__main-header">
      <div className="min-w-0 space-y-1">
        <p className="text-xs text-white/45">{summary}</p>
        <p className="text-xs font-medium text-white/55">
          {resultCount.toLocaleString()} results
        </p>
        <div className="pt-1">
          <p className="text-[10px] font-semibold tracking-[0.14em] text-white/35 uppercase">
            Row {rowIndex + 1} of {rowCount}
          </p>
          <h2 className="text-lg font-semibold tracking-tight text-white">{rowLabel}</h2>
          <p className="text-xs text-white/40">{rowTalentCount} dancers</p>
        </div>
      </div>
    </div>
  );
}
