import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useRef, useEffect, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const NAV = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/trips", label: "My Trips" },
  { to: "/explore", label: "Destinations" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    user?.email?.split("@")[0] ||
    "??";

  const initials = (displayName.includes(" ")
    ? displayName.split(" ").map((w: string) => w[0]).join("")
    : displayName
  ).slice(0, 2).toUpperCase();

  const avatarUrl =
    profile?.avatar_url || meta?.["avatar_url"] || meta?.["picture"] || null;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Navbar */}
      <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-border bg-background/90 px-3.5 py-2.5 backdrop-blur-md sm:px-6 sm:py-3.5">
        <div className="flex items-center gap-3 sm:gap-6 min-w-0">
          <Link to="/dashboard" className="flex items-center gap-2 text-lg font-black uppercase tracking-tight transition-opacity hover:opacity-90 sm:gap-2.5 sm:text-2xl shrink-0">
            <img src="/favicon.png" alt="GlobeTrotter logo" className="size-6 rounded-md object-contain sm:size-7" />
            <span className="truncate">GlobeTrotter</span>
          </Link>
          <div className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                activeProps={{ className: "text-foreground font-bold" }}
                className="transition-colors hover:text-foreground"
              >
                {n.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Link
            to="/trips/new"
            className="inline-flex items-center justify-center bg-foreground px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-background transition-colors hover:bg-primary sm:px-4 sm:py-2 sm:text-xs sm:tracking-widest"
          >
            <span>+ Plan</span>
            <span className="hidden sm:inline">&nbsp;Trip</span>
          </Link>

          {/* User Avatar & Dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              title={displayName}
              className="relative grid size-8 place-items-center overflow-hidden rounded-full border border-border bg-muted font-mono text-[10px] font-bold transition-all hover:ring-2 hover:ring-primary focus:outline-none sm:size-9"
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="size-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = "none";
                  }}
                />
              ) : (
                initials
              )}
            </button>

            {menuOpen && (
              <div className="animate-rise absolute right-0 top-10 z-50 w-56 border border-border bg-card p-2 shadow-2xl sm:top-12">
                <div className="border-b border-border px-3 py-2.5">
                  <div className="truncate font-bold text-sm">{displayName}</div>
                  <div className="truncate font-mono text-[10px] text-muted-foreground">
                    {user?.email ?? "—"}
                  </div>
                </div>

                {/* Mobile Navigation Links in Dropdown */}
                <div className="border-b border-border py-1 md:hidden">
                  {NAV.map((n) => (
                    <Link
                      key={n.to}
                      to={n.to}
                      onClick={() => setMenuOpen(false)}
                      className="flex w-full items-center gap-2 px-3 py-2 font-mono text-xs uppercase tracking-wider hover:bg-muted"
                    >
                      {n.label}
                    </Link>
                  ))}
                </div>

                <div className="py-1">
                  <Link
                    to="/profile"
                    onClick={() => setMenuOpen(false)}
                    className="flex w-full items-center gap-2 px-3 py-2 font-mono text-xs uppercase tracking-wider hover:bg-muted"
                  >
                    <span>👤</span> Profile Settings
                  </Link>
                </div>

                <div className="border-t border-border pt-1">
                  <button
                    onClick={async () => {
                      setMenuOpen(false);
                      await supabase.auth.signOut();
                      navigate({ to: "/auth" });
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 font-mono text-xs uppercase tracking-wider text-destructive hover:bg-destructive/10"
                  >
                    <span>🚪</span> Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content Area with safe bottom spacing for mobile bar */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-3.5 py-5 pb-24 sm:px-6 sm:py-8 md:pb-16">{children}</main>

      {/* Desktop Footer */}
      <footer className="hidden md:flex items-center justify-between border-t border-border bg-card px-6 py-4 font-mono text-[10px] uppercase tracking-widest">
        <div className="flex gap-6">
          <span>Session: {user?.email ?? "guest"}</span>
          <span>Cloud synced</span>
        </div>
        <div className="flex gap-6">
          <Link to="/explore" className="underline">
            Explore
          </Link>
          <Link to="/trips" className="underline">
            Trips
          </Link>
          <span className="text-primary">© GlobeTrotter</span>
        </div>
      </footer>

      {/* Mobile Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-border bg-card/95 px-2 pt-1.5 pb-[max(env(safe-area-inset-bottom,0px),0.5rem)] backdrop-blur-lg shadow-xl md:hidden">
        <Link
          to="/dashboard"
          activeProps={{ className: "text-primary font-bold" }}
          className="flex flex-1 flex-col items-center justify-center py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground active:scale-95"
        >
          <span className="text-base leading-none mb-1">⚡</span>
          <span>Home</span>
        </Link>
        <Link
          to="/trips"
          activeProps={{ className: "text-primary font-bold" }}
          className="flex flex-1 flex-col items-center justify-center py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground active:scale-95"
        >
          <span className="text-base leading-none mb-1">🗺️</span>
          <span>Trips</span>
        </Link>
        <Link
          to="/trips/new"
          className="flex flex-col items-center justify-center -mt-4 size-11 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform active:scale-90"
          title="Plan Trip"
        >
          <span className="text-xl leading-none font-black">+</span>
        </Link>
        <Link
          to="/explore"
          activeProps={{ className: "text-primary font-bold" }}
          className="flex flex-1 flex-col items-center justify-center py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground active:scale-95"
        >
          <span className="text-base leading-none mb-1">🧭</span>
          <span>Explore</span>
        </Link>
        <Link
          to="/profile"
          activeProps={{ className: "text-primary font-bold" }}
          className="flex flex-1 flex-col items-center justify-center py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground active:scale-95"
        >
          <span className="text-base leading-none mb-1">👤</span>
          <span>Profile</span>
        </Link>
      </div>
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  actions,
}: {
  eyebrow?: string;
  title: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && (
          <p className="font-mono text-[10px] uppercase tracking-widest text-primary">{eyebrow}</p>
        )}
        <h1 className="text-3xl font-extrabold uppercase tracking-tighter sm:text-4xl md:text-5xl">{title}</h1>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 sm:gap-3">{actions}</div>}
    </div>
  );
}
