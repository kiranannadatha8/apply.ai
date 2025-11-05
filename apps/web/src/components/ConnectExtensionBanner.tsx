// apps/web/src/pages/dashboard/components/ConnectExtension.tsx
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export function ConnectExtension({ connected }: { connected: boolean }) {
  return (
    <Card className="rounded-2xl shadow-sm overflow-hidden xl:col-span-1 relative">
      <div className="absolute inset-0 bg-gradient-to-br from-violet-600/20 via-fuchsia-500/10 to-emerald-500/10 pointer-events-none" />
      <CardContent className="relative p-5">
        <div className="text-sm font-medium">Extension</div>
        <p className="text-xs text-muted-foreground">
          {connected
            ? "Your browser extension is connected. You're good to go!"
            : "Connect the Chrome extension to auto-detect job pages and autofill forms."}
        </p>
        <div className="mt-4 flex gap-2">
          {!connected ? (
            <>
              <Link to="/settings">
                <Button className="rounded-xl">Connect</Button>
              </Link>
              <a
                href="https://chromewebstore.google.com/"
                target="_blank"
                rel="noreferrer"
              >
                <Button variant="secondary" className="rounded-xl">
                  Get Extension
                </Button>
              </a>
            </>
          ) : (
            <Link to="/jobs">
              <Button className="rounded-xl">Open Job Board</Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
