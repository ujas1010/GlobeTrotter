import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type WorldPlace = {
  geo_id: string;
  name: string;
  country: string;
  region: string;
  admin1: string | null;
  admin2: string | null;
  latitude: number;
  longitude: number;
  population: number | null;
  label: string;
};

const COUNTRY_TO_REGION: Record<string, string> = {
  India: "Asia",
  Japan: "Asia",
  China: "Asia",
  Thailand: "Asia",
  Singapore: "Asia",
  Indonesia: "Asia",
  Vietnam: "Asia",
  Malaysia: "Asia",
  "South Korea": "Asia",
  "United Arab Emirates": "Asia",
  "Saudi Arabia": "Asia",
  Nepal: "Asia",
  "Sri Lanka": "Asia",
  Maldives: "Asia",
  Philippines: "Asia",
  "United States": "Americas",
  USA: "Americas",
  Canada: "Americas",
  Mexico: "Americas",
  Brazil: "Americas",
  Argentina: "Americas",
  Chile: "Americas",
  Colombia: "Americas",
  Peru: "Americas",
  France: "Europe",
  Germany: "Europe",
  Italy: "Europe",
  Spain: "Europe",
  "United Kingdom": "Europe",
  UK: "Europe",
  Switzerland: "Europe",
  Netherlands: "Europe",
  Greece: "Europe",
  Portugal: "Europe",
  Austria: "Europe",
  Norway: "Europe",
  Sweden: "Europe",
  Denmark: "Europe",
  Finland: "Europe",
  Ireland: "Europe",
  Iceland: "Europe",
  Australia: "Oceania",
  "New Zealand": "Oceania",
  Fiji: "Oceania",
  "French Polynesia": "Oceania",
  "South Africa": "Africa",
  Egypt: "Africa",
  Morocco: "Africa",
  Kenya: "Africa",
  Tanzania: "Africa",
  Mauritius: "Africa",
  Seychelles: "Africa",
};

export function determineRegion(country?: string, tz?: string): string {
  if (country && COUNTRY_TO_REGION[country]) return COUNTRY_TO_REGION[country];
  const head = (tz ?? "").split("/")[0] ?? "";
  if (head === "Australia" || head === "Pacific") return "Oceania";
  if (head === "America") return "Americas";
  if (head === "Europe" || head === "Asia" || head === "Africa") return head;
  return "Other";
}

