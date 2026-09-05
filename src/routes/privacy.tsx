import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — GlobeTrotter" },
      {
        name: "description",
        content: "Privacy policy and terms regarding data handling for GlobeTrotter.",
      },
    ],
  }),
  component: PrivacyPolicy,
});

function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-border bg-background/90 px-4 py-3.5 backdrop-blur-md sm:px-6">
        <Link to="/" className="flex items-center gap-2 text-lg font-black uppercase tracking-tight sm:text-2xl">
          <img src="/favicon.png" alt="GlobeTrotter logo" className="size-6 rounded-md object-contain sm:size-7" />
          <span>GlobeTrotter</span>
        </Link>
        <Link
          to="/"
          className="border border-border px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors hover:bg-card"
        >
          Back to Home
        </Link>
      </nav>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6 sm:py-16">
        <h1 className="text-3xl font-black uppercase tracking-tight sm:text-5xl">Privacy Policy</h1>
        <p className="mt-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Last updated: September 2026
        </p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <section className="space-y-3">
            <h2 className="text-lg font-bold uppercase tracking-wide text-foreground sm:text-xl">
              1. Overview
            </h2>
            <p>
              GlobeTrotter ("we", "our", or "us") respects your privacy and is committed to protecting your personal data.
              This privacy policy explains how we collect, use, disclose, and safeguard your information when you use our multi-city trip planning platform at{" "}
              <a href="https://globetrotter-black.vercel.app" className="text-primary underline">
                https://globetrotter-black.vercel.app
              </a>.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold uppercase tracking-wide text-foreground sm:text-xl">
              2. Information We Collect
            </h2>
            <p>When you register, sign in, or interact with GlobeTrotter, we collect the following information:</p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>
                <strong className="text-foreground">Google Account Information:</strong> When signing in with Google OAuth, we receive your email address, full name, and profile picture avatar URL as provided by Google.
              </li>
              <li>
                <strong className="text-foreground">Travel & Itinerary Data:</strong> Trips created, destinations selected, dates, activity notes, and estimated budget entries.
              </li>
              <li>
                <strong className="text-foreground">Usage Data:</strong> Basic technical diagnostics and logs necessary to maintain platform security and performance.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold uppercase tracking-wide text-foreground sm:text-xl">
              3. How We Use Your Information
            </h2>
            <p>We use the collected information strictly for:</p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>Authenticating you securely and managing your user session.</li>
              <li>Enabling you to build, customize, save, and share your multi-city travel itineraries.</li>
              <li>Providing customer support and communicating important updates about your account.</li>
            </ul>
            <p>
              We do not sell, rent, or trade your personal information to any third parties or advertisers.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold uppercase tracking-wide text-foreground sm:text-xl">
              4. Data Storage and Third-Party Services
            </h2>
            <p>
              Your data is stored and authenticated through <strong className="text-foreground">Supabase</strong> (PostgreSQL database with Row Level Security) and hosted via <strong className="text-foreground">Vercel</strong>. We only use third-party providers that implement industry-standard encryption and security measures.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold uppercase tracking-wide text-foreground sm:text-xl">
              5. Google API Limited Use Disclosure
            </h2>
            <p>
              GlobeTrotter's use and transfer to any other app of information received from Google APIs adheres to the{" "}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noreferrer"
                className="text-primary underline"
              >
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold uppercase tracking-wide text-foreground sm:text-xl">
              6. Your Data Rights & Deletion
            </h2>
            <p>
              You have the right to access, modify, or permanently delete your account and associated trip itineraries at any time. To request full deletion of your personal data, please contact us at our support address.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold uppercase tracking-wide text-foreground sm:text-xl">
              7. Contact Us
            </h2>
            <p>
              If you have any questions about this Privacy Policy or your data, please contact the developer at{" "}
              <strong className="text-foreground">GlobeTrotter Support</strong> via your Google Cloud developer contact email.
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} GlobeTrotter. All rights reserved.</p>
      </footer>
    </div>
  );
}
