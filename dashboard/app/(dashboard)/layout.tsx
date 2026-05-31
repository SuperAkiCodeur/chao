import { Sidebar } from "@/components/sidebar";
import { SplashScreen } from "@/components/SplashScreen";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SplashScreen />
      <div style={{
        height: "100vh", width: "100vw",
        padding: 10, gap: 10,
        display: "flex",
      }}>

        {/* Sidebar */}
        <div style={{ width: 230, flexShrink: 0, height: "100%", borderRadius: 18, overflow: "hidden" }}>
          <Sidebar />
        </div>

        {/* Main */}
        <div style={{ flex: 1, height: "100%", borderRadius: 18, overflow: "hidden", background: "#181818", display: "flex", flexDirection: "column" }}>
          {children}
        </div>

      </div>
    </>
  );
}
