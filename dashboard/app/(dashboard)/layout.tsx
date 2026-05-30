import { Sidebar } from "@/components/sidebar";
import { SplashScreen } from "@/components/SplashScreen";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SplashScreen />
      <div className="h-screen w-screen p-2 flex gap-2">
        {/* Sidebar */}
        <div className="w-56 h-full flex-shrink-0 overflow-hidden rounded-2xl">
          <Sidebar />
        </div>
        {/* Main */}
        <div className="flex-1 h-full overflow-hidden rounded-2xl" style={{ background: "#F7F7F7" }}>
          <main className="h-full overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
