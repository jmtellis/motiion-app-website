/** Shared fallback for talent routes that fetch private data. Discover has its
 * own layout-matched skeleton; other routes should never leave a blank canvas. */
export default function TalentLoading() {
  return (
    <div className="talent-route-loading" role="status" aria-live="polite">
      <span className="sr-only">Loading workspace…</span>
      <div aria-hidden="true" className="discover-skel talent-route-loading__title" />
      <div aria-hidden="true" className="discover-skel talent-route-loading__line" />
      <div aria-hidden="true" className="discover-skel talent-route-loading__surface" />
    </div>
  );
}
