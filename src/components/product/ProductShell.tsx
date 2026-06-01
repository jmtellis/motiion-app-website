import "@/app/product.css";

export function ProductShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="product-theme">
      <div className="product-shell">{children}</div>
    </div>
  );
}
