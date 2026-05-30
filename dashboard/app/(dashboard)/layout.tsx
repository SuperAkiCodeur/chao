import { Sidebar } from "@/components/sidebar";
import { SplashScreen } from "@/components/SplashScreen";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SplashScreen />
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-8">
          {children}
        </main>
      </div>
    </>
  );
}
