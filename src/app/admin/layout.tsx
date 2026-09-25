import { requirePlatformAdmin } from "@/lib/auth/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requirePlatformAdmin();
  return (
    <div className="theme-dark theme-product min-h-screen bg-[#0a0a0a] text-[#ffffff]">
      {children}
    </div>
  );
}
