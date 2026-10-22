import { type JSX } from "react";

export default function HomePage(): JSX.Element {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col justify-center gap-8 px-8 py-16">
      <header className="space-y-4">
        <p className="text-sm font-semibold tracking-wide text-blue-700 uppercase">
          Q2 Goals · AI SDLC Demo
        </p>
        <h1 className="text-4xl font-bold tracking-tight">
          Build with confidence.
        </h1>
        <p className="max-w-2xl text-lg text-slate-600">
          A disposable demonstration of fast onboarding, enforced quality gates,
          and policy-driven pull request automation.
        </p>
      </header>
      <section className="grid gap-4 md:grid-cols-3" aria-label="Demo goals">
        <article className="rounded-xl border p-5">
          <h2 className="font-semibold">Start quickly</h2>
          <p className="mt-2 text-sm text-slate-600">
            Clone, install, run, and connect authorized GitHub and Jira MCP
            integrations.
          </p>
        </article>
        <article className="rounded-xl border p-5">
          <h2 className="font-semibold">Block regressions</h2>
          <p className="mt-2 text-sm text-slate-600">
            Independent CI checks and branch rules guard changes before merge.
          </p>
        </article>
        <article className="rounded-xl border p-5">
          <h2 className="font-semibold">Automate safe PRs</h2>
          <p className="mt-2 text-sm text-slate-600">
            Clean changes can be auto-approved; risk triggers route to human
            review.
          </p>
        </article>
      </section>
      <footer className="text-sm text-slate-500">
        See the repository README for setup and{" "}
        <code>docs/ACCEPTANCE-VALIDATION.md</code> for acceptance evidence.
      </footer>
    </main>
  );
}
