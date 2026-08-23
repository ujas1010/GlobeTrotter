import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell, SectionHeading } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { fetchTrips, shortDate, dayCount } from "@/lib/travel";

export const Route = createFileRoute("/_authenticated/trips/")({
  head: () => ({
    meta: [
      { title: "My Trips — GlobeTrotter" },
      { name: "description", content: "All of your saved travel itineraries in one list." },
      { property: "og:title", content: "My Trips — GlobeTrotter" },
      { property: "og:description", content: "Manage, edit and share your travel itineraries." },
    ],
  }),
  component: TripsPage,
});

function TripsPage() {
  const qc = useQueryClient();
  const { data: trips, isLoading } = useQuery({ queryKey: ["trips"], queryFn: fetchTrips });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("trips").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Trip deleted");
      qc.invalidateQueries({ queryKey: ["trips"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell>
      <SectionHeading
        eyebrow="Archive"
        title="My Trips"
        actions={
          <Link
            to="/trips/new"
            className="bg-primary px-6 py-2 text-xs font-bold uppercase tracking-widest text-primary-foreground shadow-lg shadow-primary/20"
          >
            New trip
          </Link>
        }
      />

      <div className="mt-10 space-y-3">
        {isLoading && <p className="font-mono text-xs uppercase text-muted-foreground">Loading…</p>}
        {(trips ?? []).map((t, i) => (
          <div
            key={t.id}
            className="animate-rise flex flex-col gap-4 border border-border bg-card p-4 sm:p-5 transition-colors hover:border-foreground md:flex-row md:items-center md:justify-between min-w-0"
          >
            <div className="flex items-start gap-3 sm:gap-6 min-w-0 flex-1">
              <span className="font-mono text-xs text-muted-foreground shrink-0 mt-0.5">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg sm:text-xl font-bold tracking-tight break-words">{t.name}</h3>
                <p className="font-mono text-[10px] uppercase text-muted-foreground">
                  {shortDate(t.start_date)} – {shortDate(t.end_date)} ·{" "}
                  {dayCount(t.start_date, t.end_date)} days · {t.is_public ? "public" : "private"}
                </p>
                {t.description && (
                  <p className="mt-1.5 max-w-[60ch] text-xs sm:text-sm text-muted-foreground break-words">{t.description}</p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                to="/trips/$tripId"
                params={{ tripId: t.id }}
                className="border border-border px-4 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-background"
              >
                Open
              </Link>
              <Link
                to="/trips/$tripId/budget"
                params={{ tripId: t.id }}
                className="border border-border px-4 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-background"
              >
                Budget
              </Link>
              <button
                onClick={() => {
                  if (confirm(`Delete "${t.name}"? This cannot be undone.`)) del.mutate(t.id);
                }}
                className="border border-destructive/30 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-destructive hover:bg-destructive/5"
              >
                Delete
              </button>
            </div>
          </div>
        ))}

        {!isLoading && (trips ?? []).length === 0 && (
          <div className="border border-dashed border-border p-12 text-center">
            <p className="font-mono text-xs uppercase text-muted-foreground">No trips saved yet</p>
            <Link
              to="/trips/new"
              className="mt-3 inline-block text-[10px] font-bold uppercase underline underline-offset-4"
            >
              Plan your first trip
            </Link>
          </div>
        )}
      </div>
    </AppShell>
  );
}
