
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") ||
  "http://localhost:8080";

type Interview = {
  id: number | string;
  jobRole: string;
  interviewType: string;
  difficulty: string;
  score: number;
  createdAt?: string;
  created_at?: string;
};

export default function DashboardPage() {
  const router = useRouter();

  const [userName, setUserName] = useState("User");
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAllInterviews, setShowAllInterviews] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [scoreFilter, setScoreFilter] = useState("All");

  useEffect(() => {
    async function loadDashboard() {
      try {
        const savedUser = sessionStorage.getItem("mockmateUser");

        if (!savedUser) {
          router.replace("/login");
          return;
        }

        const user = JSON.parse(savedUser);
        const userId = user?.id ?? user?.userId;

        if (!userId) {
          setError("User details not found. Please log in again.");
          return;
        }

        setUserName(user.fullName || user.name || "User");

        const response = await fetch(
          `${API_BASE_URL}/interviews?userId=${encodeURIComponent(
            String(userId)
          )}`,
          { method: "GET", cache: "no-store" }
        );

        if (!response.ok) {
          throw new Error("Could not load your previous interviews.");
        }

        const data = await response.json();
        const rawInterviews = Array.isArray(data)
          ? data
          : Array.isArray(data.interviews)
            ? data.interviews
            : [];

        const normalized: Interview[] = rawInterviews.map(
          (item: Record<string, unknown>) => {
            const rawScore =
              item.score ?? item.overallScore ?? item.overall_score;

            const parsedScore = Number(rawScore);

            return {
              id: (item.id ?? item.ID ?? "") as number | string,
              jobRole: String(item.jobRole ?? item.job_role ?? "Interview"),
              interviewType: String(
                item.interviewType ?? item.interview_type ?? "General"
              ),
              difficulty: String(item.difficulty ?? "Not specified"),
              score:
                rawScore === null ||
                rawScore === undefined ||
                !Number.isFinite(parsedScore)
                  ? 0
                  : Math.max(0, Math.min(100, parsedScore)),
              createdAt: String(item.createdAt ?? item.created_at ?? ""),
              created_at: String(item.created_at ?? item.createdAt ?? ""),
            };
          }
        );

        // Sort oldest to newest for the chart.
        normalized.sort((a, b) => {
          const dateA = new Date(
            a.createdAt || a.created_at || ""
          ).getTime();
          const dateB = new Date(
            b.createdAt || b.created_at || ""
          ).getTime();

          const validA = Number.isFinite(dateA);
          const validB = Number.isFinite(dateB);

          if (validA && validB && dateA !== dateB) {
            return dateA - dateB;
          }

          return Number(a.id) - Number(b.id);
        });

        setInterviews(normalized);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong while loading the dashboard."
        );
      } finally {
        setLoading(false);
      }
    }

    void loadDashboard();
  }, [router]);

  const averageScore =
    interviews.length > 0
      ? interviews.reduce((total, item) => total + item.score, 0) /
        interviews.length
      : 0;

  const latestScore =
    interviews.length > 0
      ? interviews[interviews.length - 1].score
      : 0;

  const difficulties = useMemo(
    () =>
      [...new Set(interviews.map((item) => item.difficulty))]
        .filter(Boolean)
        .sort(),
    [interviews]
  );

  const interviewTypes = useMemo(
    () =>
      [...new Set(interviews.map((item) => item.interviewType))]
        .filter(Boolean)
        .sort(),
    [interviews]
  );

  const matchingInterviews = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return interviews.filter((item) => {
      const matchesSearch =
        !query ||
        String(item.id).toLowerCase().includes(query) ||
        item.jobRole.toLowerCase().includes(query) ||
        item.interviewType.toLowerCase().includes(query) ||
        item.difficulty.toLowerCase().includes(query);

      const matchesDifficulty =
        difficultyFilter === "All" ||
        item.difficulty === difficultyFilter;

      const matchesType =
        typeFilter === "All" || item.interviewType === typeFilter;

      let matchesScore = true;

      if (scoreFilter === "below40") {
        matchesScore = item.score < 40;
      } else if (scoreFilter === "40to69") {
        matchesScore = item.score >= 40 && item.score < 70;
      } else if (scoreFilter === "70plus") {
        matchesScore = item.score >= 70;
      }

      return (
        matchesSearch &&
        matchesDifficulty &&
        matchesType &&
        matchesScore
      );
    });
  }, [
    interviews,
    searchTerm,
    difficultyFilter,
    typeFilter,
    scoreFilter,
  ]);

  // Keep chronological order for the chart.
  const chartInterviews = showAllInterviews
    ? matchingInterviews
    : matchingInterviews.slice(-10);

  // Newest first for the history list.
  const displayedInterviews = [...chartInterviews].reverse();

  const chartData = chartInterviews.map((interview) => ({
    interview: `#${interview.id}`,
    score: interview.score,
  }));

  function resetFilters() {
    setSearchTerm("");
    setDifficultyFilter("All");
    setTypeFilter("All");
    setScoreFilter("All");
    setShowAllInterviews(false);
  }

  function formatDate(value?: string) {
    if (!value) return "Date unavailable";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "Date unavailable";

    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function logout() {
    sessionStorage.removeItem("mockmateUser");
    router.replace("/login");
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 px-4 py-6 text-slate-800 sm:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-violet-100 bg-white/90 p-5 shadow-sm backdrop-blur">
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="text-left"
            aria-label="MockMate AI dashboard"
          >
            <h1 className="text-2xl font-extrabold tracking-tight text-violet-700">
              MockMate <span className="text-fuchsia-600">AI</span>
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Practice. Improve. Perform.
            </p>
          </button>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => router.push("/profile")}
              className="rounded-xl border border-violet-200 bg-white px-4 py-2.5 font-medium text-violet-700 transition hover:border-violet-300 hover:bg-violet-50"
            >
              My Profile
            </button>

            <button
              type="button"
              onClick={logout}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 font-medium text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            >
              Log Out
            </button>
          </div>
        </header>

        {/* Welcome banner */}
        <section className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-r from-violet-700 via-violet-600 to-fuchsia-600 p-7 text-white shadow-lg shadow-violet-200/60 sm:p-10">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-24 right-1/3 h-48 w-48 rounded-full bg-fuchsia-300/20 blur-3xl"
          />

          <div className="relative">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-violet-100">
              Your career practice space
            </p>

            <h2 className="text-3xl font-extrabold sm:text-4xl">
              Welcome back, {userName}!
            </h2>

            <p className="mt-3 max-w-2xl leading-7 text-violet-50">
              Upload your resume, check ATS readiness, and prepare for your next
              interview—all from one dashboard.
            </p>

            <button
              type="button"
              onClick={() => router.push("/interview")}
              className="mt-6 rounded-xl bg-white px-5 py-3 font-bold text-violet-700 shadow-sm transition hover:bg-violet-50 focus:outline-none focus:ring-4 focus:ring-white/30"
            >
              Start a Mock Interview →
            </button>
          </div>
        </section>

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700"
          >
            {error}
          </div>
        )}

        {/* Career toolkit */}
        <section className="mb-10">
          <div className="mb-5">
            <h3 className="text-2xl font-bold tracking-tight text-slate-900">
              Your Career Toolkit
            </h3>
            <p className="mt-1 text-slate-500">
              Choose what you want to work on today.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <FeatureCard
              icon="📄"
              label="Resume Upload"
              description="Upload your resume and prepare it for analysis and interview practice."
              action="Upload Resume"
              theme="violet"
              onClick={() => router.push("/resume")}
            />

            <FeatureCard
              icon="🎯"
              label="ATS Resume Checker"
              description="Review resume keywords, skills, and areas to improve for a target job."
              action="Check My Resume"
              theme="fuchsia"
              onClick={() => router.push("/ats-checker")}
            />

            <FeatureCard
              icon="🎤"
              label="Mock Interview"
              description="Practice interview questions and review your performance afterwards."
              action="Start Interview"
              theme="purple"
              onClick={() => router.push("/interview")}
            />
          </div>
        </section>

        {/* Statistics */}
        <section className="mb-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            label="Total Interviews"
            value={loading ? "..." : String(interviews.length)}
            detail="Practice sessions recorded"
            icon="🎤"
            theme="violet"
          />

          <StatCard
            label="Average Score"
            value={loading ? "..." : `${averageScore.toFixed(1)}%`}
            detail="Across your interviews"
            icon="📈"
            theme="fuchsia"
          />

          <StatCard
            label="Latest Score"
            value={loading ? "..." : `${latestScore.toFixed(1)}%`}
            detail="Most recent recorded interview"
            icon="🏆"
            theme="purple"
          />
        </section>

        {/* Search and filters */}
        <section className="mb-10 rounded-2xl border border-violet-100 bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-5">
            <h3 className="text-2xl font-bold text-slate-900">
              Find an Interview
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Search by job role or interview ID, or filter your results.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <label
                htmlFor="interview-search"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Search
              </label>

              <input
                id="interview-search"
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Software Engineer or #89"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition placeholder:text-slate-400 hover:border-violet-200 focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
              />
            </div>

            <div>
              <label
                htmlFor="difficulty-filter"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Difficulty
              </label>

              <select
                id="difficulty-filter"
                value={difficultyFilter}
                onChange={(event) => setDifficultyFilter(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
              >
                <option value="All">All Difficulties</option>
                {difficulties.map((difficulty) => (
                  <option key={difficulty} value={difficulty}>
                    {difficulty}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="type-filter"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Interview Type
              </label>

              <select
                id="type-filter"
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
              >
                <option value="All">All Types</option>
                {interviewTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="score-filter"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Score Range
              </label>

              <select
                id="score-filter"
                value={scoreFilter}
                onChange={(event) => setScoreFilter(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
              >
                <option value="All">All Scores</option>
                <option value="below40">Below 40%</option>
                <option value="40to69">40% – 69%</option>
                <option value="70plus">70% and above</option>
              </select>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-500">
              {loading
                ? "Loading interviews..."
                : `${matchingInterviews.length} matching interview(s) out of ${interviews.length}`}
            </p>

            <button
              type="button"
              onClick={resetFilters}
              className="rounded-xl border border-violet-200 px-4 py-2 text-sm font-semibold text-violet-700 transition hover:border-violet-300 hover:bg-violet-50"
            >
              Reset Filters
            </button>
          </div>
        </section>

        {/* Score progress chart */}
        <section className="mb-10 rounded-2xl border border-violet-100 bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-2xl font-bold text-slate-900">
                Score Progress
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Follow your scores across recorded interviews.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowAllInterviews((previous) => !previous)}
              disabled={loading || matchingInterviews.length <= 10}
              className="rounded-xl border border-violet-200 px-4 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {showAllInterviews ? "Recent 10" : "All Interviews"}
            </button>
          </div>

          {loading ? (
            <p className="py-10 text-center text-slate-500">
              Loading score history...
            </p>
          ) : chartData.length === 0 ? (
            <p className="py-10 text-center text-slate-500">
              No matching interviews to display.
            </p>
          ) : (
            <>
              <p className="mb-3 text-xs text-slate-400">
                Hover over a point to see its score.
              </p>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 10, right: 15, left: 0, bottom: 10 }}
                  >
                    <CartesianGrid
                      stroke="#EDE9FE"
                      strokeDasharray="4 4"
                    />

                    <XAxis
                      dataKey="interview"
                      tick={{ fill: "#64748B", fontSize: 11 }}
                      tickLine={false}
                      axisLine={{ stroke: "#DDD6FE" }}
                      minTickGap={20}
                    />

                    <YAxis
                      domain={[0, 100]}
                      ticks={[0, 20, 40, 60, 80, 100]}
                      tick={{ fill: "#64748B", fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `${value}%`}
                    />

                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#FFFFFF",
                        border: "1px solid #DDD6FE",
                        borderRadius: "12px",
                        color: "#1E293B",
                        boxShadow: "0 8px 24px rgba(124, 58, 237, 0.08)",
                      }}
                      formatter={(value) => [`${value}%`, "Score"]}
                      labelFormatter={(label) => `Interview ${label}`}
                    />

                    <Line
                      type="monotone"
                      dataKey="score"
                      name="Score"
                      stroke="#7C3AED"
                      strokeWidth={3}
                      dot={{
                        r: 4,
                        fill: "#C026D3",
                        strokeWidth: 0,
                      }}
                      activeDot={{
                        r: 7,
                        fill: "#7C3AED",
                        stroke: "#FFFFFF",
                        strokeWidth: 2,
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </section>

        {/* Previous interviews */}
        <section className="mb-8">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-2xl font-bold text-slate-900">
                Previous Interviews
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                {loading
                  ? "Loading your interviews..."
                  : `Showing ${displayedInterviews.length} of ${matchingInterviews.length} matching interviews`}
              </p>
            </div>

            {!loading && matchingInterviews.length > 10 && (
              <button
                type="button"
                onClick={() => setShowAllInterviews((previous) => !previous)}
                className="rounded-xl border border-violet-200 px-4 py-2 font-semibold text-violet-700 transition hover:bg-violet-50"
              >
                {showAllInterviews ? "Show Recent 10" : "View All Interviews"}
              </button>
            )}
          </div>

          {loading ? (
            <div className="rounded-2xl border border-violet-100 bg-white p-8 text-center text-slate-500">
              Loading interviews...
            </div>
          ) : matchingInterviews.length === 0 ? (
            <div className="rounded-2xl border border-violet-100 bg-white p-10 text-center shadow-sm">
              <div className="text-4xl">🗂️</div>

              <h4 className="mt-3 text-xl font-bold text-slate-900">
                No matching interviews
              </h4>

              <p className="mt-2 text-slate-500">
                Try changing your search or filters.
              </p>

              <button
                type="button"
                onClick={resetFilters}
                className="mt-5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-2.5 font-semibold text-white shadow-sm transition hover:from-violet-700 hover:to-fuchsia-700 focus:outline-none focus:ring-4 focus:ring-violet-200"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {displayedInterviews.map((interview) => (
                <article
                  key={interview.id}
                  className="flex flex-col gap-4 rounded-2xl border border-violet-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <h4 className="text-lg font-bold text-slate-900">
                      {interview.jobRole}
                    </h4>

                    <p className="mt-1 text-sm text-slate-500">
                      {interview.interviewType} · {interview.difficulty}
                    </p>

                    <p className="mt-2 text-xs text-slate-400">
                      Interview #{interview.id} ·{" "}
                      {formatDate(interview.createdAt || interview.created_at)}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <div className="text-right">
                      <p className="text-xs text-slate-500">Score</p>

                      <p
                        className={`text-2xl font-extrabold ${
                          interview.score >= 70
                            ? "text-emerald-600"
                            : interview.score >= 40
                              ? "text-amber-600"
                              : "text-rose-500"
                        }`}
                      >
                        {interview.score.toFixed(1)}%
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          `/interview/result?id=${encodeURIComponent(
                            String(interview.id)
                          )}`
                        )
                      }
                      className="rounded-xl border border-violet-200 px-4 py-2 text-sm font-semibold text-violet-700 transition hover:border-violet-300 hover:bg-violet-50 focus:outline-none focus:ring-4 focus:ring-violet-100"
                    >
                      View Result
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <footer className="pb-4 pt-2 text-center text-sm text-slate-400">
          MockMate AI <span className="text-violet-500">·</span> Practice
          today. Perform tomorrow.
        </footer>
      </div>
    </main>
  );
}

function FeatureCard({
  icon,
  label,
  description,
  action,
  theme,
  onClick,
}: {
  icon: string;
  label: string;
  description: string;
  action: string;
  theme: "violet" | "fuchsia" | "purple";
  onClick: () => void;
}) {
  const styles = {
    violet: {
      icon: "bg-violet-100 text-violet-700",
      button:
        "bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800",
      border: "hover:border-violet-300",
      accent: "text-violet-700",
    },
    fuchsia: {
      icon: "bg-fuchsia-100 text-fuchsia-700",
      button:
        "bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700",
      border: "hover:border-fuchsia-300",
      accent: "text-fuchsia-700",
    },
    purple: {
      icon: "bg-purple-100 text-purple-700",
      button:
        "bg-gradient-to-r from-purple-600 to-violet-700 hover:from-purple-700 hover:to-violet-800",
      border: "hover:border-purple-300",
      accent: "text-purple-700",
    },
  }[theme];

  return (
    <article
      className={`flex flex-col rounded-2xl border border-violet-100 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-violet-100/70 ${styles.border}`}
    >
      <div
        className={`flex h-14 w-14 items-center justify-center rounded-2xl text-3xl ${styles.icon}`}
      >
        {icon}
      </div>

      <h4 className={`mt-5 text-xl font-bold text-slate-900`}>
        {label}
      </h4>

      <p className="mt-2 flex-1 text-sm leading-6 text-slate-500">
        {description}
      </p>

      <button
        type="button"
        onClick={onClick}
        className={`mt-6 rounded-xl px-4 py-3 font-semibold text-white shadow-sm transition focus:outline-none focus:ring-4 focus:ring-violet-200 ${styles.button}`}
      >
        {action} →
      </button>
    </article>
  );
}

function StatCard({
  label,
  value,
  detail,
  icon,
  theme,
}: {
  label: string;
  value: string;
  detail: string;
  icon: string;
  theme: "violet" | "fuchsia" | "purple";
}) {
  const styles = {
    violet: {
      icon: "bg-violet-100 text-violet-700",
      value: "text-violet-700",
      accent: "bg-violet-500",
    },
    fuchsia: {
      icon: "bg-fuchsia-100 text-fuchsia-700",
      value: "text-fuchsia-700",
      accent: "bg-fuchsia-500",
    },
    purple: {
      icon: "bg-purple-100 text-purple-700",
      value: "text-purple-700",
      accent: "bg-purple-500",
    },
  }[theme];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-violet-100 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className={`absolute left-0 top-0 h-1 w-full ${styles.accent}`} />

      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>

          <p className={`mt-3 text-4xl font-extrabold ${styles.value}`}>
            {value}
          </p>

          <p className="mt-2 text-xs text-slate-400">{detail}</p>
        </div>

        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl text-2xl ${styles.icon}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
