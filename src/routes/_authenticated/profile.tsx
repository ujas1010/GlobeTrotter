import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell, SectionHeading } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Your profile — GlobeTrotter" },
      { name: "description", content: "Update your traveller name, avatar and preferred language." },
      { property: "og:title", content: "Your profile — GlobeTrotter" },
      { property: "og:description", content: "Manage your GlobeTrotter account details." },
    ],
  }),
  component: ProfilePage,
});

type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  language: string;
};

const PRESET_AVATARS = [
  { label: "Explorer", url: "https://api.dicebear.com/7.x/bottts/svg?seed=Explorer" },
  { label: "Nomad", url: "https://api.dicebear.com/7.x/bottts/svg?seed=Nomad" },
  { label: "Adventurer", url: "https://api.dicebear.com/7.x/bottts/svg?seed=Adventurer" },
  { label: "Voyager", url: "https://api.dicebear.com/7.x/bottts/svg?seed=Voyager" },
  { label: "Wanderer", url: "https://api.dicebear.com/7.x/bottts/svg?seed=Wanderer" },
  { label: "Pilot", url: "https://api.dicebear.com/7.x/bottts/svg?seed=Pilot" },
];

function ProfilePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState({ display_name: "", avatar_url: "", language: "en" });

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, language")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });

  useEffect(() => {
    if (profile) {
      setForm({
        display_name: profile.display_name ?? "",
        avatar_url: profile.avatar_url ?? "",
        language: profile.language ?? "en",
      });
    }
  }, [profile]);

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Please choose an image under 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setForm((prev) => ({ ...prev, avatar_url: reader.result as string }));
        toast.success("Image loaded! Click 'Save profile' to persist.");
      }
    };
    reader.readAsDataURL(file);
  }

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("profiles").upsert({
        id: user!.id,
        display_name: form.display_name.trim() || null,
        avatar_url: form.avatar_url.trim() || null,
        language: form.language,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile saved");
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const displayName = form.display_name || user?.email?.split("@")[0] || "Trotter";
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <AppShell>
      <SectionHeading eyebrow="Account" title="Profile" />

      <div className="mt-8 grid max-w-3xl gap-6 sm:mt-10 sm:gap-8">
        <div className="flex flex-wrap items-center gap-4 border border-border bg-card p-4 sm:gap-6 sm:p-6">
          <div className="relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-primary bg-muted font-mono text-lg font-bold shadow-md sm:size-20 sm:text-xl">
            {form.avatar_url ? (
              <img
                src={form.avatar_url}
                alt={displayName}
                className="size-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = "none";
                }}
              />
            ) : (
              initials
            )}
          </div>
          <div>
            <div className="text-lg font-extrabold tracking-tight sm:text-xl">{displayName}</div>
            <div className="font-mono text-xs text-muted-foreground">{user?.email ?? "—"}</div>
          </div>
        </div>

        {/* Avatar Settings */}
        <div className="space-y-4 border border-border bg-card p-4 sm:p-6">
          <div className="font-mono text-xs font-bold uppercase tracking-widest text-primary">
            Profile Avatar
          </div>

          <div>
            <label className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Choose Preset Avatar
            </label>
            <div className="flex flex-wrap gap-2.5 sm:gap-3">
              {PRESET_AVATARS.map((p) => (
                <button
                  type="button"
                  key={p.label}
                  onClick={() => setForm({ ...form, avatar_url: p.url })}
                  className={`flex flex-col items-center gap-1 rounded-lg border p-2 transition-all hover:border-primary ${
                    form.avatar_url === p.url ? "border-primary bg-primary/10 ring-1 ring-primary" : "border-border"
                  }`}
                >
                  <img src={p.url} alt={p.label} className="size-8 rounded-full bg-muted sm:size-10" />
                  <span className="font-mono text-[9px] uppercase">{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Upload Image
              </label>
              <label className="flex cursor-pointer items-center justify-center border border-dashed border-border bg-background px-4 py-2.5 text-xs font-mono uppercase tracking-wider hover:border-foreground">
                <span>Choose file from device</span>
                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>

            <div>
              <label className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Or Paste Image URL
              </label>
              <input
                value={form.avatar_url}
                onChange={(e) => setForm({ ...form, avatar_url: e.target.value })}
                placeholder="https://images.unsplash.com/..."
                className="w-full border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </div>
          </div>
        </div>

        {/* Name and Language Settings */}
        <div className="space-y-4 border border-border bg-card p-6">
          <div className="font-mono text-xs font-bold uppercase tracking-widest text-primary">
            Personal Details
          </div>

          <label className="block">
            <span className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Display name
            </span>
            <input
              value={form.display_name}
              onChange={(e) => setForm({ ...form, display_name: e.target.value })}
              className="w-full border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Preferred Language
            </span>
            <select
              value={form.language}
              onChange={(e) => setForm({ ...form, language: e.target.value })}
              className="w-full border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            >
              {["en", "fr", "es", "de", "ja", "hi"].map((l) => (
                <option key={l} value={l}>
                  {l.toUpperCase()}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div>
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="bg-primary px-8 py-3 text-xs font-bold uppercase tracking-widest text-primary-foreground shadow-lg shadow-primary/20 hover:brightness-110 disabled:opacity-50"
          >
            {save.isPending ? "Saving…" : "Save profile"}
          </button>
        </div>
      </div>
    </AppShell>
  );
}
