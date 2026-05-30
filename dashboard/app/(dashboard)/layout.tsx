import { Sidebar } from "@/components/sidebar";
import { SplashScreen } from "@/components/SplashScreen";

const DIV = "1px solid rgba(255,255,255,0.07)";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SplashScreen />
      <div style={{ height: "100vh", width: "100vw", padding: "10px", display: "flex", gap: "10px" }}>
        {/* Sidebar */}
        <div style={{ width: "200px", flexShrink: 0, height: "100%", borderRadius: "16px", overflow: "hidden", boxShadow: `inset 0 0 0 ${DIV}` }}>
          <Sidebar />
        </div>
        {/* Main */}
        <div style={{ flex: 1, height: "100%", borderRadius: "16px", overflow: "hidden", background: "#111111" }}>
          <main style={{ height: "100%", overflowY: "auto" }}>
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
