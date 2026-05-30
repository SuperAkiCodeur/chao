import { Sidebar } from "@/components/sidebar";
import { SplashScreen } from "@/components/SplashScreen";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SplashScreen />
      <div className="h-screen w-screen p-3 flex gap-3">
        {/* Sidebar */}
        <div
          className="w-56 h-full flex-shrink-0 overflow-hidden rounded-2xl"
          style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.06), 0 8px 32px rgba(0,0,0,0.5)" }}
        >
          <Sidebar />
        </div>
        {/* Main */}
        <div
          className="flex-1 h-full overflow-hidden rounded-2xl"
          style={{ background: "#F7F7F7", boxShadow: "0 8px 32px rgba(0,0,0,0.35)" }}
        >
          <main className="h-full overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
