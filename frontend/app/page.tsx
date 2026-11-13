
"use client";

import { useRouter } from "next/navigation";

const features = [
  {
    icon: "🤖",
    title: "AI Mock Interviews",
    description:
      "Practise job interviews with role-based questions and build confidence before the real interview.",
    number: "01",
  },
  {
    icon: "📄",
    title: "Resume & ATS Checker",
    description:
      "Prepare your resume, review its ATS compatibility, and identify missing skills and keywords.",
    number: "02",
  },
  {
    icon: "📊",
    title: "Performance Feedback",
    description:
      "Review your answers, understand areas for improvement, and track your interview progress.",
    number: "03",
  },
];

const steps = [
  {
    number: "01",
    title: "Choose Your Role",
    description: "Select the job role you want to prepare for.",
  },
  {
    number: "02",
    title: "Practise",
    description: "Answer relevant technical and behavioural questions.",
  },
  {
    number: "03",
    title: "Review Results",
    description: "Check your score and review your answers.",
  },
  {
    number: "04",
    title: "Improve",
    description: "Use feedback to prepare for your next interview.",
  },
];

function Logo() {
  return (
    <span className="inline-flex items-center gap-3">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-700/20">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-7 w-7"
          aria-hidden="true"
        >
          <path d="M9 3.5a3.5 3.5 0 0 0-3 5.3A3.5 3.5 0 0 0 7 15.5a3.5 3.5 0 0 0 5 3V6.5a3 3 0 0 0-3-3Z" />
          <path d="M15 3.5a3.5 3.5 0 0 1 3 5.3 3.5 3.5 0 0 1-1 6.7 3.5 3.5 0 0 1-5 3V6.5a3 3 0 0 1 3-3Z" />
          <path d="M8 9h2M14 9h2M8 14h2M14 14h2" />
        </svg>
      </span>

      <span className="text-xl font-extrabold tracking-tight text-slate-900">
        MockMate <span className="text-violet-600">AI</span>
      </span>
    </span>
  );
}

