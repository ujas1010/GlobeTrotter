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
      <div className="grid grid-cols-12 gap-6 lg:gap-12 min-w-0 w-full">
        <aside className="animate-rise col-span-12 space-y-6 sm:space-y-8 lg:col-span-4 lg:space-y-10 min-w-0">
          <header className="space-y-1.5 min-w-0">
            <h1 className="text-2xl font-black uppercase tracking-tight text-foreground sm:text-3xl lg:text-4xl break-words">
              Hello, <span className="text-primary">{displayName}</span>
            </h1>
            <p className="text-xs text-muted-foreground sm:text-sm">
              {upcoming.length} upcoming {upcoming.length === 1 ? "expedition" : "expeditions"}.
              {next
                ? ` Next departure in ${daysAway} ${daysAway === 1 ? "day" : "days"}.`
                : " Time to plan your first one."}
            </p>
          </header>

          <section className="space-y-3 sm:space-y-4 min-w-0">
            <div className="flex items-center justify-between border-b border-border pb-2 min-w-0">
              <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground truncate">
                Recent itineraries
              </h2>
              <Link
                to="/trips"
                className="font-mono text-[11px] font-bold uppercase text-primary hover:underline underline-offset-4 shrink-0"
              >
                View all →
              </Link>
            </div>

            <div className="space-y-2.5 sm:space-y-3 min-w-0">
              {list.slice(0, 4).map((t, i) => (
                <Link
                  key={t.id}
                  to="/trips/$tripId"
                  params={{ tripId: t.id }}
                  className={
                    i === 0
                      ? "group block bg-card p-3.5 sm:p-4 shadow-sm ring-1 ring-border transition-all hover:ring-primary/40 active:scale-[0.99] min-w-0"
                      : "block border border-dashed border-border bg-card/50 p-3.5 sm:p-4 transition-colors hover:border-primary active:scale-[0.99] min-w-0"
                  }
                >
                  <div className="flex items-start justify-between gap-3 min-w-0">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold leading-snug break-words sm:text-base">{t.name}</h3>
                      <p className="mt-0.5 font-mono text-[11px] uppercase text-muted-foreground">
                        {shortDate(t.start_date)} – {shortDate(t.end_date)}
                      </p>
                    </div>
                    {i === 0 && (
                      <span className="shrink-0 bg-accent px-2 py-0.5 font-mono text-[10px] font-bold text-accent-foreground">
                        ACTIVE
                      </span>
                    )}
                  </div>
                </Link>
              ))}
              {list.length === 0 && (
                <div className="border border-dashed border-border p-5 text-center">
                  <p className="font-mono text-xs uppercase text-muted-foreground">No trips yet</p>
                  <Link
                    to="/trips/new"
                    className="mt-2 inline-block text-[10px] font-bold uppercase underline underline-offset-4 text-primary"
                  >
                    Create your first trip
                  </Link>
                </div>
              )}
            </div>
          </section>

          <section className="space-y-5 bg-neutral-900 border border-neutral-800 p-4.5 text-neutral-50 shadow-md sm:p-6 min-w-0 overflow-hidden">
            <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-neutral-400">
              Live budget sync
            </h2>
            <div className="space-y-1.5">
              <div className="text-2xl font-black italic tracking-tight sm:text-3xl break-words text-white">
                {currency(cost.total)}
              </div>
              <div className="flex items-center gap-2.5">
                <div className="h-2 flex-1 overflow-hidden bg-neutral-800 rounded-none">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="font-mono text-[11px] font-semibold text-neutral-300">{pct}%</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1 font-mono text-[11px] uppercase tracking-tight">
              <div className="min-w-0">
                <span className="mb-0.5 block text-[10px] text-neutral-400">Avg. daily</span>
                <span className="block font-bold text-white truncate">{currency(cost.total / days)}</span>
              </div>
              <div className="min-w-0">
                <span className="mb-0.5 block text-[10px] text-neutral-400">Stops</span>
                <span className="block font-bold text-white">{(stops ?? []).length}</span>
              </div>
            </div>
          </section>
        </aside>

        <div className="animate-rise col-span-12 lg:col-span-8 min-w-0">
          <div className="flex flex-col gap-3.5 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between min-w-0">
            <div className="min-w-0 flex-1">
              <div className="mb-1 font-mono text-[10px] font-bold uppercase tracking-widest text-primary">
                {next ? "Next departure" : "Getting started"}
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tight break-words sm:text-3xl md:text-4xl lg:text-5xl">
                {next?.name ?? "No trip yet"}
              </h2>
            </div>
            <Link
              to="/trips/new"
              className="inline-flex items-center justify-center self-start shrink-0 bg-primary px-5 py-2 text-xs font-bold uppercase tracking-widest text-primary-foreground shadow-md transition-transform hover:scale-[1.02] active:scale-95 sm:self-auto sm:px-6 sm:py-2.5"
            >
              Plan trip
            </Link>
          </div>

          <div className="mt-6 space-y-10 sm:mt-10 sm:space-y-14 min-w-0">
            {(stops ?? []).map((s, i) => (
              <section key={s.id} className="relative pl-5 sm:pl-8 md:pl-16 min-w-0">
                <div className="absolute left-[5px] top-0 bottom-[-2.5rem] w-px bg-border sm:left-[7px] md:left-[15px] sm:bottom-[-3.5rem]" />
                <div
                  className={`absolute left-0 top-0 size-3 sm:size-3.5 ring-2 ring-background md:left-[8px] ${
                    i === 0 ? "bg-primary" : "border-2 border-border bg-background"
                  }`}
                />
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-8 min-w-0">
                  <div className="shrink-0 md:w-32">
                    <span className="block text-xl font-extrabold leading-none tracking-tight sm:text-2xl md:text-3xl">
                      STOP {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="font-mono text-[11px] uppercase text-muted-foreground">
                      {shortDate(s.arrival_date)} – {shortDate(s.departure_date)}
                    </span>
                  </div>
                  <div className="flex-1 space-y-3 sm:space-y-5 min-w-0">
                    <h3 className="text-lg font-bold tracking-tight break-words sm:text-xl md:text-2xl">
                      {s.cities?.name}, {s.cities?.country}
                    </h3>
                    <div className="space-y-2 min-w-0">
                      {s.trip_activities.slice(0, 3).map((a) => (
                        <div
                          key={a.id}
                          className="flex items-center justify-between gap-3 border border-border bg-card p-3 sm:p-3.5 min-w-0"
                        >
                          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                            <div className="font-mono text-[10px] text-muted-foreground shrink-0">
                              {a.start_time?.slice(0, 5) ?? "--:--"}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-bold truncate text-xs sm:text-sm">{a.name}</div>
                              <div className="text-[10px] uppercase tracking-wide text-muted-foreground truncate">
                                {a.category} / {currency(Number(a.cost))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      {s.trip_activities.length === 0 && (
                        <div className="flex flex-col items-center justify-center gap-1.5 border border-dashed border-border p-4 text-center">
                          <div className="font-mono text-xs text-muted-foreground">NO ACTIVITIES ADDED</div>
                          <Link
                            to="/trips/$tripId"
                            params={{ tripId: s.trip_id }}
                            className="text-[10px] font-bold uppercase underline underline-offset-4 text-primary"
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
              <div className="flex items-center justify-center bg-foreground/5 p-6 sm:p-10 text-center">
                <Link
                  to="/trips/$tripId"
                  params={{ tripId: next.id }}
                  className="font-mono text-xs font-bold uppercase tracking-widest underline underline-offset-4 text-primary"
                >
                  Open the itinerary builder
                </Link>
              </div>
            )}
          </div>

          <section className="mt-10 sm:mt-14 min-w-0">
            <h3 className="mb-3.5 border-b border-border pb-2 font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Recommended destinations
            </h3>
            <div className="grid gap-2.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 min-w-0">
              {(cities ?? []).slice(0, 6).map((c) => (
                <Link
                  key={c.id}
                  to="/explore"
                  className="border border-border bg-card p-3.5 transition-colors hover:border-foreground active:scale-[0.99] min-w-0"
                >
                  <div className="font-bold text-sm truncate">{c.name}</div>
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
