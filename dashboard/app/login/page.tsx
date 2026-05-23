import { signIn } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogoSVG } from "@/components/LogoSVG";

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.317 4.492c-1.53-.69-3.17-1.2-4.885-1.49a.075.075 0 0 0-.079.036c-.21.369-.444.85-.608 1.23a18.566 18.566 0 0 0-5.487 0 12.36 12.36 0 0 0-.617-1.23A.077.077 0 0 0 8.562 3c-1.714.29-3.354.8-4.885 1.491a.07.07 0 0 0-.032.027C.533 9.093-.32 13.555.099 17.961a.08.08 0 0 0 .031.055 20.03 20.03 0 0 0 5.993 2.98.078.078 0 0 0 .084-.026c.462-.62.874-1.275 1.226-1.963.021-.04.001-.088-.041-.104a13.201 13.201 0 0 1-1.872-.878.075.075 0 0 1-.008-.125c.126-.093.252-.19.372-.287a.075.075 0 0 1 .078-.01c3.927 1.764 8.18 1.764 12.061 0a.075.075 0 0 1 .079.009c.12.098.245.195.372.288a.075.075 0 0 1-.006.125c-.598.344-1.22.635-1.873.877a.075.075 0 0 0-.041.105c.36.687.772 1.341 1.225 1.962a.077.077 0 0 0 .084.028 19.963 19.963 0 0 0 6.002-2.981.076.076 0 0 0 .032-.054c.5-5.094-.838-9.52-3.549-13.442a.06.06 0 0 0-.031-.028zM8.02 15.278c-1.182 0-2.157-1.069-2.157-2.38 0-1.312.956-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.956 2.38-2.157 2.38zm7.975 0c-1.183 0-2.157-1.069-2.157-2.38 0-1.312.955-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.946 2.38-2.157 2.38z" />
    </svg>
  );
}

export default function LoginPage() {
  return (
    <main className="relative min-h-screen flex items-center justify-center bg-background overflow-hidden">

      {/* Filigrane — grand logo très atténué */}
      <div className="pointer-events-none select-none absolute inset-0 flex items-center justify-center">
        <LogoSVG className="h-[72vh] w-auto text-foreground opacity-[0.045]" />
      </div>

      {/* Vignette radiale — recentre l'attention */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(ellipse 55% 65% at 50% 50%, transparent 35%, hsl(var(--background)) 82%)" }}
      />

      {/* Card */}
      <div className="relative z-10 w-full max-w-sm px-4">
        <Card>
          <CardHeader className="text-center gap-3 pb-2">
            <LogoSVG className="h-14 w-auto text-primary mx-auto" />
            <div>
              <CardTitle className="text-2xl">Chao Dashboard</CardTitle>
              <CardDescription className="mt-1.5">
                Connecte-toi avec ton compte Discord pour accéder au dashboard.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <form
              action={async () => {
                "use server";
                await signIn("discord", { redirectTo: "/" });
              }}
            >
              <Button className="w-full gap-2" type="submit">
                <DiscordIcon className="h-5 w-5 shrink-0" />
                Se connecter avec Discord
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

    </main>
  );
}
