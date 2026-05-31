import { Sidebar } from "@/components/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ height: "100vh", width: "100vw", padding: 10, display: "flex", gap: 10, background: "#111" }}>

      {/* Sidebar */}
      <div style={{ width: 240, flexShrink: 0, height: "100%", borderRadius: 16, overflow: "hidden" }}>
        <Sidebar />
      </div>

      {/* Main */}
      <div style={{ flex: 1, height: "100%", borderRadius: 16, overflow: "hidden", background: "#181818" }}>
        {children}
      </div>

    </div>
  );
}
