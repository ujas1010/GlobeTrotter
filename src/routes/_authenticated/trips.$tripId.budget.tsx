import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell, SectionHeading } from "@/components/AppShell";
import {
  costByDay,
  currency,
  dayCount,
  eachDay,
  fetchStops,
  fetchTrip,
  shortDate,
  tripCost,
} from "@/lib/travel";

export const Route = createFileRoute("/_authenticated/trips/$tripId/budget")({
  head: () => ({
    meta: [
      { title: "Cost breakdown — GlobeTrotter" },
      { name: "description", content: "See how your trip spend splits across stays, transit and activities." },
      { property: "og:title", content: "Cost breakdown — GlobeTrotter" },
      { property: "og:description", content: "Category and per-day cost analysis for your itinerary." },
    ],
  }),
  component: BudgetPage,
});

function BudgetPage() {
  const { tripId } = Route.useParams();
  const { data: trip } = useQuery({ queryKey: ["trip", tripId], queryFn: () => fetchTrip(tripId) });
  const { data: stops } = useQuery({ queryKey: ["stops", tripId], queryFn: () => fetchStops(tripId) });

  if (!trip) {
    return (
      <AppShell>
        <p className="font-mono text-xs uppercase text-muted-foreground">Loading budget…</p>
      </AppShell>
    );
  }

  const list = stops ?? [];
  const { total, byCategory } = tripCost(list);
  const perDay = costByDay(list);
  const days = eachDay(trip.start_date, trip.end_date);
  const nights = dayCount(trip.start_date, trip.end_date);
  const budget = Number(trip.budget ?? 0);
  const pct = budget > 0 ? Math.min(100, Math.round((total / budget) * 100)) : 0;
  const entries = Object.entries(byCategory)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...entries.map(([, v]) => v));
  const maxDay = Math.max(1, ...days.map((d) => perDay[d] ?? 0));

  return (
    <AppShell>
      <SectionHeading
        eyebrow={trip.name}
        title="Cost Breakdown"
        actions={
          <Link
            to="/trips/$tripId"
            params={{ tripId }}
            className="border border-border px-4 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-card"
          >
            Back to itinerary
          </Link>
        }
      />

      <div className="mt-8 grid grid-cols-2 gap-3 sm:mt-10 lg:grid-cols-4">
        <Stat label="Total estimated" value={currency(total)} accent />
        <Stat label="Planned budget" value={budget ? currency(budget) : "—"} />
        <Stat label="Average / day" value={currency(total / nights)} />
        <Stat label="Stops" value={String(list.length)} />
      </div>

      {budget > 0 && (
        <div className="mt-6 border border-border bg-card p-6">
          <div className="flex justify-between font-mono text-[10px] uppercase tracking-widest">
            <span>Budget consumption</span>
            <span className={total > budget ? "text-destructive" : "text-primary"}>
              {pct}% · {currency(Math.abs(budget - total))} {total > budget ? "over" : "left"}
            </span>
          </div>
          <div className="mt-3 h-3 w-full bg-muted">
            <div
              className={`h-full ${total > budget ? "bg-destructive" : "bg-primary"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        <div>
          <h2 className="border-b border-border pb-2 font-mono text-[10px] font-bold uppercase tracking-widest">
            By category
          </h2>
          <div className="mt-4 space-y-3">
            {entries.map(([cat, val]) => (
              <div key={cat}>
                <div className="flex justify-between text-sm">
                  <span className="font-bold uppercase tracking-tight">{cat}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {currency(val)} · {Math.round((val / (total || 1)) * 100)}%
                  </span>
                </div>
                <div className="mt-1 h-2 w-full bg-muted">
                  <div className="h-full bg-foreground" style={{ width: `${(val / max) * 100}%` }} />
                </div>
              </div>
            ))}
            {entries.length === 0 && (
              <p className="font-mono text-[10px] uppercase text-muted-foreground">No costs recorded yet</p>
            )}
          </div>
        </div>

        <div>
          <h2 className="border-b border-border pb-2 font-mono text-[10px] font-bold uppercase tracking-widest">
            Activity spend per day
          </h2>
          <div className="mt-4 flex h-48 items-end gap-1.5 overflow-x-auto pb-2">
            {days.map((d) => {
              const daySpend = perDay[d] ?? 0;
              const heightPct = maxDay > 0 && daySpend > 0 ? Math.max(4, Math.round((daySpend / maxDay) * 100)) : 0;
              return (
                <div key={d} className="group flex h-full min-w-[20px] flex-1 flex-col items-center justify-end">
                  <span className="mb-1 font-mono text-[9px] font-medium opacity-0 transition-opacity group-hover:opacity-100 whitespace-nowrap">
                    {currency(daySpend)}
                  </span>
                  <div className="relative flex h-36 w-full items-end rounded-t-sm bg-muted/40">
                    <div
                      className="w-full rounded-t-sm bg-primary transition-all duration-300 group-hover:bg-primary/80"
                      style={{
                        height: `${heightPct}%`,
                        minHeight: 2,
                      }}
                    />
                  </div>
                  <span className="mt-1.5 font-mono text-[8px] uppercase text-muted-foreground group-hover:text-foreground">
                    {shortDate(d)}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex justify-between font-mono text-[9px] uppercase text-muted-foreground">
            <span>{shortDate(trip.start_date)}</span>
            <span>{shortDate(trip.end_date)}</span>
          </div>
        </div>
      </div>

      <div className="mt-12">
        <h2 className="border-b border-border pb-2 font-mono text-[10px] font-bold uppercase tracking-widest">
          Per stop
        </h2>
        <div className="mt-4 space-y-2">
          {list.map((s) => {
            const acts = s.trip_activities.reduce((sum, a) => sum + Number(a.cost), 0);
            const stopTotal = acts + Number(s.accommodation_cost) + Number(s.transport_cost);
            return (
              <div
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-3 border border-border bg-card p-4"
              >
                <div className="font-bold">
                  {s.cities?.name}
                  <span className="ml-2 font-mono text-[10px] uppercase text-muted-foreground">
                    {shortDate(s.arrival_date)} – {shortDate(s.departure_date)}
                  </span>
                </div>
                <div className="flex gap-5 font-mono text-[10px] uppercase">
                  <span>Stay {currency(Number(s.accommodation_cost))}</span>
                  <span>Transit {currency(Number(s.transport_cost))}</span>
                  <span>Activities {currency(acts)}</span>
                  <span className="text-primary">Total {currency(stopTotal)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`border p-5 ${accent ? "border-primary bg-primary/5" : "border-border bg-card"}`}>
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-2 text-3xl font-extrabold tracking-tighter">{value}</div>
    </div>
  );
}
