
"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const jobRoles = [
  "Software Developer",
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "Java Developer",
  "Python Developer",
  "Data Analyst",
  "AI/ML Engineer",
];

const interviewTypes = [
  "Technical Interview",
  "HR Interview",
  "Mixed Interview",
];

const difficulties = ["Beginner", "Intermediate", "Advanced"];

function InterviewPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [jobRole, setJobRole] = useState("Software Developer");
  const [interviewType, setInterviewType] = useState("Technical Interview");
  const [difficulty, setDifficulty] = useState("Beginner");
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const [isRetake, setIsRetake] = useState(false);

  useEffect(() => {
    setIsRetake(searchParams.get("retake") === "1");

    const requestedRole = searchParams.get("jobRole");
    const requestedType = searchParams.get("interviewType");
    const requestedDifficulty = searchParams.get("difficulty");

    if (requestedRole && jobRoles.includes(requestedRole)) {
      setJobRole(requestedRole);
    }

    if (requestedType && interviewTypes.includes(requestedType)) {
      setInterviewType(requestedType);
    }

    if (
      requestedDifficulty &&
      difficulties.includes(requestedDifficulty)
    ) {
      setDifficulty(requestedDifficulty);
    }
  }, [searchParams]);

  function startInterview() {
    if (starting) return;

    if (
      !jobRoles.includes(jobRole) ||
      !interviewTypes.includes(interviewType) ||
      !difficulties.includes(difficulty)
    ) {
      setError("Please select valid interview preferences.");
      return;
    }

    setError("");
    setStarting(true);

    const params = new URLSearchParams({
      jobRole,
      interviewType,
      difficulty,
    });

    router.push(`/interview/question?${params.toString()}`);
  }

  const selectClass =
    "mt-2.5 w-full rounded-xl border border-violet-100 bg-white px-4 py-3.5 text-slate-800 shadow-sm outline-none transition hover:border-violet-300 focus:border-violet-500 focus:ring-4 focus:ring-violet-100 disabled:cursor-not-allowed disabled:bg-slate-100";

  const practiceSteps = [
    {
      number: "01",
      title: "Choose your role",
      description: "Focus your practice on your target position.",
      icon: "🎯",
    },
    {
      number: "02",
      title: "Answer questions",
      description: "Practice explaining your thoughts clearly.",
      icon: "💬",
    },
    {
      number: "03",
      title: "Review feedback",
      description: "Identify strengths and areas to improve.",
      icon: "📈",
    },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 px-4 py-8 text-slate-900 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <header className="mb-10 text-center sm:mb-12">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/90 px-4 py-2 text-sm font-semibold text-violet-700 shadow-sm">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white">
              ✦
            </span>
            MockMate AI Practice
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            {isRetake ? "Try Again" : "Your Next Interview"}
            <span className="mt-2 block bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 bg-clip-text text-transparent">
              Starts Here.
            </span>
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-500 sm:text-base">
            {isRetake
              ? "Your previous interview settings are ready. Start a fresh practice interview and keep improving your skills."
              : "Customize your mock interview, practice answering questions, and build confidence for your next opportunity."}
          </p>

          <div className="mx-auto mt-6 h-1 w-24 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600" />
        </header>

        {/* Main layout */}
        <div className="grid items-start gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:gap-8">
          {/* Interview Setup */}
          <section className="overflow-hidden rounded-3xl border border-violet-100 bg-white shadow-xl shadow-violet-100/60 transition duration-300 hover:shadow-2xl hover:shadow-violet-100/70">
            <div className="border-b border-violet-100 bg-gradient-to-r from-violet-50 via-purple-50 to-fuchsia-50 px-5 py-6 sm:px-8">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-xl text-white shadow-lg shadow-violet-200">
                  ⚙️
                </div>

                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Interview Setup
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Personalize your practice session.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6 p-5 sm:p-8">
              {/* Job Role */}
              <div>
                <label
                  htmlFor="jobRole"
                  className="text-sm font-bold text-slate-700"
                >
                  Job Role
                </label>
                <p className="mt-1 text-xs text-slate-400">
                  Choose the position you want to prepare for.
                </p>

                <select
                  id="jobRole"
                  value={jobRole}
                  onChange={(e) => setJobRole(e.target.value)}
                  className={selectClass}
                  disabled={starting}
                >
                  {jobRoles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>

              {/* Interview Type */}
              <div>
                <label
                  htmlFor="interviewType"
                  className="text-sm font-bold text-slate-700"
                >
                  Interview Type
                </label>
                <p className="mt-1 text-xs text-slate-400">
                  Select the kind of interview you want to practice.
                </p>

                <select
                  id="interviewType"
                  value={interviewType}
                  onChange={(e) => setInterviewType(e.target.value)}
                  className={selectClass}
                  disabled={starting}
                >
                  {interviewTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {/* Difficulty */}
              <div>
                <label
                  htmlFor="difficulty"
                  className="text-sm font-bold text-slate-700"
                >
                  Difficulty Level
                </label>
                <p className="mt-1 text-xs text-slate-400">
                  Set a comfortable challenge level.
                </p>

                <select
                  id="difficulty"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className={selectClass}
                  disabled={starting}
                >
                  {difficulties.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </div>

              {/* Error message */}
              {error && (
                <p
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700"
                >
                  {error}
                </p>
              )}

              {/* Start button */}
              <button
                type="button"
                onClick={startInterview}
                disabled={starting}
                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-4 font-bold text-white shadow-lg shadow-violet-200 transition duration-300 hover:-translate-y-0.5 hover:from-violet-700 hover:to-fuchsia-700 hover:shadow-xl hover:shadow-violet-200 focus:outline-none focus:ring-4 focus:ring-violet-200 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {starting ? (
                  <>
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Opening interview...
                  </>
                ) : (
                  <>
                    {isRetake
                      ? "Start Retake Interview"
                      : "Begin Interview"}
                    <span className="transition-transform duration-300 group-hover:translate-x-1">
                      →
                    </span>
                  </>
                )}
              </button>

              <p className="text-center text-xs leading-5 text-slate-400">
                Your new interview will start with the preferences selected
                above.
              </p>
            </div>
          </section>

          {/* Right sidebar */}
          <aside className="flex flex-col gap-6">
            {/* Practice plan */}
            <section className="rounded-3xl border border-violet-100 bg-white p-5 shadow-xl shadow-violet-100/50 transition duration-300 hover:shadow-2xl hover:shadow-violet-100/60 sm:p-7">
              <div className="mb-6 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-fuchsia-100 text-2xl">
                  🚀
                </div>

                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Your Practice Plan
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Three steps to get started.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {practiceSteps.map((step, index) => (
                  <div key={step.number} className="flex gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-violet-100 bg-gradient-to-br from-violet-50 to-fuchsia-50 text-lg">
                      {step.icon}
                    </div>

                    <div className="min-w-0 flex-1 pb-5">
                      <span className="text-xs font-extrabold tracking-wider text-violet-600">
                        STEP {step.number}
                      </span>
                      <p className="mt-1 font-bold text-slate-800">
                        {step.title}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        {step.description}
                      </p>
                    </div>

                    {index < practiceSteps.length - 1 && (
                      <span className="sr-only">Next step follows.</span>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Current configuration */}
            <section className="rounded-3xl border border-violet-100 bg-white p-5 shadow-xl shadow-violet-100/50 transition duration-300 hover:shadow-2xl hover:shadow-violet-100/60 sm:p-7">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-slate-900">
                  Current Configuration
                </h2>

                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Ready
                </span>
              </div>

              <div className="mt-5 divide-y divide-violet-50">
                <div className="flex items-start justify-between gap-4 py-4 first:pt-0">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Job Role
                    </p>
                    <p className="mt-1.5 font-semibold text-slate-800">
                      {jobRole}
                    </p>
                  </div>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-lg">
                    💼
                  </span>
                </div>

                <div className="flex items-start justify-between gap-4 py-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Interview Type
                    </p>
                    <p className="mt-1.5 font-semibold text-slate-800">
                      {interviewType}
                    </p>
                  </div>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-fuchsia-50 text-lg">
                    🗣️
                  </span>
                </div>

                <div className="flex items-start justify-between gap-4 py-4 last:pb-0">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Difficulty
                    </p>
                    <p className="mt-1.5 font-semibold text-slate-800">
                      {difficulty}
                    </p>
                  </div>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-lg">
                    📊
                  </span>
                </div>
              </div>
            </section>

            {/* Encouragement card */}
            <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 p-6 text-white shadow-xl shadow-violet-200">
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
              <div className="absolute -bottom-12 -left-8 h-36 w-36 rounded-full bg-white/10" />

              <div className="relative">
                <div className="mb-3 text-2xl">✨</div>
                <h2 className="text-lg font-bold">
                  Every practice counts.
                </h2>
                <p className="mt-2 text-sm leading-6 text-violet-100">
                  Take your time, explain your thinking, and use every
                  question as an opportunity to learn.
                </p>
              </div>
            </section>
          </aside>
        </div>

        {/* Footer */}
        <footer className="mt-10 border-t border-violet-100 pt-6 text-center text-xs text-slate-400">
          MockMate AI <span className="mx-1 text-violet-500">·</span>
          Practice today, prepare for tomorrow.
        </footer>
      </div>
    </main>
  );
}

export default function InterviewPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 px-4 text-slate-700">
          <div className="text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-violet-100 border-t-violet-600" />
            <p className="text-sm font-medium text-slate-500">
              Loading interview setup...
            </p>
          </div>
        </main>
      }
    >
      <InterviewPageContent />
    </Suspense>
  );
}
