import { TopNav } from "@/components/TopNav";
import { SplashScreen } from "@/components/SplashScreen";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SplashScreen />
      <div className="relative h-screen overflow-hidden">
        <TopNav />
        <main className="h-full overflow-y-auto pt-[76px] pb-8 px-6">
          {children}
        </main>
      </div>
    </>
  );
}
