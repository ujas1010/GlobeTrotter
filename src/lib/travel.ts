import { supabase } from "@/integrations/supabase/client";
import { searchWorldPlaces, queryWorldwidePlaces, type WorldPlace } from "@/lib/places.functions";

export type { WorldPlace };


export type City = {
  id: string;
  name: string;
  country: string;
  region: string;
  cost_index: number;
  popularity: number;
  description: string | null;
  image_url: string | null;
  admin1?: string | null;
  admin2?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  geo_id?: string | null;
};



export type CatalogActivity = {
  id: string;
  city_id: string;
  name: string;
  category: string;
  cost: number;
  duration_minutes: number;
  description: string | null;
};

export type Trip = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  cover_image_url: string | null;
  budget: number | null;
  is_public: boolean;
  share_slug: string;
  created_at: string;
};

export type TripActivity = {
  id: string;
  stop_id: string;
  activity_id: string | null;
  name: string;
  category: string;
  scheduled_date: string;
  start_time: string | null;
  cost: number;
  duration_minutes: number;
  notes: string | null;
  position: number;
};

export type Stop = {
  id: string;
  trip_id: string;
  city_id: string;
  arrival_date: string;
  departure_date: string;
  position: number;
  transport_cost: number;
  accommodation_cost: number;
  cities: City | null;
  trip_activities: TripActivity[];
};

export const CATEGORIES = [
  "sightseeing",
  "food",
  "culture",
  "nature",
  "adventure",
  "wellness",
  "transport",
  "stay",
] as const;

export const currency = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
    Number.isFinite(n) ? n : 0,
  );

export const shortDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "2-digit" });
};

export const longDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
};

export function eachDay(start: string, end: string): string[] {
  const out: string[] = [];
  const [sy, sm, sd] = start.split("-").map(Number);
  const [ey, em, ed] = end.split("-").map(Number);
  if (!sy || !sm || !sd || !ey || !em || !ed) return out;

  const current = new Date(sy, sm - 1, sd);
  const last = new Date(ey, em - 1, ed);

  let guard = 0;
  while (current <= last && guard < 400) {
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, "0");
    const d = String(current.getDate()).padStart(2, "0");
    out.push(`${y}-${m}-${d}`);
    current.setDate(current.getDate() + 1);
    guard += 1;
  }
  return out;
}

export function dayCount(start: string, end: string) {
  return Math.max(1, eachDay(start, end).length);
}

export function tripCost(stops: Stop[]) {
  const byCategory: Record<string, number> = {};
  let total = 0;
  for (const s of stops) {
    byCategory['transport'] = (byCategory['transport'] ?? 0) + Number(s.transport_cost ?? 0);
    byCategory['stay'] = (byCategory['stay'] ?? 0) + Number(s.accommodation_cost ?? 0);
    total += Number(s.transport_cost ?? 0) + Number(s.accommodation_cost ?? 0);
    for (const a of s.trip_activities ?? []) {
      byCategory[a.category] = (byCategory[a.category] ?? 0) + Number(a.cost ?? 0);
      total += Number(a.cost ?? 0);
    }
  }
  return { total, byCategory };
}

export function costByDay(stops: Stop[]) {
  const map: Record<string, number> = {};
  for (const s of stops) {
    for (const a of s.trip_activities ?? []) {
      map[a.scheduled_date] = (map[a.scheduled_date] ?? 0) + Number(a.cost ?? 0);
    }
  }
  return map;
}

const STOP_SELECT =
  "id, trip_id, city_id, arrival_date, departure_date, position, transport_cost, accommodation_cost, cities(*), trip_activities(*)";

