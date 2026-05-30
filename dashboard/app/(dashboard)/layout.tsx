import { Sidebar } from "@/components/sidebar";
import { SplashScreen } from "@/components/SplashScreen";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SplashScreen />
      <div className="h-screen w-screen p-2 flex gap-2">
        {/* Sidebar — panneau indépendant */}
        <div className="flex-shrink-0 h-full overflow-hidden rounded-2xl shadow-xl bg-white">
          <Sidebar />
        </div>

        {/* Contenu principal — panneau indépendant */}
        <div className="flex-1 h-full overflow-hidden rounded-2xl shadow-xl bg-white">
          <main className="h-full overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
