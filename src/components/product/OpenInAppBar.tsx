const APP_STORE_URL = "https://www.motiion.app";

export function OpenInAppBar({ label = "Open in Motiion" }: { label?: string }) {
  return (
    <div
      style={{
        position: "sticky",
        bottom: 12,
        zIndex: 20,
        marginTop: 24,
        display: "flex",
        justifyContent: "center",
      }}
    >
      <a className="product-btn-primary" href={APP_STORE_URL} style={{ width: "100%", maxWidth: 360 }}>
        {label}
      </a>
    </div>
  );
}
