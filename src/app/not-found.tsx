import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="glass max-w-md rounded-2xl p-6 text-center">
        <h1 className="text-lg font-semibold">Page not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          There&apos;s nothing at this address. Head back to analyze a token.
        </p>
        <Button asChild className="mt-5">
          <Link href="/">Back to Super Tracker</Link>
        </Button>
      </div>
    </main>
  );
}
