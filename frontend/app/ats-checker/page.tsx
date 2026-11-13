
"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type ATSResult = {
  score: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  suggestions: string[];
  resumeWordCount: number;
};

type ATSResponse = Partial<ATSResult> & {
  error?: string;
};

type Recommendation = {
  title: string;
  description: string;
  relevantKeywords: string[];
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".txt"];

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"
).replace(/\/+$/, "");

const STOP_WORDS = new Set(
  `a an and are as at be been being but by can could did do does
  for from had has have he her hers him his i if in into is it its
  may might must of on or our ours she should so such than that the
  their them then there these they this those to was we were what
  when where which while who will with would you your yours also
  all any each more most other per use used using`
    .trim()
    .split(/\s+/)
);

function normalizeKeywords(items: unknown[]): string[] {
  const output: string[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    if (typeof item !== "string") continue;

    const normalized = item
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/[_]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();

    const cleaned = normalized
      .split(" ")
      .filter((word) => word.length > 1 && !STOP_WORDS.has(word))
      .join(" ")
      .trim();

    if (!cleaned || seen.has(cleaned)) continue;

    seen.add(cleaned);
    output.push(cleaned);
  }

  return output;
}

function normalizeSuggestions(items: unknown[]): string[] {
  return items
    .filter(
      (item): item is string =>
        typeof item === "string" && item.trim().length > 0
    )
    .map((item) => item.trim());
}

const RECOMMENDATION_GROUPS: Omit<
  Recommendation,
  "relevantKeywords"
>[] = [
  {
    title: "Technical skills",
    description:
      "Highlight relevant programming languages, frameworks, databases and tools you genuinely know.",
  },
  {
    title: "Projects and practical experience",
    description:
      "Describe what you built, the technologies you used, your contribution and the outcome.",
  },
  {
    title: "Code quality and debugging",
    description:
      "Mention testing, readable code and debugging experience when these reflect your actual skills.",
  },
  {
    title: "Teamwork and communication",
    description:
      "Include real examples of collaboration, communication and teamwork.",
  },
  {
    title: "Documentation and workflow",
    description:
      "Mention documentation, version control and development workflows you have actually used.",
  },
];

const RECOMMENDATION_TERMS: Record<string, string[]> = {
  "Technical skills": [
    "java", "python", "javascript", "typescript", "sql", "react",
    "angular", "node", "go", "html", "css", "programming",
    "software", "technical", "framework", "database", "databases",
    "cloud", "api",
  ],
  "Projects and practical experience": [
    "project", "experience", "developer", "developers", "develop",
    "developing", "development", "build", "implement",
    "application", "applications", "product",
  ],
  "Code quality and debugging": [
    "debug", "debugging", "testing", "test", "clean", "code",
    "quality", "reliability", "maintenance", "maintain",
    "maintaining", "fix", "fixing", "issues", "issue",
    "reviews", "review",
  ],
  "Teamwork and communication": [
    "collaborate", "collaboration", "team", "teamwork",
    "communication", "leadership", "review", "reviews",
    "developer", "developers", "member", "members",
  ],
  "Documentation and workflow": [
    "documentation", "git", "github", "version", "continuous",
    "deployment", "workflow", "requirements", "requirement",
  ],
};

function getRecommendations(
  missingKeywords: string[]
): Recommendation[] {
  return RECOMMENDATION_GROUPS.map((group) => {
    const terms = new Set(RECOMMENDATION_TERMS[group.title] ?? []);

    return {
      ...group,
      relevantKeywords: [
        ...new Set(
          missingKeywords.filter((word) =>
            terms.has(word.toLowerCase().trim())
          )
        ),
      ],
    };
  }).filter((group) => group.relevantKeywords.length > 0);
}

