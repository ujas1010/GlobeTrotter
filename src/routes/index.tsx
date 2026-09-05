import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchCities, currency } from "@/lib/travel";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GlobeTrotter — Plan multi-city trips, day by day" },
      {
        name: "description",
        content:
          "Build multi-city itineraries with dates, activities and costs. Track your budget and share your plan with a public link.",
      },
      { property: "og:title", content: "GlobeTrotter — Plan multi-city trips, day by day" },
      {
        property: "og:description",
        content: "Multi-city itinerary builder with day-wise planning, cost breakdowns and shareable plans.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { data: cities } = useQuery({ queryKey: ["cities", "", "all"], queryFn: () => fetchCities() });
  const top = (cities ?? []).slice(0, 6);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-border bg-background/90 px-3.5 py-2.5 backdrop-blur-md sm:px-6 sm:py-3.5">
        <Link to="/" className="flex items-center gap-2 text-lg font-black uppercase tracking-tight transition-opacity hover:opacity-90 sm:gap-2.5 sm:text-2xl">
          <img src="/favicon.png" alt="GlobeTrotter logo" className="size-6 rounded-md object-contain sm:size-7" />
          <span>GlobeTrotter</span>
        </Link>
        <Link
          to="/auth"
          className="bg-foreground px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-background transition-colors hover:bg-primary sm:px-4 sm:py-2 sm:tracking-widest"
        >
          Sign in
        </Link>
      </nav>

      <main className="mx-auto w-full max-w-7xl flex-1 px-3.5 py-8 sm:px-6 sm:py-16">
        <section className="animate-rise grid grid-cols-12 gap-6 border-b border-border pb-10 sm:gap-12 sm:pb-16 min-w-0">
          <div className="col-span-12 lg:col-span-7 min-w-0">
            <div className="mb-3 font-mono text-[10px] font-bold uppercase tracking-widest text-primary">
              Multi-city itinerary planning
            </div>
            <h1 className="text-3xl font-black uppercase leading-[0.95] tracking-tight sm:text-5xl md:text-7xl lg:text-8xl break-words">
              Plan the
              <br />
              whole route.
            </h1>
            <p className="mt-4 max-w-[46ch] text-sm text-muted-foreground sm:mt-6 sm:text-base">
              Stack cities, assign dates, fill each day with activities and watch the cost breakdown update
              as you go. Then publish the plan as a read-only link.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 sm:mt-8">
              <Link
                to="/auth"
                className="inline-flex items-center justify-center bg-primary px-6 py-3 text-xs font-bold uppercase tracking-widest text-primary-foreground shadow-md transition-transform hover:scale-[1.02] active:scale-95 text-center"
              >
                Start planning
              </Link>
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground text-center sm:text-left">
                Free account · No card
              </span>
            </div>
          </div>
          <div className="col-span-12 space-y-2.5 sm:space-y-3 lg:col-span-5 min-w-0">
            <div className="border-b border-border pb-2 font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Sample stops
            </div>
            {["Paris → Lyon", "Kyoto → Osaka", "Lisbon → Marrakech"].map((s, i) => (
              <div key={s} className="flex items-center justify-between border border-border bg-card p-3.5 sm:p-4 min-w-0">
                <span className="font-bold text-sm sm:text-base truncate">{s}</span>
                <span className="shrink-0 font-mono text-[10px] uppercase text-muted-foreground">
                  Stop 0{i + 1}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="py-10 sm:py-16 min-w-0">
          <h2 className="mb-6 font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Popular destinations
          </h2>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 min-w-0">
            {top.map((c) => (
              <div key={c.id} className="border border-border bg-card p-4 sm:p-5 min-w-0">
                <div className="flex items-start justify-between gap-2 min-w-0">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-bold tracking-tight truncate sm:text-xl">{c.name}</h3>
                    <p className="font-mono text-[10px] uppercase text-muted-foreground truncate">
                      {c.country} · {c.region}
                    </p>
                  </div>
                  <span className="shrink-0 bg-accent px-2 py-0.5 font-mono text-[10px] font-bold text-accent-foreground">
                    {currency(c.cost_index)}/day
                  </span>
                </div>
                <p className="mt-2.5 line-clamp-3 text-xs sm:text-sm text-muted-foreground">{c.description}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border px-4 py-6 text-center text-xs text-muted-foreground sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 sm:flex-row">
          <p>© {new Date().getFullYear()} GlobeTrotter. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="hover:text-foreground transition-colors underline">
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
