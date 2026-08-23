import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, SectionHeading } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/trips/new")({
  head: () => ({
    meta: [
      { title: "Create a trip — GlobeTrotter" },
      { name: "description", content: "Start a new multi-city travel plan with dates and a budget." },
      { property: "og:title", content: "Create a trip — GlobeTrotter" },
      { property: "og:description", content: "Name your trip, set the dates and start building stops." },
    ],
  }),
  component: NewTrip,
});

function NewTrip() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    description: "",
    start_date: "",
    end_date: "",
    cover_image_url: "",
    budget: "",
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("trips")
        .insert({
          user_id: uid,
          name: form.name.trim(),
          description: form.description.trim() || null,
          start_date: form.start_date,
          end_date: form.end_date,
          cover_image_url: form.cover_image_url.trim() || null,
          budget: form.budget ? Number(form.budget) : null,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ["trips"] });
      toast.success("Trip created");
      navigate({ to: "/trips/$tripId", params: { tripId: id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Give the trip a name.");
      return;
    }
    if (!form.start_date || !form.end_date) {
      toast.error("Pick both travel dates.");
      return;
    }
    if (form.end_date < form.start_date) {
      toast.error("End date must follow the start date.");
      return;
    }
    create.mutate();
  }

  return (
    <AppShell>
      <SectionHeading eyebrow="New project" title="Create Trip" />
      <form onSubmit={submit} className="mt-10 grid max-w-3xl gap-6">
        <Field label="Trip name">
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="European Grand Tour"
            className="w-full border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
        </Field>

        <div className="grid gap-6 md:grid-cols-2">
          <Field label="Start date">
            <input
              type="date"
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              className="w-full border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
          </Field>
          <Field label="End date">
            <input
              type="date"
              value={form.end_date}
              onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              className="w-full border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
          </Field>
        </div>

        <Field label="Description">
          <textarea
            rows={4}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Slow rail across four cities, museums and long dinners."
            className="w-full border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
        </Field>

        <div className="grid gap-6 md:grid-cols-2">
          <Field label="Cover photo URL (optional)">
            <input
              value={form.cover_image_url}
              onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })}
              placeholder="https://…"
              className="w-full border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
          </Field>
          <Field label="Planned budget (USD)">
            <input
              type="number"
              min="0"
              value={form.budget}
              onChange={(e) => setForm({ ...form, budget: e.target.value })}
              placeholder="5500"
              className="w-full border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
          </Field>
        </div>

        <div>
          <button
            type="submit"
            disabled={create.isPending}
            className="bg-primary px-8 py-3 text-xs font-bold uppercase tracking-widest text-primary-foreground shadow-lg shadow-primary/20 disabled:opacity-50"
          >
            {create.isPending ? "Saving…" : "Save trip"}
          </button>
        </div>
      </form>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