function KeywordChips({
  keywords,
  variant,
  emptyMessage,
}: {
  keywords: string[];
  variant: "matched" | "missing" | "neutral";
  emptyMessage?: string;
}) {
  const colors = {
    matched: "border-emerald-200 bg-emerald-50 text-emerald-800",
    missing: "border-amber-200 bg-amber-50 text-amber-800",
    neutral: "border-violet-200 bg-violet-50 text-violet-800",
  };

  if (!keywords.length) {
    return (
      <p className="text-sm text-slate-500">
        {emptyMessage || "No keywords available."}
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {keywords.map((keyword, index) => (
        <span
          key={`${keyword}-${index}`}
          className={`max-w-full rounded-lg border px-3 py-2 text-sm leading-5 break-words ${colors[variant]}`}
        >
          {keyword}
        </span>
      ))}
    </div>
  );
}

function SectionTitle({
  number,
  children,
}: {
  number?: string;
  children: React.ReactNode;
}) {
  return (
    <h2 className="flex items-center gap-3 text-lg font-bold text-slate-900">
      {number && (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-100 to-fuchsia-100 text-sm font-bold text-violet-700">
          {number}
        </span>
      )}
      {children}
    </h2>
  );
}

export default function ATSCheckerPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [result, setResult] = useState<ATSResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkedTasks, setCheckedTasks] = useState<string[]>([]);

  async function handleCheckATS() {
    setError("");
    setResult(null);
    setCheckedTasks([]);

    if (!file) {
      setError("Please select your resume first.");
      return;
    }

    const validExtension = ALLOWED_EXTENSIONS.some((extension) =>
      file.name.toLowerCase().endsWith(extension)
    );

    if (!validExtension) {
      setError("Upload a PDF, DOCX or TXT file.");
      return;
    }

    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      setError("File must be non-empty and no larger than 5 MB.");
      return;
    }

    if (jobDescription.trim().length < 30) {
      setError(
        "Please enter a job description with at least 30 characters."
      );
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("resume", file);
      formData.append("jobDescription", jobDescription.trim());

      const response = await fetch(`${API_BASE_URL}/ats-check`, {
        method: "POST",
        body: formData,
      });

      const responseText = await response.text();
      let data: ATSResponse;

      try {
        data = JSON.parse(responseText) as ATSResponse;
      } catch {
        throw new Error(
          "Invalid backend response. Check that the Go server is running and returns JSON."
        );
      }

      if (!response.ok) {
        throw new Error(
          data.error || `ATS check failed (HTTP ${response.status}).`
        );
      }

      if (
        typeof data.score !== "number" ||
        !Number.isFinite(data.score) ||
        data.score < 0 ||
        data.score > 100 ||
        !Array.isArray(data.matchedKeywords) ||
        !Array.isArray(data.missingKeywords) ||
        !Array.isArray(data.suggestions) ||
        typeof data.resumeWordCount !== "number" ||
        !Number.isFinite(data.resumeWordCount)
      ) {
        throw new Error("Invalid ATS result received from the backend.");
      }

      setResult({
        score: data.score,
        matchedKeywords: normalizeKeywords(data.matchedKeywords),
        missingKeywords: normalizeKeywords(data.missingKeywords),
        suggestions: normalizeSuggestions(data.suggestions),
        resumeWordCount: data.resumeWordCount,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to connect to the backend."
      );
    } finally {
      setLoading(false);
    }
  }

  function resetAnalysis() {
    setResult(null);
    setError("");
    setFile(null);
    setJobDescription("");
    setCheckedTasks([]);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function toggleTask(task: string) {
    setCheckedTasks((current) =>
      current.includes(task)
        ? current.filter((item) => item !== task)
        : [...current, task]
    );
  }

  const score = result
    ? Math.max(0, Math.min(100, result.score))
    : 0;

  const scoreLabel =
    score >= 75
      ? "Strong keyword match"
      : score >= 45
        ? "Moderate keyword match"
        : "Needs improvement";

  const recommendations = result
    ? getRecommendations(result.missingKeywords)
    : [];

  const tasks = result
    ? [
        ...(result.missingKeywords.length
          ? ["Review missing keywords and add relevant ones where accurate."]
          : []),
        "Add relevant projects with your role, tools used and outcomes.",
        "Check spelling, headings, dates and consistent formatting.",
        "Use clear bullet points to describe responsibilities and achievements.",
      ]
    : [];

  return (
    <main className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 px-4 py-8 text-slate-800 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="mb-6 inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-2.5 text-sm font-semibold text-violet-700 shadow-sm transition hover:border-fuchsia-200 hover:bg-violet-50"
        >
          <span aria-hidden="true">←</span> Back to Dashboard
        </button>

        <header className="relative overflow-hidden rounded-3xl border border-violet-100 bg-gradient-to-r from-white via-violet-50 to-fuchsia-50 p-6 shadow-sm sm:p-9">
          <div className="absolute -right-12 -top-16 h-48 w-48 rounded-full bg-fuchsia-200/30 blur-3xl" />
          <div className="absolute -bottom-16 right-36 h-40 w-40 rounded-full bg-violet-200/40 blur-3xl" />

          <div className="relative flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-xl font-bold text-white shadow-md shadow-violet-200">
              M
            </div>
            <div>
              <p className="bg-gradient-to-r from-violet-700 to-fuchsia-600 bg-clip-text text-sm font-bold tracking-wide text-transparent">
                MockMate AI
              </p>
              <p className="text-xs text-slate-500">
                Resume tools for your next opportunity
              </p>
            </div>
          </div>

          <div className="relative mt-7 max-w-3xl">
            <span className="inline-flex rounded-full border border-violet-200 bg-white/80 px-3 py-1 text-xs font-semibold tracking-wide text-violet-700">
              RESUME TOOLKIT
            </span>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Resume ATS{" "}
              <span className="bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                Checker
              </span>
            </h1>
            <p className="mt-3 text-base leading-7 text-slate-600">
              Compare your resume with a job description, discover
              keyword gaps and get practical suggestions for improvement.
            </p>
          </div>
        </header>

        <div className="mt-7 grid items-start gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm shadow-violet-100/50 sm:p-7">
            <SectionTitle number="1">Upload your resume</SectionTitle>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Supported formats: PDF, DOCX and TXT. Maximum size: 5 MB.
            </p>

            <label
              htmlFor="resume-file"
              className="mt-5 flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed border-violet-200 bg-gradient-to-br from-violet-50/80 to-fuchsia-50/60 px-4 py-8 text-center transition hover:border-fuchsia-300 hover:from-violet-50 hover:to-fuchsia-50"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl text-violet-600 shadow-sm shadow-violet-100">
                ↑
              </span>
              <span className="mt-4 font-semibold text-slate-800">
                Choose a resume file
              </span>
              <span className="mt-1 text-sm text-slate-500">
                Select a PDF, DOCX or TXT from your device
              </span>
              <span className="mt-4 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow-md hover:shadow-violet-200">
                Browse Files
              </span>
            </label>

            <input
              id="resume-file"
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt"
              className="sr-only"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setResult(null);
                setError("");
                setCheckedTasks([]);
              }}
            />

            {file && (
              <div className="mt-4 flex items-start gap-3 rounded-xl border border-violet-100 bg-violet-50/70 p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-sm font-bold text-violet-700">
                  FILE
                </span>
                <div className="min-w-0 flex-1">
                  <p className="break-all text-sm font-semibold text-slate-800">
                    {file.name}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setResult(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = "";
                    }
                  }}
                  aria-label="Remove selected resume"
                  className="rounded-lg px-2 py-1 text-sm font-medium text-slate-500 transition hover:bg-white hover:text-red-600"
                >
                  Remove
                </button>
              </div>
            )}

            <div className="mt-8">
              <SectionTitle number="2">Job description</SectionTitle>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Paste the job description you want to compare against.
              </p>

              <textarea
                value={jobDescription}
                onChange={(event) => {
                  setJobDescription(event.target.value);
                  setResult(null);
                  setError("");
                  setCheckedTasks([]);
                }}
                rows={9}
                maxLength={100000}
                placeholder="Paste the job title, required skills, responsibilities and qualifications here..."
                className="mt-4 w-full resize-y rounded-xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
              />

              <p className="mt-2 text-right text-xs text-slate-400">
                {jobDescription.length.toLocaleString()}/100,000 characters
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700"
              >
                <strong className="block">Something needs attention</strong>
                <span>{error}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleCheckATS}
              disabled={loading}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-3.5 font-bold text-white shadow-md shadow-violet-200/60 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-violet-200 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {loading ? (
                <>
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Analyzing Resume...
                </>
              ) : (
                <>
                  Check ATS Match <span aria-hidden="true">→</span>
                </>
              )}
            </button>

            <p className="mt-3 text-center text-xs leading-5 text-slate-500">
              Your selected file and job description are sent to your
              configured backend for analysis.
            </p>
          </section>

          <section className="min-w-0 rounded-2xl border border-violet-100 bg-white p-5 shadow-sm shadow-violet-100/50 sm:p-7">
            <SectionTitle number="3">ATS analysis</SectionTitle>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Your keyword comparison and improvement plan will appear here.
            </p>

            {!result && !loading && (
              <div className="mt-6 flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-violet-200 bg-gradient-to-br from-violet-50/80 to-fuchsia-50/60 p-6 text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-violet-100 bg-white text-3xl shadow-sm shadow-violet-100">
                  📄
                </span>
                <h3 className="mt-4 font-bold text-slate-800">
                  Your results will appear here
                </h3>
                <p className="mt-2 max-w-xs text-sm leading-6 text-slate-500">
                  Upload your resume and enter a job description to start
                  your keyword analysis.
                </p>
              </div>
            )}

            {loading && (
              <div
                role="status"
                className="mt-6 flex min-h-72 flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-violet-50 to-fuchsia-50 p-6 text-center"
              >
                <span className="h-12 w-12 animate-spin rounded-full border-4 border-violet-100 border-t-violet-600" />
                <h3 className="mt-5 font-bold text-slate-800">
                  Analyzing your resume
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  Please wait while the backend processes your request.
                </p>
              </div>
            )}

            {result && (
              <div className="mt-6 space-y-7">
                <section className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 p-5">
                  <p className="text-sm font-semibold text-slate-600">
                    Estimated keyword match
                  </p>

                  <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
                    <p className="text-5xl font-extrabold tracking-tight text-violet-700">
                      {score}
                      <span className="text-xl font-semibold text-slate-400">
                        /100
                      </span>
                    </p>
                    <span className="rounded-full border border-violet-100 bg-white px-3 py-1.5 text-xs font-bold text-violet-700">
                      {scoreLabel}
                    </span>
                  </div>

                  <div
                    className="mt-5 h-3 overflow-hidden rounded-full bg-violet-100"
                    role="progressbar"
                    aria-label="Estimated ATS keyword match"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={score}
                  >
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 transition-all duration-500"
                      style={{ width: `${score}%` }}
                    />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-600">
                    <span className="rounded-lg border border-violet-100/70 bg-white px-3 py-2">
                      <strong className="text-slate-900">
                        {result.resumeWordCount.toLocaleString()}
                      </strong>{" "}
                      words
                    </span>
                    <span className="rounded-lg border border-violet-100/70 bg-white px-3 py-2">
                      <strong className="text-slate-900">
                        {result.matchedKeywords.length}
                      </strong>{" "}
                      matched keywords
                    </span>
                    <span className="rounded-lg border border-violet-100/70 bg-white px-3 py-2">
                      <strong className="text-slate-900">
                        {result.missingKeywords.length}
                      </strong>{" "}
                      missing keywords
                    </span>
                  </div>
                </section>

                <section>
                  <h3 className="font-bold text-emerald-700">
                    Matched keywords ({result.matchedKeywords.length})
                  </h3>
                  <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                    <KeywordChips
                      keywords={result.matchedKeywords}
                      variant="matched"
                      emptyMessage="No matching keywords found."
                    />
                  </div>
                </section>

                <section>
                  <h3 className="font-bold text-amber-700">
                    Missing keywords ({result.missingKeywords.length})
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Check these terms against the role requirements. Only
                    include them if they accurately describe your skills.
                  </p>
                  <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                    <KeywordChips
                      keywords={result.missingKeywords}
                      variant="missing"
                      emptyMessage="No missing keywords detected."
                    />
                  </div>
                </section>

                <section>
                  <h3 className="text-lg font-bold text-slate-900">
                    Improvement recommendations
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Suggestions are grouped by the types of missing keywords
                    identified by the current checker.
                  </p>

                  <div className="mt-4 space-y-3">
                    {recommendations.length > 0 ? (
                      recommendations.map((item, index) => (
                        <div
                          key={item.title}
                          className="rounded-xl border border-violet-100 bg-white p-4 transition hover:border-violet-200 hover:shadow-sm"
                        >
                          <div className="flex items-start gap-3">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-100 to-fuchsia-100 text-sm font-bold text-violet-700">
                              {index + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                              <h4 className="font-bold text-slate-800">
                                {item.title}
                              </h4>
                              <p className="mt-2 text-sm leading-6 text-slate-600">
                                {item.description}
                              </p>
                              <div className="mt-3">
                                <KeywordChips
                                  keywords={item.relevantKeywords}
                                  variant="neutral"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="rounded-xl border border-violet-100 bg-violet-50/70 p-4 text-sm leading-6 text-slate-600">
                        No grouped recommendations available. Review the
                        missing keywords and job requirements above.
                      </p>
                    )}
                  </div>
                </section>

                <section>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-lg font-bold text-slate-900">
                      Improvement checklist
                    </h3>
                    <span className="text-sm font-semibold text-violet-700">
                      {checkedTasks.length}/{tasks.length} completed
                    </span>
                  </div>

                  <div className="mt-3 space-y-3">
                    {tasks.map((task) => {
                      const checked = checkedTasks.includes(task);

                      return (
                        <label
                          key={task}
                          className="flex cursor-pointer items-start gap-3 rounded-xl border border-violet-100 bg-white p-3 transition hover:border-violet-200 hover:bg-violet-50/50"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleTask(task)}
                            className="mt-1 h-4 w-4 accent-violet-600"
                          />
                          <span
                            className={`text-sm leading-6 ${
                              checked
                                ? "text-slate-400 line-through"
                                : "text-slate-700"
                            }`}
                          >
                            {task}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </section>

                <section>
                  <h3 className="font-bold text-slate-900">
                    Additional suggestions
                  </h3>
                  <ul className="mt-3 space-y-3">
                    {result.suggestions.length > 0 ? (
                      result.suggestions.map((suggestion, index) => (
                        <li
                          key={`${index}-${suggestion}`}
                          className="flex items-start gap-3 rounded-xl border border-violet-100 bg-gradient-to-r from-white to-violet-50/60 p-4 text-sm leading-6 text-slate-700"
                        >
                          <span className="mt-0.5 font-bold text-fuchsia-600">
                            •
                          </span>
                          <span>{suggestion}</span>
                        </li>
                      ))
                    ) : (
                      <li className="rounded-xl border border-violet-100 bg-violet-50/60 p-4 text-sm text-slate-500">
                        Review the improvement checklist for your next steps.
                      </li>
                    )}
                  </ul>
                </section>

                <p className="rounded-xl border border-violet-100 bg-gradient-to-r from-violet-50 to-fuchsia-50 p-4 text-xs leading-5 text-slate-600">
                  This score estimates keyword alignment. It is not an
                  official ATS score or a prediction of hiring outcomes.
                  Add keywords only when they truthfully reflect your
                  skills and experience.
                </p>

                <button
                  type="button"
                  onClick={resetAnalysis}
                  className="w-full rounded-xl border border-violet-200 bg-white px-4 py-3 font-bold text-violet-700 transition hover:border-fuchsia-200 hover:bg-violet-50"
                >
                  Check Another Resume
                </button>
              </div>
            )}
          </section>
        </div>

        <footer className="mt-8 border-t border-violet-100 py-5 text-center text-xs text-slate-500">
          MockMate AI <span className="mx-1 text-violet-300">·</span>
          Practice. Improve. Perform.
        </footer>
      </div>
    </main>
  );
}
