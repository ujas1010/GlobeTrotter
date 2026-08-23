import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — GlobeTrotter" },
      { name: "description", content: "Sign in or create your GlobeTrotter account to plan trips." },
      { property: "og:title", content: "Sign in — GlobeTrotter" },
      { property: "og:description", content: "Access your multi-city travel itineraries." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const isInitialRecovery =
    typeof window !== "undefined" &&
    (window.location.hash.includes("type=recovery") ||
      window.location.search.includes("type=recovery") ||
      window.location.hash.includes("error_code="));

  const [mode, setMode] = useState<"login" | "signup" | "forgot" | "reset">(
    isInitialRecovery ? "reset" : "login",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [isRecoverySession, setIsRecoverySession] = useState(isInitialRecovery);

  useEffect(() => {
    const hash = window.location.hash;
    const search = window.location.search;
    const isRecovery = hash.includes("type=recovery") || search.includes("type=recovery");

    if (isRecovery) {
      setMode("reset");
      setIsRecoverySession(true);
    }

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setMode("reset");
        setIsRecoverySession(true);
      } else if (
        session &&
        event === "SIGNED_IN" &&
        !isRecovery &&
        !isRecoverySession &&
        mode !== "reset"
      ) {
        navigate({ to: "/dashboard" });
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session && !isRecovery && !isRecoverySession && mode !== "reset") {
        navigate({ to: "/dashboard" });
      }
    });

    return () => sub.subscription.unsubscribe();
  }, [navigate, isRecoverySession, mode]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const cleanEmail = email.trim();

    if (mode === "reset") {
      if (newPassword.length < 6) {
        toast.error("Password must be at least 6 characters.");
        return;
      }
      setBusy(true);
      try {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
        toast.success("Password updated successfully! Welcome back.");
        navigate({ to: "/dashboard" });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Password update failed");
      } finally {
        setBusy(false);
      }
      return;
    }

    if (mode === "forgot") {
      if (!cleanEmail.includes("@")) {
        toast.error("Enter a valid email.");
        return;
      }
      setBusy(true);
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: `${window.location.origin}/auth`,
        });
        if (error) throw error;
        toast.success("Password reset link sent! Check your inbox.");
        setMode("login");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to send reset email");
      } finally {
        setBusy(false);
      }
      return;
    }

    if (!cleanEmail.includes("@") || password.length < 6) {
      toast.error("Enter a valid email and a password of at least 6 characters.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { display_name: name.trim() || cleanEmail.split("@")[0] },
          },
        });
        if (error) throw error;
        if (data.session) {
          toast.success("Account created. Welcome!");
          navigate({ to: "/dashboard" });
        } else {
          toast.success("Account created! Check your email to confirm, or sign in below if confirmation is disabled.");
          setMode("login");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        if (error) {
          if (error.message.toLowerCase().includes("email not confirmed")) {
            throw new Error("Email not confirmed. Please check your inbox or disable 'Confirm email' in Supabase Authentication settings.");
          }
          throw error;
        }
        navigate({ to: "/dashboard" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (error) throw error;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google sign-in failed. Please ensure Google provider is enabled in your Supabase dashboard.");
    }
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-foreground p-12 text-background lg:flex">
        <Link to="/" className="flex items-center gap-2.5 text-2xl font-extrabold uppercase tracking-tighter transition-opacity hover:opacity-90">
          <img src="/favicon.png" alt="GlobeTrotter logo" className="size-7 rounded-md object-contain" />
          <span>GlobeTrotter</span>
        </Link>
        <div>
          <h2 className="text-5xl font-extrabold uppercase leading-[0.9] tracking-tighter">
            Every stop.
            <br />
            Every cost.
            <br />
            One plan.
          </h2>
          <p className="mt-6 max-w-[36ch] text-sm opacity-60">
            Multi-city itineraries with day-wise activities, live budget totals and shareable read-only
            links.
          </p>
        </div>
        <div className="font-mono text-[10px] uppercase tracking-widest opacity-50">
          Session · Trotter Access
        </div>
      </div>

      <div className="flex items-center justify-center px-4 py-10 sm:px-6 sm:py-16">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center justify-center lg:hidden">
            <Link to="/" className="flex items-center gap-2 text-2xl font-extrabold uppercase tracking-tighter">
              <img src="/favicon.png" alt="GlobeTrotter logo" className="size-7 rounded-md object-contain" />
              <span>GlobeTrotter</span>
            </Link>
          </div>
          <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-primary">
            {mode === "login"
              ? "Returning traveller"
              : mode === "signup"
                ? "New traveller"
                : mode === "forgot"
                  ? "Password recovery"
                  : "Set new password"}
          </div>
          <h1 className="mb-8 text-4xl font-extrabold uppercase tracking-tighter">
            {mode === "login"
              ? "Sign in"
              : mode === "signup"
                ? "Create account"
                : mode === "forgot"
                  ? "Forgot password"
                  : "Reset password"}
          </h1>

          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <Field label="Name">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary"
                  placeholder="Ada Lovelace"
                />
              </Field>
            )}

            {mode !== "reset" && (
              <Field label="Email">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary"
                  placeholder="you@example.com"
                />
              </Field>
            )}

            {(mode === "login" || mode === "signup") && (
              <Field label="Password">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary"
                  placeholder="••••••••"
                />
              </Field>
            )}

            {mode === "reset" && (
              <Field label="New Password">
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary"
                  placeholder="Enter new password (min 6 chars)"
                />
              </Field>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full bg-primary px-6 py-3 text-xs font-bold uppercase tracking-widest text-primary-foreground disabled:opacity-50"
            >
              {busy
                ? "Working…"
                : mode === "login"
                  ? "Sign in"
                  : mode === "signup"
                    ? "Create account"
                    : mode === "forgot"
                      ? "Send reset link"
                      : "Update password"}
            </button>
          </form>

          {mode !== "reset" && mode !== "forgot" && (
            <button
              onClick={google}
              className="mt-3 w-full border border-border bg-card px-6 py-3 text-xs font-bold uppercase tracking-widest hover:border-foreground"
            >
              Continue with Google
            </button>
          )}

          <div className="mt-6 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest">
            {mode === "login" ? (
              <>
                <button
                  onClick={() => setMode("signup")}
                  className="underline underline-offset-4"
                >
                  Create an account
                </button>
                <button
                  onClick={() => setMode("forgot")}
                  className="text-muted-foreground underline underline-offset-4"
                >
                  Forgot password
                </button>
              </>
            ) : mode === "signup" ? (
              <button
                onClick={() => setMode("login")}
                className="underline underline-offset-4"
              >
                I already have an account
              </button>
            ) : (
              <button
                onClick={() => setMode("login")}
                className="underline underline-offset-4"
              >
                Back to Sign in
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
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