export async function queryWorldwidePlaces(query: string, count = 20): Promise<WorldPlace[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const [meteoRes, photonRes] = await Promise.allSettled([
    fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.trim())}&count=${Math.max(count, 20)}&language=en&format=json`,
      { headers: { accept: "application/json" } },
    ).then((r) => (r.ok ? r.json() : null)),
    fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(query.trim())}&limit=${Math.max(count, 20)}&lang=en`,
      { headers: { accept: "application/json" } },
    ).then((r) => (r.ok ? r.json() : null)),
  ]);

  type ScoredPlace = WorldPlace & { score: number };
  const places: ScoredPlace[] = [];
  const seen = new Set<string>();

  // Process Photon / OpenStreetMap features (superior for states, countries, districts, counties, islands)
  if (photonRes.status === "fulfilled" && photonRes.value?.features) {
    for (const f of photonRes.value.features) {
      const p = f.properties ?? {};
      const name = String(p.name || "").trim();
      if (!name) continue;

      const type = String(p.type || "").toLowerCase();
      const osmKey = String(p.osm_key || "").toLowerCase();
      const osmVal = String(p.osm_value || "").toLowerCase();

      const country = String(p.country || "").trim() || "Unknown";
      const admin1 = p.state ? String(p.state).trim() : null;
      const admin2 = p.district
        ? String(p.district).trim()
        : p.county
          ? String(p.county).trim()
          : p.city && p.city !== name
            ? String(p.city).trim()
            : null;

      const dedupKey = `${name}|${admin1 || ""}|${admin2 || ""}|${country}`.toLowerCase();
      if (seen.has(dedupKey)) continue;
      seen.add(dedupKey);

      const isPlaceType =
        [
          "country",
          "state",
          "county",
          "district",
          "city",
          "town",
          "village",
          "municipality",
          "administrative",
          "island",
          "archipelago",
          "region",
          "locality",
          "suburb",
        ].includes(type) ||
        ["place", "boundary"].includes(osmKey) ||
        ["country", "state", "administrative", "city", "town", "village", "island"].includes(osmVal);

      const coords = f.geometry?.coordinates ?? [0, 0];
      const labelParts = [name];
      if (admin2 && admin2.toLowerCase() !== name.toLowerCase()) labelParts.push(admin2);
      if (
        admin1 &&
        admin1.toLowerCase() !== name.toLowerCase() &&
        (!admin2 || admin1.toLowerCase() !== admin2.toLowerCase())
      ) {
        labelParts.push(admin1);
      }
      if (country && country.toLowerCase() !== name.toLowerCase()) labelParts.push(country);

      let score = 30;
      if (name.toLowerCase() === q) score += 120;
      else if (name.toLowerCase().startsWith(q)) score += 60;
      else if (name.toLowerCase().includes(q)) score += 30;
      if (isPlaceType) score += 40;
      if (
        ["country", "state", "administrative", "city"].includes(type) ||
        ["country", "state", "city"].includes(osmVal)
      ) {
        score += 30;
      }

      places.push({
        geo_id: `osm:${p.osm_type || "N"}:${p.osm_id || Math.random().toString(36).slice(2)}`,
        name,
        country,
        region: determineRegion(country),
        admin1,
        admin2,
        latitude: Number(coords[1] ?? 0),
        longitude: Number(coords[0] ?? 0),
        population: null,
        label: labelParts.join(", "),
        score,
      });
    }
  }

  // Process Open-Meteo features
  if (meteoRes.status === "fulfilled" && meteoRes.value?.results) {
    for (const r of meteoRes.value.results) {
      const name = String(r.name || "").trim();
      if (!name) continue;

      const country = String(r.country ?? r.country_code ?? "Unknown").trim();
      const admin1 = r.admin1 ? String(r.admin1).trim() : null;
      const admin2 = r.admin2 ? String(r.admin2).trim() : null;

      const dedupKey = `${name}|${admin1 || ""}|${admin2 || ""}|${country}`.toLowerCase();
      if (seen.has(dedupKey)) continue;
      seen.add(dedupKey);

      const labelParts = [name];
      if (admin2 && admin2.toLowerCase() !== name.toLowerCase()) labelParts.push(admin2);
      if (
        admin1 &&
        admin1.toLowerCase() !== name.toLowerCase() &&
        (!admin2 || admin1.toLowerCase() !== admin2.toLowerCase())
      ) {
        labelParts.push(admin1);
      }
      if (country && country.toLowerCase() !== name.toLowerCase()) labelParts.push(country);

      let score = 25;
      if (name.toLowerCase() === q) score += 120;
      else if (name.toLowerCase().startsWith(q)) score += 60;
      else if (name.toLowerCase().includes(q)) score += 30;
      if (r.population) score += Math.min(35, Math.round(Math.log10(r.population) * 5));

      places.push({
        geo_id: `openmeteo:${r.id}`,
        name,
        country,
        region: determineRegion(country, r.timezone),
        admin1,
        admin2,
        latitude: Number(r.latitude),
        longitude: Number(r.longitude),
        population: r.population != null ? Number(r.population) : null,
        label: labelParts.join(", "),
        score,
      });
    }
  }

  places.sort((a, b) => b.score - a.score);
  return places.slice(0, count).map(({ score, ...place }) => place);
}

export const searchWorldPlaces = createServerFn({ method: "GET" })
  .validator((data: unknown) =>
    z.object({ query: z.string().min(1).max(80), count: z.number().min(1).max(50).optional() }).parse(data),
  )
  .handler(async ({ data }): Promise<WorldPlace[]> => {
    try {
      return await queryWorldwidePlaces(data.query, data.count ?? 20);
    } catch {
      return [];
    }
  });

