import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, SectionHeading } from "@/components/AppShell";
import {
  CATEGORIES,
  currency,
  ensureCityFromPlace,
  fetchActivities,
  fetchCities,
  searchPlaces,
  type WorldPlace,
} from "@/lib/travel";

const REGIONS = ["all", "Europe", "Asia", "Americas", "Africa", "Oceania"] as const;

export const Route = createFileRoute("/_authenticated/explore")({
  head: () => ({
    meta: [
      { title: "Discover destinations — GlobeTrotter" },
      { name: "description", content: "Search cities and activities by region, category and cost." },
      { property: "og:title", content: "Discover destinations — GlobeTrotter" },
      { property: "og:description", content: "Browse the catalogue of cities and things to do." },
    ],
  }),
  component: Explore,
});

function Explore() {
  const [tab, setTab] = useState<"cities" | "activities">("cities");
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState<string>("all");
  const [category, setCategory] = useState("all");
  const [adding, setAdding] = useState<string | null>(null);
  const qc = useQueryClient();

  const cities = useQuery({
    queryKey: ["cities", search, region],
    queryFn: () => fetchCities(search, region),
    enabled: tab === "cities",
  });

  const world = useQuery({
    queryKey: ["world-places", search],
    queryFn: () => searchPlaces(search, 24),
    enabled: tab === "cities" && search.trim().length >= 2,
    staleTime: 5 * 60 * 1000,
  });

  async function addPlace(p: WorldPlace) {
    setAdding(p.geo_id);
    try {
      const city = await ensureCityFromPlace(p);
      await qc.invalidateQueries({ queryKey: ["cities"] });
      toast.success(`${city.name} added to your catalogue`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add destination");
    } finally {
      setAdding(null);
    }
  }

  const activities = useQuery({
    queryKey: ["activities", search, "all", category],
    queryFn: () => fetchActivities({ search, category }),
    enabled: tab === "activities",
  });


  return (
    <AppShell>
      <SectionHeading
        eyebrow="Catalogue"
        title="Discover"
        actions={
          <div className="flex border border-border">
            {(["cities", "activities"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-5 py-2 font-mono text-[10px] uppercase tracking-widest ${
                  tab === t ? "bg-foreground text-background" : "hover:bg-card"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        }
      />

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={tab === "cities" ? "Search cities or countries…" : "Search activities…"}
          className="w-full border border-border bg-card px-4 py-3 text-sm outline-none focus:border-primary sm:min-w-64 sm:flex-1"
        />
        {tab === "cities" ? (
          <div className="flex flex-wrap gap-2">
            {REGIONS.map((r) => (
              <button
                key={r}
                onClick={() => setRegion(r)}
                className={`border px-3 py-2 font-mono text-[10px] uppercase tracking-widest sm:px-4 sm:py-3 ${
                  region === r ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-card"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        ) : (
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full border border-border bg-card px-4 py-3 text-sm sm:w-auto"
          >
            <option value="all">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}
      </div>

      {tab === "cities" ? (
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(cities.data ?? []).map((c) => (
            <article key={c.id} className="animate-rise group border border-border bg-card">
              {c.image_url && (
                <div className="h-40 overflow-hidden border-b border-border">
                  <img
                    src={c.image_url}
                    alt={`${c.name}, ${c.country}`}
                    loading="lazy"
                    className="size-full object-cover grayscale transition-all duration-500 group-hover:grayscale-0"
                  />
                </div>
              )}
              <div className="p-5">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-xl font-bold tracking-tight">{c.name}</h3>
                  <span className="font-mono text-[10px] uppercase text-muted-foreground">{c.country}</span>
                </div>
                <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{c.description}</p>
                <div className="mt-4 flex justify-between border-t border-border pt-3 font-mono text-[10px] uppercase">
                  <span>{c.region}</span>
                  <span>Cost index {c.cost_index}</span>
                  <span className="text-primary">Pop {c.popularity}</span>
                </div>
              </div>
            </article>
          ))}
          {cities.isLoading && (
            <p className="font-mono text-xs uppercase text-muted-foreground">Searching…</p>
          )}
        </div>
      ) : null}

      {tab === "cities" && search.trim().length >= 2 ? (
        <section className="mt-12">
          <div className="flex items-baseline justify-between border-t border-border pt-6">
            <h2 className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              Worldwide index · states, districts &amp; cities
            </h2>
            <span className="font-mono text-[10px] uppercase text-muted-foreground">
              {world.isFetching ? "Querying…" : `${world.data?.length ?? 0} matches`}
            </span>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {(world.data ?? []).map((p) => (
              <article key={p.geo_id} className="flex flex-col justify-between border border-border bg-card p-4">
                <div>
                  <h3 className="font-bold tracking-tight">{p.name}</h3>
                  <p className="mt-1 font-mono text-[10px] uppercase text-muted-foreground">
                    {[p.admin2, p.admin1, p.country].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-border pt-3 font-mono text-[10px] uppercase">
                  <span>{p.region}</span>
                  <button
                    onClick={() => addPlace(p)}
                    disabled={adding === p.geo_id}
                    className="border border-primary px-3 py-1 uppercase text-primary hover:bg-primary/10 disabled:opacity-50"
                  >
                    {adding === p.geo_id ? "Adding…" : "Add to catalogue"}
                  </button>
                </div>
              </article>
            ))}
            {!world.isFetching && (world.data?.length ?? 0) === 0 && (
              <p className="font-mono text-xs uppercase text-muted-foreground">No worldwide matches</p>
            )}
          </div>
        </section>
      ) : null}

      {tab === "activities" ? (

        <div className="mt-10 grid gap-3 md:grid-cols-2">
          {(activities.data ?? []).map((a) => (
            <article
              key={a.id}
              className="animate-rise flex items-start justify-between border border-border bg-card p-5"
            >
              <div>
                <h3 className="font-bold tracking-tight">{a.name}</h3>
                <p className="font-mono text-[10px] uppercase text-muted-foreground">
                  {a.cities?.name ?? "—"} · {a.category} · {a.duration_minutes}m
                </p>
                {a.description && <p className="mt-2 text-sm text-muted-foreground">{a.description}</p>}
              </div>
              <span className="ml-4 shrink-0 font-mono text-sm text-primary">{currency(Number(a.cost))}</span>
            </article>
          ))}
          {activities.isLoading && (
            <p className="font-mono text-xs uppercase text-muted-foreground">Searching…</p>
          )}
        </div>
      ) : null}

    </AppShell>
  );
}
