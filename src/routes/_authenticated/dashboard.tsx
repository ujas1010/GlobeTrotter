import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { fetchTrips, fetchCities, fetchStops, currency, shortDate, tripCost, dayCount } from "@/lib/travel";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — GlobeTrotter" },
      { name: "description", content: "Your upcoming trips, budget status and recommended destinations." },
      { property: "og:title", content: "Dashboard — GlobeTrotter" },
      { property: "og:description", content: "Upcoming trips, budget status and destination inspiration." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const { data: trips } = useQuery({ queryKey: ["trips"], queryFn: fetchTrips });
  const { data: cities } = useQuery({ queryKey: ["cities", "", "all"], queryFn: () => fetchCities() });
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .eq("id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const meta = user?.user_metadata as Record<string, any> | undefined;
  const displayName =
    profile?.display_name ||
    meta?.["full_name"] ||
    meta?.["display_name"] ||
    meta?.["name"] ||
    (user?.email ? user.email.split("@")[0] : "traveller");

  const list = trips ?? [];
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const upcoming = list.filter((t) => t.end_date >= today);
  const next = upcoming[0] ?? list[0];
  const daysAway = next
    ? Math.max(0, Math.round((+new Date(next.start_date) - +new Date(today)) / 86400000))
    : 0;

  const { data: stops } = useQuery({
    queryKey: ["stops", next?.id],
    queryFn: () => fetchStops(next!.id),
    enabled: !!next,
  });

  const cost = tripCost(stops ?? []);
  const budget = Number(next?.budget ?? 0);
  const pct = budget > 0 ? Math.min(100, Math.round((cost.total / budget) * 100)) : 0;
  const days = next ? dayCount(next.start_date, next.end_date) : 1;

  return (
    <AppShell>
      <div className="grid grid-cols-12 gap-8 lg:gap-12 min-w-0">
        <aside className="animate-rise col-span-12 space-y-8 lg:col-span-4 lg:space-y-10 min-w-0">
          <header className="space-y-2 min-w-0">
            <h1 className="text-3xl font-extrabold uppercase leading-tight tracking-tighter break-words sm:text-4xl">
              Hello,
              <br />
              {displayName}.
            </h1>
            <p className="max-w-[30ch] text-sm text-muted-foreground">
              {upcoming.length} upcoming {upcoming.length === 1 ? "expedition" : "expeditions"}.
              {next ? ` Next departure in ${daysAway} days.` : " Time to plan your first one."}
            </p>
          </header>

          <section className="space-y-4 min-w-0">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h2 className="font-mono text-xs font-bold uppercase tracking-widest">Recent itineraries</h2>
              <Link to="/trips" className="text-[10px] font-bold uppercase underline underline-offset-4">
                View all
              </Link>
            </div>

            <div className="space-y-3 min-w-0">
              {list.slice(0, 4).map((t, i) => (
                <Link
                  key={t.id}
                  to="/trips/$tripId"
                  params={{ tripId: t.id }}
                  className={
                    i === 0
                      ? "group block bg-card p-4 shadow-sm ring-1 ring-border transition-all hover:ring-primary/40 min-w-0"
                      : "block border border-dashed border-border p-4 transition-colors hover:border-primary min-w-0"
                  }
                >
                  <div className="flex items-start justify-between gap-3 min-w-0">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-bold leading-tight break-words sm:text-lg">{t.name}</h3>
                      <p className="font-mono text-xs uppercase text-muted-foreground">
                        {shortDate(t.start_date)} – {shortDate(t.end_date)}
                      </p>
                    </div>
                    {i === 0 && (
                      <span className="shrink-0 bg-accent px-2 py-0.5 font-mono text-[10px] text-accent-foreground">
                        ACTIVE
                      </span>
                    )}
                  </div>
                </Link>
              ))}
              {list.length === 0 && (
                <div className="border border-dashed border-border p-6 text-center">
                  <p className="font-mono text-xs uppercase text-muted-foreground">No trips yet</p>
                  <Link
                    to="/trips/new"
                    className="mt-2 inline-block text-[10px] font-bold uppercase underline underline-offset-4"
                  >
                    Create your first trip
                  </Link>
                </div>
              )}
            </div>
          </section>

          <section className="space-y-6 bg-foreground p-5 text-background sm:p-6 min-w-0 overflow-hidden">
            <h2 className="font-mono text-xs font-bold uppercase tracking-widest opacity-60">
              Live budget sync
            </h2>
            <div className="space-y-1">
              <div className="text-2xl font-extrabold italic tracking-tighter sm:text-3xl break-words">
                {currency(cost.total)}
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden bg-background/10">
                  <div className="h-full bg-primary transition-all duration-300" style={{ width: `${pct}%` }} />
                </div>
                <span className="font-mono text-[10px]">{pct}%</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 font-mono text-[10px] uppercase tracking-tighter">
              <div>
                <span className="mb-1 block opacity-50">Avg. daily</span>
                <span className="block font-bold truncate">{currency(cost.total / days)}</span>
              </div>
              <div>
                <span className="mb-1 block opacity-50">Stops</span>
                <span className="block font-bold">{(stops ?? []).length}</span>
              </div>
            </div>
          </section>
        </aside>

        <div className="animate-rise col-span-12 lg:col-span-8 min-w-0">
          <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between min-w-0">
            <div className="min-w-0 flex-1">
              <div className="mb-2 font-mono text-[10px] uppercase text-primary">
                {next ? "Next departure" : "Getting started"}
              </div>
              <h2 className="text-2xl font-extrabold uppercase tracking-tighter break-words sm:text-3xl md:text-4xl lg:text-5xl">
                {next?.name ?? "No trip yet"}
              </h2>
            </div>
            <Link
              to="/trips/new"
              className="self-start shrink-0 bg-primary px-5 py-2 text-xs font-bold uppercase tracking-widest text-primary-foreground shadow-lg shadow-primary/20 sm:self-auto sm:px-6 sm:py-2.5"
            >
              Plan trip
            </Link>
          </div>

          <div className="mt-8 space-y-12 sm:mt-12 sm:space-y-16 min-w-0">
            {(stops ?? []).map((s, i) => (
              <section key={s.id} className="relative pl-6 sm:pl-8 md:pl-20 min-w-0">
                <div className="absolute left-[5px] top-0 bottom-[-3rem] w-px bg-border sm:left-[7px] md:left-[19px] sm:bottom-[-4rem]" />
                <div
                  className={`absolute left-0 top-0 size-3 sm:size-4 ring-4 ring-background sm:left-0 md:left-[12px] ${
                    i === 0 ? "bg-primary" : "border-2 border-border bg-background"
                  }`}
                />
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-8 min-w-0">
                  <div className="flex-shrink-0 md:w-32">
                    <span className="block text-2xl font-extrabold leading-none tracking-tighter sm:text-3xl md:text-4xl">
                      STOP {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="font-mono text-xs uppercase text-muted-foreground">
                      {shortDate(s.arrival_date)} – {shortDate(s.departure_date)}
                    </span>
                  </div>
                  <div className="flex-1 space-y-4 sm:space-y-6 min-w-0">
                    <h3 className="text-xl font-bold tracking-tight break-words sm:text-2xl">
                      {s.cities?.name}, {s.cities?.country}
                    </h3>
                    <div className="space-y-2 min-w-0">
                      {s.trip_activities.slice(0, 3).map((a) => (
                        <div
                          key={a.id}
                          className="flex items-center justify-between gap-3 border border-border bg-card p-3 sm:p-4 min-w-0"
                        >
                          <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                            <div className="font-mono text-[10px] text-muted-foreground shrink-0">
                              {a.start_time?.slice(0, 5) ?? "--:--"}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-bold truncate text-sm sm:text-base">{a.name}</div>
                              <div className="text-[10px] uppercase tracking-wide text-muted-foreground truncate">
                                {a.category} / {currency(Number(a.cost))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      {s.trip_activities.length === 0 && (
                        <div className="flex flex-col items-center justify-center gap-2 border border-dashed border-border p-6 text-center">
                          <div className="font-mono text-xs text-muted-foreground">NO ACTIVITIES ADDED</div>
                          <Link
                            to="/trips/$tripId"
                            params={{ tripId: s.trip_id }}
                            className="text-[10px] font-bold uppercase underline underline-offset-4"
                          >
                            Add to timeline
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            ))}

            {next && (stops ?? []).length === 0 && (
              <div className="flex items-center justify-center bg-foreground/5 p-8 sm:p-12 text-center">
                <Link
                  to="/trips/$tripId"
                  params={{ tripId: next.id }}
                  className="font-mono text-[10px] uppercase tracking-widest underline underline-offset-4"
                >
                  Open the itinerary builder
                </Link>
              </div>
            )}
          </div>

          <section className="mt-12 sm:mt-16 min-w-0">
            <h3 className="mb-4 border-b border-border pb-2 font-mono text-xs font-bold uppercase tracking-widest">
              Recommended destinations
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 min-w-0">
              {(cities ?? []).slice(0, 6).map((c) => (
                <Link
                  key={c.id}
                  to="/explore"
                  className="border border-border bg-card p-4 transition-colors hover:border-foreground min-w-0"
                >
                  <div className="font-bold truncate">{c.name}</div>
                  <div className="font-mono text-[10px] uppercase text-muted-foreground truncate">
                    {c.country} · index {c.cost_index}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