export default function Home() {
  const router = useRouter();

  const goToLogin = () => router.push("/login");
  const goToInterview = () => router.push("/interview");

  return (
    <main className="min-h-screen overflow-hidden bg-white text-slate-800">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-violet-100/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label="MockMate AI home"
          >
            <Logo />
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={goToLogin}
              className="rounded-xl border border-violet-200 px-4 py-2.5 text-sm font-semibold text-violet-700 transition hover:bg-violet-50 focus:outline-none focus:ring-4 focus:ring-violet-100 sm:px-5"
            >
              Login
            </button>

            <button
              type="button"
              onClick={goToLogin}
              className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-700/15 transition hover:from-violet-700 hover:to-fuchsia-700 focus:outline-none focus:ring-4 focus:ring-violet-200 sm:px-5"
            >
              Get Started <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative isolate bg-gradient-to-br from-violet-50 via-white to-fuchsia-50">
        <div className="pointer-events-none absolute -right-20 top-10 -z-10 h-72 w-72 rounded-full bg-violet-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 bottom-0 -z-10 h-64 w-64 rounded-full bg-fuchsia-200/30 blur-3xl" />

        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-2 lg:gap-16">
          <div>
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-700 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-violet-600" />
              AI-Powered Interview Preparation
            </div>

            <h1 className="max-w-2xl text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Your Dream Job
              <br />
              Starts With
              <br />
              <span className="bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                Better Practice.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-8 text-slate-600 sm:text-lg">
              Prepare for interviews, improve your resume, check ATS
              compatibility, and build the confidence to take your next
              career step with MockMate AI.
            </p>

            <div className="mt-9 flex flex-wrap gap-4">
              <button
                type="button"
                onClick={goToInterview}
                className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3.5 font-semibold text-white shadow-lg shadow-violet-700/20 transition hover:-translate-y-0.5 hover:from-violet-700 hover:to-fuchsia-700 focus:outline-none focus:ring-4 focus:ring-violet-200"
              >
                Start Mock Interview <span aria-hidden="true">→</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  document
                    .getElementById("features")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="rounded-xl border border-violet-200 bg-white px-6 py-3.5 font-semibold text-violet-700 transition hover:border-violet-400 hover:bg-violet-50 focus:outline-none focus:ring-4 focus:ring-violet-100"
              >
                Explore Features
              </button>
            </div>

            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-600">
              <span className="inline-flex items-center gap-2">
                <span className="font-bold text-violet-600">✓</span>
                Role-based practice
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="font-bold text-violet-600">✓</span>
                Resume insights
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="font-bold text-violet-600">✓</span>
                Performance tracking
              </span>
            </div>
          </div>

          {/* Hero visual */}
          <div className="mx-auto w-full max-w-lg">
            <div className="rounded-3xl border border-violet-100 bg-white p-5 shadow-2xl shadow-violet-900/10 sm:p-7">
              <div className="flex items-center justify-between border-b border-slate-100 pb-5">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    YOUR PREPARATION SPACE
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-slate-900">
                    Ready to practise?
                  </h2>
                </div>
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-fuchsia-100 text-2xl">
                  🎯
                </span>
              </div>

              <div className="mt-5 space-y-4">
                <div className="flex items-center gap-4 rounded-2xl border border-violet-100 bg-violet-50/70 p-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-xl text-white">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      className="h-6 w-6"
                      aria-hidden="true"
                    >
                      <rect x="5" y="3" width="14" height="18" rx="2" />
                      <path d="M9 8h6M9 12h6M9 16h3" />
                    </svg>
                  </span>
                  <div>
                    <h3 className="font-bold text-slate-900">Resume Review</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      Organise your career information
                    </p>
                  </div>
                  <span className="ml-auto text-violet-600">→</span>
                </div>

                <div className="flex items-center gap-4 rounded-2xl border border-violet-100 bg-white p-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-fuchsia-100 text-xl">
                    📋
                  </span>
                  <div>
                    <h3 className="font-bold text-slate-900">ATS Resume Check</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      Review keywords and suggestions
                    </p>
                  </div>
                  <span className="ml-auto text-violet-600">→</span>
                </div>

                <div className="flex items-center gap-4 rounded-2xl border border-violet-100 bg-white p-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-xl">
                    💬
                  </span>
                  <div>
                    <h3 className="font-bold text-slate-900">Mock Interview</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      Practise and review your answers
                    </p>
                  </div>
                  <span className="ml-auto text-violet-600">→</span>
                </div>
              </div>

              <p className="mt-5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-3 text-center text-sm font-semibold text-white">
                Small steps today. Greater confidence tomorrow.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="scroll-mt-24 px-5 py-20 sm:px-8 sm:py-24"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <span className="text-sm font-bold uppercase tracking-widest text-violet-600">
              Everything in one place
            </span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Prepare Smarter With MockMate AI
            </h2>
            <p className="mt-4 leading-7 text-slate-600">
              Helpful tools to support your resume preparation, interview
              practice, and progress review.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {features.map((feature) => (
              <article
                key={feature.number}
                className="group rounded-2xl border border-violet-100 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:border-violet-300 hover:shadow-xl hover:shadow-violet-900/5 sm:p-8"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-fuchsia-100 text-3xl transition group-hover:from-violet-200 group-hover:to-fuchsia-200">
                    {feature.icon}
                  </span>
                  <span className="text-sm font-bold tracking-widest text-violet-300">
                    {feature.number}
                  </span>
                </div>

                <h3 className="mt-6 text-xl font-bold text-slate-900">
                  {feature.title}
                </h3>

                <p className="mt-3 leading-7 text-slate-600">
                  {feature.description}
                </p>

                <button
                  type="button"
                  onClick={
                    feature.number === "03"
                      ? goToLogin
                      : feature.number === "02"
                        ? goToLogin
                        : goToInterview
                  }
                  className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-violet-700 transition group-hover:gap-3 hover:text-fuchsia-700 focus:outline-none focus:ring-2 focus:ring-violet-200"
                >
                  Get started <span aria-hidden="true">→</span>
                </button>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-violet-100 bg-gradient-to-br from-violet-50/80 to-fuchsia-50/70 px-5 py-20 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <span className="text-sm font-bold uppercase tracking-widest text-violet-600">
              Simple process
            </span>
            <h2 className="mt-3 text-3xl font-extrabold text-slate-900 sm:text-4xl">
              How MockMate AI Works
            </h2>
            <p className="mt-4 text-slate-600">
              Follow a simple process to prepare for your next interview.
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => (
              <article key={step.number} className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-lg font-extrabold text-white shadow-lg shadow-violet-700/20">
                  {step.number}
                </div>
                <h3 className="mt-5 text-lg font-bold text-slate-900">
                  {step.title}
                </h3>
                <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-slate-600">
                  {step.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Call to action */}
      <section className="px-5 py-20 sm:px-8 sm:py-24">
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl bg-gradient-to-br from-violet-700 via-violet-600 to-fuchsia-600 px-6 py-14 text-center shadow-xl shadow-violet-900/15 sm:px-12 sm:py-16">
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full border-[35px] border-white/10" />
          <div className="pointer-events-none absolute -bottom-24 -left-10 h-64 w-64 rounded-full border-[40px] border-white/10" />

          <div className="relative">
            <span className="inline-flex rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-medium text-violet-50">
              Your next opportunity starts here
            </span>

            <h2 className="mx-auto mt-5 max-w-3xl text-3xl font-extrabold leading-tight text-white sm:text-4xl">
              Ready to Ace Your Next Interview?
            </h2>

            <p className="mx-auto mt-4 max-w-xl leading-7 text-violet-100">
              Practise your answers, review your progress, and take the next
              step towards your career goals.
            </p>

            <button
              type="button"
              onClick={goToInterview}
              className="mt-8 rounded-xl bg-white px-7 py-3.5 font-bold text-violet-700 shadow-lg transition hover:-translate-y-0.5 hover:bg-violet-50 focus:outline-none focus:ring-4 focus:ring-white/40"
            >
              Start Practising <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-violet-100 bg-white px-5 py-8 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label="Back to top"
          >
            <Logo />
          </button>
          <p className="text-center text-sm text-slate-500">
            © 2026 MockMate AI. All rights reserved.
          </p>
          <button
            type="button"
            onClick={goToLogin}
            className="text-sm font-semibold text-violet-700 transition hover:text-fuchsia-700"
          >
            Login to your account →
          </button>
        </div>
      </footer>
    </main>
  );
}
