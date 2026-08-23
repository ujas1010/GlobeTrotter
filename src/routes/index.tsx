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
    <div className="min-h-screen bg-background text-foreground">
      <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-border bg-background/80 px-4 py-3.5 backdrop-blur-md sm:px-6 sm:py-4">
        <Link to="/" className="flex items-center gap-2 text-xl font-extrabold uppercase tracking-tighter transition-opacity hover:opacity-90 sm:gap-2.5 sm:text-2xl">
          <img src="/favicon.png" alt="GlobeTrotter logo" className="size-6 rounded-md object-contain sm:size-7" />
          <span>GlobeTrotter</span>
        </Link>
        <Link
          to="/auth"
          className="bg-foreground px-4 py-2 text-xs font-bold uppercase tracking-widest text-background transition-colors hover:bg-primary"
        >
          Sign in
        </Link>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16">
        <section className="animate-rise grid grid-cols-12 gap-8 border-b border-border pb-12 sm:gap-12 sm:pb-16">
          <div className="col-span-12 lg:col-span-7">
            <div className="mb-4 font-mono text-[10px] uppercase tracking-widest text-primary">
              Multi-city itinerary planning
            </div>
            <h1 className="text-4xl font-extrabold uppercase leading-[0.92] tracking-tighter sm:text-6xl md:text-8xl">
              Plan the
              <br />
              whole route.
            </h1>
            <p className="mt-6 max-w-[46ch] text-muted-foreground">
              Stack cities, assign dates, fill each day with activities and watch the cost breakdown update
              as you go. Then publish the plan as a read-only link.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                to="/auth"
                className="bg-primary px-6 py-3 text-xs font-bold uppercase tracking-widest text-primary-foreground shadow-lg shadow-primary/20"
              >
                Start planning
              </Link>
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Free account · No card
              </span>
            </div>
          </div>
          <div className="col-span-12 space-y-3 lg:col-span-5">
            <div className="border-b border-border pb-2 font-mono text-[10px] font-bold uppercase tracking-widest">
              Sample stops
            </div>
            {["Paris → Lyon", "Kyoto → Osaka", "Lisbon → Marrakech"].map((s, i) => (
              <div key={s} className="flex items-center justify-between border border-border bg-card p-4">
                <span className="font-bold">{s}</span>
                <span className="font-mono text-[10px] uppercase text-muted-foreground">
                  Stop 0{i + 1}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="py-16">
          <h2 className="mb-8 font-mono text-xs font-bold uppercase tracking-widest">
            Popular destinations
          </h2>
          <div className="grid gap-3 md:grid-cols-3">
            {top.map((c) => (
              <div key={c.id} className="border border-border bg-card p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-bold tracking-tight">{c.name}</h3>
                    <p className="font-mono text-[10px] uppercase text-muted-foreground">
                      {c.country} · {c.region}
                    </p>
                  </div>
                  <span className="bg-accent px-2 py-0.5 font-mono text-[10px] text-accent-foreground">
                    {currency(c.cost_index)}/day
                  </span>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{c.description}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
