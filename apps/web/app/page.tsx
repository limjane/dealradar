/**
 * Placeholder page — task 2 exit criteria is "deploys green with placeholder page".
 * Real UI lands in task 5 (search) from mockups/v2-fun-travel.html. Do not style
 * beyond this — mockup sign-off governs UI (standing rule).
 */
export default function Home() {
  return (
    <main
      data-testid="placeholder-root"
      className="flex min-h-screen flex-col items-center justify-center gap-4 p-8"
    >
      <h1 className="text-4xl font-bold tracking-tight">DealRadar</h1>
      <p className="max-w-md text-center text-slate-400">
        Flight deals, verified. Launching soon.
      </p>
      <p className="text-xs text-slate-600">scaffold v0 — placeholder</p>
    </main>
  );
}
