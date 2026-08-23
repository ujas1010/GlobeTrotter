import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import {
  CATEGORIES,
  currency,
  dayCount,
  eachDay,
  ensureCityFromPlace,
  fetchActivities,
  fetchCities,
  fetchStops,
  fetchTrip,
  longDate,
  searchPlaces,
  shortDate,
  tripCost,
  type City,
  type Stop,
  type Trip,
  type TripActivity,
  type WorldPlace,
} from "@/lib/travel";

export const Route = createFileRoute("/_authenticated/trips/$tripId/")({
  head: () => ({
    meta: [
      { title: "Itinerary builder — GlobeTrotter" },
      { name: "description", content: "Add cities, dates and activities to build your day-wise plan." },
      { property: "og:title", content: "Itinerary builder — GlobeTrotter" },
      { property: "og:description", content: "Construct your multi-city trip stop by stop." },
    ],
  }),
  component: TripBuilder,
});

function TripBuilder() {
  const { tripId } = Route.useParams();
  const qc = useQueryClient();
  const [view, setView] = useState<"list" | "calendar">("list");
  const [addingStop, setAddingStop] = useState(false);
  const [editingTrip, setEditingTrip] = useState(false);
  const [editingStop, setEditingStop] = useState<Stop | null>(null);
  const [editingActivity, setEditingActivity] = useState<{ activity: TripActivity; stop: Stop } | null>(null);
  const [activityFor, setActivityFor] = useState<Stop | null>(null);

  const { data: trip } = useQuery({ queryKey: ["trip", tripId], queryFn: () => fetchTrip(tripId) });
  const { data: stops } = useQuery({ queryKey: ["stops", tripId], queryFn: () => fetchStops(tripId) });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["stops", tripId] });
    qc.invalidateQueries({ queryKey: ["stops"] });
  };

  const move = useMutation({
    mutationFn: async ({ index, dir }: { index: number; dir: -1 | 1 }) => {
      const list = stops ?? [];
      const other = list[index + dir];
      const current = list[index];
      if (!other || !current) return;
      await supabase.from("trip_stops").update({ position: other.position }).eq("id", current.id);
      await supabase.from("trip_stops").update({ position: current.position }).eq("id", other.id);
    },
    onSuccess: refresh,
  });

  const removeStop = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("trip_stops").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Stop removed");
      refresh();
    },
  });

  const removeActivity = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("trip_activities").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: refresh,
  });

  const togglePublic = useMutation({
    mutationFn: async (val: boolean) => {
      const { error } = await supabase.from("trips").update({ is_public: val }).eq("id", tripId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trip", tripId] });
      toast.success("Sharing updated");
    },
  });

  if (!trip) {
    return (
      <AppShell>
        <p className="font-mono text-xs uppercase text-muted-foreground">Loading trip…</p>
      </AppShell>
    );
  }

  const list = stops ?? [];
  const cost = tripCost(list);
  const days = eachDay(trip.start_date, trip.end_date);

  return (
    <AppShell>
      <div className="flex flex-col gap-4 border-b border-border bg-background pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 font-mono text-[10px] uppercase text-primary">
            {longDate(trip.start_date)} — {longDate(trip.end_date)} ·{" "}
            {dayCount(trip.start_date, trip.end_date)} days
          </div>
          <h1 className="text-3xl font-extrabold uppercase tracking-tighter sm:text-4xl md:text-5xl">{trip.name}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex border border-border">
            {(["list", "calendar"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-4 py-2 font-mono text-[10px] uppercase tracking-widest ${
                  view === v ? "bg-foreground text-background" : "hover:bg-card"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <button
            onClick={() => setEditingTrip(!editingTrip)}
            className="border border-border px-4 py-2 font-mono text-[10px] uppercase tracking-widest hover:bg-card"
          >
            {editingTrip ? "Cancel edit" : "✎ Edit Trip"}
          </button>
          <Link
            to="/trips/$tripId/budget"
            params={{ tripId }}
            className="border border-border px-4 py-2 font-mono text-[10px] uppercase tracking-widest hover:bg-card"
          >
            Budget {currency(cost.total)}
          </Link>
          <button
            onClick={() => togglePublic.mutate(!trip.is_public)}
            className="border border-border px-4 py-2 font-mono text-[10px] uppercase tracking-widest hover:bg-card"
          >
            {trip.is_public ? "Public" : "Private"}
          </button>
          {trip.is_public && (
            <a
              href={`/share/${trip.share_slug}`}
              target="_blank"
              rel="noreferrer"
              className="border border-border px-4 py-2 font-mono text-[10px] uppercase tracking-widest hover:bg-card"
            >
              Share link
            </a>
          )}
          <button
            onClick={() => setAddingStop(true)}
            className="bg-primary px-6 py-2 text-xs font-bold uppercase tracking-widest text-primary-foreground shadow-lg shadow-primary/20"
          >
            Add stop
          </button>
        </div>
      </div>

      {editingTrip && (
        <EditTripPanel
          trip={trip}
          onDone={() => {
            setEditingTrip(false);
            qc.invalidateQueries({ queryKey: ["trip", tripId] });
            refresh();
          }}
        />
      )}

      {addingStop && (
        <AddStopPanel tripId={tripId} nextPosition={list.length} onDone={() => { setAddingStop(false); refresh(); }} />
      )}

      {activityFor && (
        <AddActivityPanel
          stop={activityFor}
          onDone={() => {
            setActivityFor(null);
            refresh();
          }}
        />
      )}

      {view === "list" ? (
        <div className="mt-12 space-y-16">
          {list.map((s, i) => (
            <section key={s.id} className="animate-rise relative pl-8 md:pl-20">
              <div className="absolute bottom-[-4rem] left-[7px] top-0 w-px bg-border md:left-[19px]" />
              <div
                className={`absolute left-0 top-0 size-4 ring-4 ring-background md:left-[12px] ${
                  i === 0 ? "bg-primary" : "border-2 border-border bg-background"
                }`}
              />
              <div className="flex flex-col gap-8 md:flex-row md:items-start">
                <div className="flex-shrink-0 md:w-32">
                  <span className="block text-4xl font-extrabold leading-none tracking-tighter">
                    STOP {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="font-mono text-xs uppercase text-muted-foreground">
                    {shortDate(s.arrival_date)} – {shortDate(s.departure_date)}
                  </span>
                  <div className="mt-3 flex gap-1">
                    <button
                      onClick={() => move.mutate({ index: i, dir: -1 })}
                      disabled={i === 0}
                      className="border border-border px-2 py-1 font-mono text-[10px] disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => move.mutate({ index: i, dir: 1 })}
                      disabled={i === list.length - 1}
                      className="border border-border px-2 py-1 font-mono text-[10px] disabled:opacity-30"
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => removeStop.mutate(s.id)}
                      className="border border-border px-2 py-1 font-mono text-[10px] text-destructive"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div className="flex-1 space-y-6">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-2xl font-bold tracking-tight">
                      {s.cities?.name}, {s.cities?.country}
                    </h3>
                    <span className="border border-foreground/10 px-2 py-0.5 font-mono text-[10px] uppercase">
                      Stay {currency(Number(s.accommodation_cost))} · Transit{" "}
                      {currency(Number(s.transport_cost))}
                    </span>
                    <button
                      onClick={() => setEditingStop(editingStop?.id === s.id ? null : s)}
                      className="border border-border px-2 py-0.5 font-mono text-[10px] uppercase hover:bg-card"
                    >
                      {editingStop?.id === s.id ? "Cancel edit" : "✎ Edit stop"}
                    </button>
                    <button
                      onClick={() => setActivityFor(s)}
                      className="ml-auto text-[10px] font-bold uppercase underline underline-offset-4"
                    >
                      + Add activity
                    </button>
                  </div>

                  {editingStop?.id === s.id && (
                    <EditStopPanel
                      stop={s}
                      onDone={() => {
                        setEditingStop(null);
                        refresh();
                      }}
                    />
                  )}

                  <div className="space-y-2">
                    {s.trip_activities.map((a) => (
                      <div key={a.id} className="space-y-2">
                        <div
                          className="group flex items-center justify-between border border-border bg-card p-4 transition-all hover:border-foreground"
                        >
                          <div className="flex items-center gap-4">
                            <div className="font-mono text-[10px] text-muted-foreground">
                              {a.start_time?.slice(0, 5) ?? "--:--"}
                            </div>
                            <div>
                              <div className="font-bold">{a.name}</div>
                              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                {shortDate(a.scheduled_date)} · {a.category} / {currency(Number(a.cost))} ·{" "}
                                {a.duration_minutes}m
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                            <button
                              onClick={() =>
                                setEditingActivity(
                                  editingActivity?.activity.id === a.id ? null : { activity: a, stop: s }
                                )
                              }
                              className="text-[10px] font-bold uppercase hover:underline"
                            >
                              ✎ Edit
                            </button>
                            <button
                              onClick={() => removeActivity.mutate(a.id)}
                              className="text-[10px] font-bold uppercase text-destructive hover:underline"
                            >
                              ✕ Remove
                            </button>
                          </div>
                        </div>
                        {editingActivity?.activity.id === a.id && (
                          <EditActivityPanel
                            activity={a}
                            stop={s}
                            onDone={() => {
                              setEditingActivity(null);
                              refresh();
                            }}
                          />
                        )}
                      </div>
                    ))}
                    {s.trip_activities.length === 0 && (
                      <div className="flex flex-col items-center justify-center gap-2 border border-dashed border-border p-6">
                        <div className="font-mono text-xs text-muted-foreground">NO ACTIVITIES ADDED</div>
                        <button
                          onClick={() => setActivityFor(s)}
                          className="text-[10px] font-bold uppercase underline underline-offset-4"
                        >
                          Add to timeline
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          ))}

          <section className="relative pl-8 md:pl-20">
            <div className="absolute left-0 top-0 size-4 border-2 border-border bg-background ring-4 ring-background md:left-[12px]" />
            <div className="flex items-center justify-center bg-foreground/5 p-12">
              <span className="font-mono text-[10px] uppercase tracking-widest">End of itinerary</span>
            </div>
          </section>
        </div>
      ) : (
        <CalendarView days={days} stops={list} />
      )}
    </AppShell>
  );
}

function CalendarView({ days, stops }: { days: string[]; stops: Stop[] }) {
  const byDay: Record<string, { stop: Stop; items: Stop["trip_activities"] }[]> = {};
  for (const s of stops) {
    for (const a of s.trip_activities) {
      const list = byDay[a.scheduled_date] ?? [];
      byDay[a.scheduled_date] = list;
      const bucket = list.find((b) => b.stop.id === s.id);
      if (bucket) bucket.items.push(a);
      else list.push({ stop: s, items: [a] });
    }
  }

  return (
    <div className="mt-12 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {days.map((d, i) => {
        const groups = byDay[d] ?? [];
        const total = groups.flatMap((g) => g.items).reduce((sum, a) => sum + Number(a.cost), 0);
        return (
          <div key={d} className="animate-rise border border-border bg-card p-4">
            <div className="flex items-baseline justify-between border-b border-border pb-2">
              <span className="text-lg font-extrabold tracking-tighter">
                DAY {String(i + 1).padStart(2, "0")}
              </span>
              <span className="font-mono text-[10px] uppercase text-muted-foreground">{shortDate(d)}</span>
            </div>
            <div className="mt-3 space-y-2">
              {groups.map((g) => (
                <div key={g.stop.id}>
                  <div className="font-mono text-[10px] uppercase text-primary">{g.stop.cities?.name}</div>
                  {g.items.map((a) => (
                    <div key={a.id} className="flex justify-between py-1 text-sm">
                      <span className="font-medium">
                        {a.start_time?.slice(0, 5) ?? "--:--"} {a.name}
                      </span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {currency(Number(a.cost))}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
              {groups.length === 0 && (
                <p className="py-4 text-center font-mono text-[10px] uppercase text-muted-foreground">
                  Unscheduled
                </p>
              )}
            </div>
            <div className="mt-3 border-t border-border pt-2 text-right font-mono text-[10px] uppercase">
              {currency(total)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AddStopPanel({
  tripId,
  nextPosition,
  onDone,
}: {
  tripId: string;
  nextPosition: number;
  onDone: () => void;
}) {
  const [search, setSearch] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<City | WorldPlace | null>(null);
  const [arrival, setArrival] = useState("");
  const [departure, setDeparture] = useState("");
  const [stay, setStay] = useState("");
  const [transit, setTransit] = useState("");

  const { data: catalogueCities } = useQuery({
    queryKey: ["cities", search, "all"],
    queryFn: () => fetchCities(search),
  });

  const { data: worldPlaces } = useQuery({
    queryKey: ["world-places", search],
    queryFn: () => searchPlaces(search, 30),
    enabled: search.trim().length >= 2,
    staleTime: 5 * 60 * 1000,
  });

  // Combine and deduplicate items seamlessly
  const items: { key: string; name: string; subtitle: string; raw: City | WorldPlace }[] = [];
  const seenKeys = new Set<string>();

  if (selectedPlace) {
    const key = "id" in selectedPlace && selectedPlace.id ? selectedPlace.id : (selectedPlace as WorldPlace).geo_id;
    const name = selectedPlace.name;
    const subtitle =
      [selectedPlace.admin2, selectedPlace.admin1, selectedPlace.country].filter(Boolean).join(" · ") ||
      selectedPlace.country;
    items.push({ key, name, subtitle, raw: selectedPlace });
    seenKeys.add(key);
    seenKeys.add(`${name}|${selectedPlace.country}`.toLowerCase());
  }

  for (const c of catalogueCities ?? []) {
    const key = c.id;
    const nameKey = `${c.name}|${c.country}`.toLowerCase();
    if (seenKeys.has(key) || seenKeys.has(nameKey)) continue;
    seenKeys.add(key);
    seenKeys.add(nameKey);
    const subtitle =
      [c.admin2, c.admin1, c.country].filter(Boolean).join(" · ") ||
      `${c.country} · cost ${c.cost_index} · pop ${c.popularity}`;
    items.push({ key, name: c.name, subtitle, raw: c });
  }

  for (const p of worldPlaces ?? []) {
    const key = p.geo_id;
    const nameKey = `${p.name}|${p.country}`.toLowerCase();
    if (seenKeys.has(key) || seenKeys.has(nameKey)) continue;
    seenKeys.add(key);
    seenKeys.add(nameKey);
    const subtitle = [p.admin2, p.admin1, p.country].filter(Boolean).join(" · ") || p.country;
    items.push({ key, name: p.name, subtitle, raw: p });
  }

  const selectedKey = selectedPlace
    ? "id" in selectedPlace && selectedPlace.id
      ? selectedPlace.id
      : (selectedPlace as WorldPlace).geo_id
    : "";

  const save = useMutation({
    mutationFn: async () => {
      if (!selectedPlace) throw new Error("Pick a city.");
      let resolvedCityId = "";
      if ("id" in selectedPlace && selectedPlace.id) {
        resolvedCityId = selectedPlace.id;
      } else {
        const city = await ensureCityFromPlace(selectedPlace as WorldPlace);
        resolvedCityId = city.id;
      }

      const { error } = await supabase.from("trip_stops").insert({
        trip_id: tripId,
        city_id: resolvedCityId,
        arrival_date: arrival,
        departure_date: departure,
        position: nextPosition,
        accommodation_cost: stay ? Number(stay) : 0,
        transport_cost: transit ? Number(transit) : 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Stop added");
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mt-8 border border-primary/30 bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-mono text-xs font-bold uppercase tracking-widest">Add a stop</h3>
        <button onClick={onDone} className="font-mono text-[10px] uppercase underline">
          Close
        </button>
      </div>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search cities by name or country…"
        className="w-full border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
      />
      <div className="mt-3 grid max-h-56 gap-2 overflow-y-auto md:grid-cols-3">
        {items.map((item) => (
          <button
            key={item.key}
            onClick={() => setSelectedPlace(item.raw)}
            className={`border p-3 text-left transition-colors ${
              selectedKey === item.key ? "border-primary bg-accent" : "border-border hover:border-foreground"
            }`}
          >
            <div className="font-bold">{item.name}</div>
            <div className="font-mono text-[10px] uppercase text-muted-foreground">{item.subtitle}</div>
          </button>
        ))}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <input
          type="date"
          value={arrival}
          onChange={(e) => setArrival(e.target.value)}
          className="border border-border bg-background px-3 py-2.5 text-sm"
        />
        <input
          type="date"
          value={departure}
          onChange={(e) => setDeparture(e.target.value)}
          className="border border-border bg-background px-3 py-2.5 text-sm"
        />
        <input
          type="number"
          value={stay}
          onChange={(e) => setStay(e.target.value)}
          placeholder="Stay cost"
          className="border border-border bg-background px-3 py-2.5 text-sm"
        />
        <input
          type="number"
          value={transit}
          onChange={(e) => setTransit(e.target.value)}
          placeholder="Transport cost"
          className="border border-border bg-background px-3 py-2.5 text-sm"
        />
      </div>
      <button
        onClick={() => {
          if (!selectedPlace) {
            toast.error("Pick a city.");
            return;
          }
          if (!arrival || !departure) {
            toast.error("Set arrival and departure dates.");
            return;
          }
          save.mutate();
        }}
        disabled={save.isPending}
        className="mt-4 bg-foreground px-6 py-2 text-xs font-bold uppercase tracking-widest text-background hover:bg-primary disabled:opacity-50"
      >
        {save.isPending ? "Saving…" : "Save stop"}
      </button>
    </div>
  );
}

function AddActivityPanel({ stop, onDone }: { stop: Stop; onDone: () => void }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [date, setDate] = useState(stop.arrival_date);
  const [time, setTime] = useState("09:00");
  const [custom, setCustom] = useState({ name: "", cost: "", category: "sightseeing", duration: "60" });

  const { data: catalog } = useQuery({
    queryKey: ["activities", search, stop.city_id, category],
    queryFn: () => fetchActivities({ search, cityId: stop.city_id, category }),
  });

  const days = eachDay(stop.arrival_date, stop.departure_date);

  const add = useMutation({
    mutationFn: async (payload: {
      name: string;
      category: string;
      cost: number;
      duration: number;
      activity_id?: string;
    }) => {
      const { error } = await supabase.from("trip_activities").insert({
        stop_id: stop.id,
        activity_id: payload.activity_id ?? null,
        name: payload.name,
        category: payload.category,
        cost: payload.cost,
        duration_minutes: payload.duration,
        scheduled_date: date,
        start_time: time || null,
        position: stop.trip_activities.length,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Activity added");
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mt-8 border border-primary/30 bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-mono text-xs font-bold uppercase tracking-widest">
          Activities in {stop.cities?.name}
        </h3>
        <button onClick={onDone} className="font-mono text-[10px] uppercase underline">
          Close
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search activities…"
          className="border border-border bg-background px-3 py-2.5 text-sm md:col-span-2"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="border border-border bg-background px-3 py-2.5 text-sm"
        >
          <option value="all">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <select
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border border-border bg-background px-2 py-2.5 text-sm"
          >
            {days.map((d) => (
              <option key={d} value={d}>
                {shortDate(d)}
              </option>
            ))}
          </select>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="border border-border bg-background px-2 py-2.5 text-sm"
          />
        </div>
      </div>

      <div className="mt-4 grid max-h-64 gap-2 overflow-y-auto md:grid-cols-2">
        {(catalog ?? []).map((a) => (
          <div key={a.id} className="flex items-start justify-between border border-border p-3">
            <div>
              <div className="font-bold">{a.name}</div>
              <div className="font-mono text-[10px] uppercase text-muted-foreground">
                {a.category} · {currency(Number(a.cost))} · {a.duration_minutes}m
              </div>
              {a.description && <p className="mt-1 text-xs text-muted-foreground">{a.description}</p>}
            </div>
            <button
              onClick={() =>
                add.mutate({
                  name: a.name,
                  category: a.category,
                  cost: Number(a.cost),
                  duration: a.duration_minutes,
                  activity_id: a.id,
                })
              }
              className="ml-3 shrink-0 border border-border px-3 py-1 font-mono text-[10px] uppercase hover:bg-background"
            >
              Add
            </button>
          </div>
        ))}
        {(catalog ?? []).length === 0 && (
          <p className="font-mono text-[10px] uppercase text-muted-foreground">No catalogue matches</p>
        )}
      </div>

      <div className="mt-6 border-t border-border pt-4">
        <div className="mb-2 font-mono text-[10px] font-bold uppercase tracking-widest">
          Or add your own
        </div>
        <div className="grid gap-3 md:grid-cols-5">
          <input
            value={custom.name}
            onChange={(e) => setCustom({ ...custom, name: e.target.value })}
            placeholder="Activity name"
            className="border border-border bg-background px-3 py-2.5 text-sm md:col-span-2"
          />
          <select
            value={custom.category}
            onChange={(e) => setCustom({ ...custom, category: e.target.value })}
            className="border border-border bg-background px-3 py-2.5 text-sm"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            type="number"
            value={custom.cost}
            onChange={(e) => setCustom({ ...custom, cost: e.target.value })}
            placeholder="Cost"
            className="border border-border bg-background px-3 py-2.5 text-sm"
          />
          <button
            onClick={() => {
              if (!custom.name.trim()) {
                toast.error("Name the activity.");
                return;
              }
              add.mutate({
                name: custom.name.trim(),
                category: custom.category,
                cost: Number(custom.cost || 0),
                duration: Number(custom.duration || 60),
              });
            }}
            className="bg-foreground px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-background hover:bg-primary"
          >
            Add custom
          </button>
        </div>
      </div>
    </div>
  );
}

function EditTripPanel({
  trip,
  onDone,
}: {
  trip: Trip;
  onDone: () => void;
}) {
  const [name, setName] = useState(trip.name);
  const [description, setDescription] = useState(trip.description ?? "");
  const [startDate, setStartDate] = useState(trip.start_date);
  const [endDate, setEndDate] = useState(trip.end_date);
  const [budget, setBudget] = useState(String(trip.budget ?? ""));

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("trips")
        .update({
          name: name.trim(),
          description: description.trim() || null,
          start_date: startDate,
          end_date: endDate,
          budget: budget ? Number(budget) : null,
        })
        .eq("id", trip.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Trip updated");
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mt-6 border border-primary/30 bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-primary">
          ✎ Edit Trip Details
        </h3>
        <button onClick={onDone} className="font-mono text-[10px] uppercase underline">
          Close
        </button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block font-mono text-[9px] uppercase text-muted-foreground">
            Trip Name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="mb-1 block font-mono text-[9px] uppercase text-muted-foreground">
            Budget ($)
          </label>
          <input
            type="number"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            className="w-full border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="mb-1 block font-mono text-[9px] uppercase text-muted-foreground">
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="mb-1 block font-mono text-[9px] uppercase text-muted-foreground">
            End Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
        </div>
        <div className="md:col-span-2">
          <label className="mb-1 block font-mono text-[9px] uppercase text-muted-foreground">
            Description
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
        </div>
      </div>
      <div className="mt-4 flex gap-3">
        <button
          onClick={() => {
            if (!name.trim()) {
              toast.error("Name the trip.");
              return;
            }
            if (!startDate || !endDate) {
              toast.error("Set start and end dates.");
              return;
            }
            save.mutate();
          }}
          disabled={save.isPending}
          className="bg-foreground px-6 py-2 text-xs font-bold uppercase tracking-widest text-background hover:bg-primary disabled:opacity-50"
        >
          {save.isPending ? "Saving…" : "Save changes"}
        </button>
        <button
          onClick={onDone}
          className="border border-border px-6 py-2 text-xs font-bold uppercase tracking-widest hover:bg-background"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function EditStopPanel({
  stop,
  onDone,
}: {
  stop: Stop;
  onDone: () => void;
}) {
  const [arrival, setArrival] = useState(stop.arrival_date);
  const [departure, setDeparture] = useState(stop.departure_date);
  const [stay, setStay] = useState(String(stop.accommodation_cost || ""));
  const [transit, setTransit] = useState(String(stop.transport_cost || ""));

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("trip_stops")
        .update({
          arrival_date: arrival,
          departure_date: departure,
          accommodation_cost: stay ? Number(stay) : 0,
          transport_cost: transit ? Number(transit) : 0,
        })
        .eq("id", stop.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Stop updated");
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mt-4 border border-primary/30 bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-primary">
          ✎ Edit Stop: {stop.cities?.name}, {stop.cities?.country}
        </h3>
        <button onClick={onDone} className="font-mono text-[10px] uppercase underline">
          Close
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="mb-1 block font-mono text-[9px] uppercase text-muted-foreground">Arrival</label>
          <input
            type="date"
            value={arrival}
            onChange={(e) => setArrival(e.target.value)}
            className="w-full border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="mb-1 block font-mono text-[9px] uppercase text-muted-foreground">Departure</label>
          <input
            type="date"
            value={departure}
            onChange={(e) => setDeparture(e.target.value)}
            className="w-full border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="mb-1 block font-mono text-[9px] uppercase text-muted-foreground">Stay Cost ($)</label>
          <input
            type="number"
            value={stay}
            onChange={(e) => setStay(e.target.value)}
            placeholder="Stay cost"
            className="w-full border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="mb-1 block font-mono text-[9px] uppercase text-muted-foreground">Transport Cost ($)</label>
          <input
            type="number"
            value={transit}
            onChange={(e) => setTransit(e.target.value)}
            placeholder="Transport cost"
            className="w-full border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          onClick={() => {
            if (!arrival || !departure) {
              toast.error("Set arrival and departure dates.");
              return;
            }
            save.mutate();
          }}
          disabled={save.isPending}
          className="bg-foreground px-6 py-2 text-xs font-bold uppercase tracking-widest text-background hover:bg-primary disabled:opacity-50"
        >
          {save.isPending ? "Saving…" : "Save changes"}
        </button>
        <button
          onClick={onDone}
          className="border border-border px-6 py-2 text-xs font-bold uppercase tracking-widest hover:bg-background"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function EditActivityPanel({
  activity,
  stop,
  onDone,
}: {
  activity: TripActivity;
  stop: Stop;
  onDone: () => void;
}) {
  const [name, setName] = useState(activity.name);
  const [category, setCategory] = useState(activity.category);
  const [date, setDate] = useState(activity.scheduled_date);
  const [time, setTime] = useState(activity.start_time?.slice(0, 5) ?? "09:00");
  const [cost, setCost] = useState(String(activity.cost || ""));
  const [duration, setDuration] = useState(String(activity.duration_minutes || "60"));

  const days = eachDay(stop.arrival_date, stop.departure_date);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("trip_activities")
        .update({
          name: name.trim(),
          category,
          scheduled_date: date,
          start_time: time || null,
          cost: cost ? Number(cost) : 0,
          duration_minutes: duration ? Number(duration) : 60,
        })
        .eq("id", activity.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Activity updated");
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mt-3 border border-primary/30 bg-card p-4 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-primary">
          ✎ Edit Activity
        </h3>
        <button onClick={onDone} className="font-mono text-[10px] uppercase underline">
          Close
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <div className="md:col-span-2">
          <label className="mb-1 block font-mono text-[9px] uppercase text-muted-foreground">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Activity name"
            className="w-full border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="mb-1 block font-mono text-[9px] uppercase text-muted-foreground">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block font-mono text-[9px] uppercase text-muted-foreground">Date</label>
          <select
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border border-border bg-background px-2 py-2.5 text-sm outline-none focus:border-primary"
          >
            {days.map((d) => (
              <option key={d} value={d}>
                {shortDate(d)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block font-mono text-[9px] uppercase text-muted-foreground">Time</label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full border border-border bg-background px-2 py-2.5 text-sm outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="mb-1 block font-mono text-[9px] uppercase text-muted-foreground">Cost ($)</label>
          <input
            type="number"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            placeholder="Cost"
            className="w-full border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
        </div>
      </div>
      <div className="mt-4 flex gap-3">
        <button
          onClick={() => {
            if (!name.trim()) {
              toast.error("Name the activity.");
              return;
            }
            save.mutate();
          }}
          disabled={save.isPending}
          className="bg-foreground px-6 py-2 text-xs font-bold uppercase tracking-widest text-background hover:bg-primary disabled:opacity-50"
        >
          {save.isPending ? "Saving…" : "Save changes"}
        </button>
        <button
          onClick={onDone}
          className="border border-border px-6 py-2 text-xs font-bold uppercase tracking-widest hover:bg-background"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

