import { Sidebar } from "@/components/sidebar";
import { SplashScreen } from "@/components/SplashScreen";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SplashScreen />
      <div style={{ height: "100vh", width: "100vw", padding: "10px", display: "flex", gap: "10px" }}>

        {/* Sidebar */}
        <div style={{ width: "220px", flexShrink: 0, height: "100%", borderRadius: "18px", overflow: "hidden" }}>
          <Sidebar />
        </div>

        {/* Main panel */}
        <div style={{ flex: 1, height: "100%", borderRadius: "18px", overflow: "hidden", background: "#161616", display: "flex", flexDirection: "column" }}>
          <main style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            {children}
          </main>
        </div>

      </div>
    </>
  );
}
