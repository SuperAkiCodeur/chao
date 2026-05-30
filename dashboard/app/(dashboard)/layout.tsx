import { Sidebar } from "@/components/sidebar";
import { SplashScreen } from "@/components/SplashScreen";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SplashScreen />
      <div className="h-screen w-screen p-2">
        <div className="flex h-full w-full overflow-hidden rounded-2xl shadow-2xl bg-white">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