export async function fetchTrips() {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData?.user?.id;
  let q = supabase.from("trips").select("*").order("start_date", { ascending: true });
  if (uid) {
    q = q.eq("user_id", uid);
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Trip[];
}

export async function fetchTrip(tripId: string) {
  const { data, error } = await supabase.from("trips").select("*").eq("id", tripId).maybeSingle();
  if (error) throw error;
  return data as Trip | null;
}

export async function fetchTripBySlug(slug: string) {
  const { data, error } = await supabase
    .from("trips")
    .select("*")
    .eq("share_slug", slug)
    .eq("is_public", true)
    .maybeSingle();
  if (error) throw error;
  return data as Trip | null;
}

export async function fetchStops(tripId: string) {
  const { data, error } = await supabase
    .from("trip_stops")
    .select(STOP_SELECT)
    .eq("trip_id", tripId)
    .order("position", { ascending: true });
  if (error) throw error;
  const stops = (data ?? []) as unknown as Stop[];
  for (const s of stops) {
    s.trip_activities = (s.trip_activities ?? []).sort((a, b) =>
      a.scheduled_date === b.scheduled_date
        ? (a.start_time ?? "").localeCompare(b.start_time ?? "")
        : a.scheduled_date.localeCompare(b.scheduled_date),
    );
  }
  return stops;
}

export async function fetchCities(search = "", region = "all") {
  let q = supabase.from("cities").select("*").order("popularity", { ascending: false });
  if (search.trim()) q = q.or(`name.ilike.%${search}%,country.ilike.%${search}%`);
  if (region !== "all") q = q.eq("region", region);
  const { data, error } = await q.limit(60);
  if (error) throw error;
  return (data ?? []) as City[];
}

export async function fetchActivities(opts: { search?: string; cityId?: string; category?: string }) {
  let q = supabase.from("activities").select("*, cities(name, country)").order("name");
  if (opts.search?.trim()) q = q.ilike("name", `%${opts.search}%`);
  if (opts.cityId && opts.cityId !== "all") q = q.eq("city_id", opts.cityId);
  if (opts.category && opts.category !== "all") q = q.eq("category", opts.category);
  const { data, error } = await q.limit(80);
  if (error) throw error;
  return (data ?? []) as (CatalogActivity & { cities: { name: string; country: string } | null })[];
}

export function placeLabel(p: WorldPlace) {
  return p.label;
}

/** Worldwide place search (countries, states, districts, cities, islands) via the geocoding API. */
export async function searchPlaces(query: string, count = 20): Promise<WorldPlace[]> {
  if (!query.trim()) return [];
  try {
    const res = await searchWorldPlaces({ data: { query: query.trim(), count } });
    if (res && res.length > 0) return res;
  } catch {
    // fallback to direct fetch if server fn is unavailable
  }
  return await queryWorldwidePlaces(query.trim(), count);
}

/** Find or create a catalogue city from a worldwide place result. */
export async function ensureCityFromPlace(place: WorldPlace): Promise<City> {
  if (place.geo_id) {
    const existing = await supabase.from("cities").select("*").eq("geo_id", place.geo_id).maybeSingle();
    if (existing.error && existing.error.code !== "PGRST116") throw existing.error;
    if (existing.data) return existing.data as City;
  }

  // Also check if city with matching name & country already exists
  const existingByName = await supabase
    .from("cities")
    .select("*")
    .ilike("name", place.name)
    .ilike("country", place.country)
    .maybeSingle();

  if (existingByName.data) {
    if (!existingByName.data.geo_id && place.geo_id) {
      await supabase.from("cities").update({ geo_id: place.geo_id }).eq("id", existingByName.data.id);
    }
    return existingByName.data as City;
  }

  const pop = place.population ?? 0;
  const popularity = Math.max(10, Math.min(95, Math.round(Math.log10(pop + 10) * 18))) || 50;
  const description = [place.admin2, place.admin1, place.country].filter(Boolean).join(", ");

  const { data, error } = await supabase
    .from("cities")
    .insert({
      name: place.name,
      country: place.country,
      region: place.region || "Other",
      cost_index: 50,
      popularity,
      description: description || null,
      admin1: place.admin1,
      admin2: place.admin2,
      latitude: place.latitude,
      longitude: place.longitude,
      geo_id: place.geo_id,
    })
    .select("*")
    .single();

  if (error) {
    const retry = await supabase.from("cities").select("*").ilike("name", place.name).maybeSingle();
    if (retry.data) return retry.data as City;
    throw error;
  }
  return data as City;
}

