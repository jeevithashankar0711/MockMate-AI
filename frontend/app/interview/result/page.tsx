
"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type EvaluationAnswer = {
  question?: string;
  answer?: string;
  score?: number | string;
  feedback?: string;
  suggestedAnswer?: string;
};

type Evaluation = {
  overallScore?: number | string;
  summary?: string;
  answers?: EvaluationAnswer[];
  mode?: string;
};

type InterviewResult = {
  id: string | number;
  userId?: string | number;
  jobRole?: string;
  interviewType?: string;
  difficulty?: string;
  questions?: unknown;
  answers?: unknown;
  score?: number | null;
  createdAt?: string;
  evaluation?: Evaluation | null;
};

type SessionUser = {
  id?: string | number;
  userId?: string | number;
  fullName?: string;
  name?: string;
  email?: string;
};

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"
).replace(/\/+$/, "");

const primaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-3 font-semibold text-white shadow-md shadow-violet-200 transition duration-300 hover:-translate-y-0.5 hover:from-violet-700 hover:to-fuchsia-700 disabled:cursor-not-allowed disabled:opacity-60";

function asList(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;

  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

function asScore(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;

  const number = Number(value);

  return Number.isFinite(number) && number >= 0 && number <= 100
    ? Math.round(number)
    : null;
}

function asText(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function getSessionUser(): SessionUser {
  const raw = sessionStorage.getItem("mockmateUser");

  if (!raw) {
    throw new Error("Your login session was not found. Please log in again.");
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Your login session is invalid. Please log in again.");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Your login session is invalid. Please log in again.");
  }

  const user = parsed as SessionUser;
  const id = user.id ?? user.userId;

  if (
    id === undefined ||
    id === null ||
    String(id).trim() === "" ||
    !Number.isFinite(Number(id)) ||
    Number(id) <= 0
  ) {
    throw new Error("Your session has no valid user ID. Please log in again.");
  }

  return { ...user, id };
}

async function apiRequest(
  path: string,
  options?: RequestInit
): Promise<Response> {
  try {
    return await fetch(`${API_URL}${path}`, {
      ...options,
      cache: "no-store",
    });
  } catch {
    throw new Error(
      `Cannot connect to backend at ${API_URL}. Make sure your Go backend is running.`
    );
  }
}

async function responseError(response: Response): Promise<string> {
  const text = await response.text();

  if (!text) return `Request failed (${response.status}).`;

  try {
    const data = JSON.parse(text) as {
      error?: string;
      message?: string;
    };

    return data.error || data.message || `Request failed (${response.status}).`;
  } catch {
    return text;
  }
}

async function parseJSON<T>(response: Response): Promise<T> {
  try {
    return (await response.json()) as T;
  } catch {
    throw new Error("Backend returned an invalid JSON response.");
  }
}

function validateEvaluation(value: unknown): Evaluation {
  if (!value || typeof value !== "object") {
    throw new Error("Invalid evaluation response from backend.");
  }

  const evaluation = value as Evaluation;
  const score = asScore(evaluation.overallScore);

  if (score === null) {
    throw new Error("Evaluation response has an invalid overall score.");
  }

  if (!Array.isArray(evaluation.answers)) {
    throw new Error("Evaluation response must contain an answers array.");
  }

  return {
    ...evaluation,
    overallScore: score,
    answers: evaluation.answers,
  };
}

function ResultPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const interviewId = searchParams.get("id");

  const [result, setResult] = useState<InterviewResult | null>(null);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState("");
  const [evaluationError, setEvaluationError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  const loadResult = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      if (!interviewId || !/^\d+$/.test(interviewId)) {
        throw new Error(
          "A valid interview ID is missing. Open a result from your dashboard."
        );
      }

      const user = getSessionUser();
      const query = new URLSearchParams({ userId: String(user.id) });
      const response = await apiRequest(`/interviews?${query.toString()}`);

      if (!response.ok) {
        throw new Error(await responseError(response));
      }

      const payload = await parseJSON<unknown>(response);

      const interviews: InterviewResult[] = Array.isArray(payload)
        ? (payload as InterviewResult[])
        : payload &&
            typeof payload === "object" &&
            Array.isArray((payload as { interviews?: unknown }).interviews)
          ? (payload as { interviews: InterviewResult[] }).interviews
          : [];

      const selected = interviews.find(
        (item) => String(item.id) === interviewId
      );

      if (!selected) {
        throw new Error(`Interview #${interviewId} was not found.`);
      }

      setResult(selected);

      let savedEvaluation: Evaluation | null = null;

      try {
        if (selected.evaluation) {
          savedEvaluation = validateEvaluation(selected.evaluation);
        }
      } catch {
        savedEvaluation = null;
      }

      let cachedEvaluation: Evaluation | null = null;

      try {
        const cached = sessionStorage.getItem(
          `mockmate-evaluation-${selected.id}`
        );

        if (cached) {
          cachedEvaluation = validateEvaluation(JSON.parse(cached));
        }
      } catch {
        cachedEvaluation = null;
      }

      setEvaluation(savedEvaluation ?? cachedEvaluation);
      setEvaluationError("");
      setSaveMessage("");
    } catch (err) {
      setResult(null);
      setEvaluation(null);
      setError(
        err instanceof Error ? err.message : "Unable to load interview results."
      );
    } finally {
      setLoading(false);
    }
  }, [interviewId]);

  useEffect(() => {
    void loadResult();
  }, [loadResult]);

  const evaluateInterview = async () => {
    if (!result || evaluating) return;

    setEvaluating(true);
    setEvaluationError("");
    setError("");
    setSaveMessage("");

    try {
      const user = getSessionUser();
      const questions = asList(result.questions);
      const answers = asList(result.answers);

      if (questions.length === 0) {
        throw new Error("No interview questions were found.");
      }

      if (answers.length === 0) {
        throw new Error("No interview answers were found.");
      }

      const evaluationResponse = await apiRequest("/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: Number(result.id),
          userId: Number(user.id),
          jobRole: result.jobRole ?? "Software Developer",
          interviewType: result.interviewType ?? "Technical Interview",
          difficulty: result.difficulty ?? "Beginner",
          questions,
          answers,
        }),
      });

      if (!evaluationResponse.ok) {
        const message = await responseError(evaluationResponse);

        throw new Error(
          evaluationResponse.status === 429
            ? `Gemini API quota exceeded. ${message}`
            : `Evaluation failed: ${message}`
        );
      }

      const data = validateEvaluation(
        await parseJSON<unknown>(evaluationResponse)
      );

      const saveResponse = await apiRequest("/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: Number(result.id),
          userId: Number(user.id),
          jobRole: result.jobRole ?? "Software Developer",
          interviewType: result.interviewType ?? "Technical Interview",
          difficulty: result.difficulty ?? "Beginner",
          questions,
          answers,
          score: Number(data.overallScore),
          evaluation: data,
        }),
      });

      if (!saveResponse.ok) {
        setEvaluation(data);

        try {
          sessionStorage.setItem(
            `mockmate-evaluation-${result.id}`,
            JSON.stringify(data)
          );
        } catch {
          // Keep the generated evaluation visible.
        }

        throw new Error(
          `AI evaluation completed, but permanent saving failed (${saveResponse.status}): ${await responseError(saveResponse)}`
        );
      }

      await parseJSON<unknown>(saveResponse);

      setEvaluation(data);
      setResult((previous) =>
        previous
          ? {
              ...previous,
              score: Number(data.overallScore),
              evaluation: data,
            }
          : previous
      );

      try {
        sessionStorage.setItem(
          `mockmate-evaluation-${result.id}`,
          JSON.stringify(data)
        );
      } catch {
        // Database saving has already succeeded.
      }

      setSaveMessage(
        `Evaluation completed and saved successfully for Interview #${result.id}.`
      );
    } catch (err) {
      setEvaluationError(
        err instanceof Error ? err.message : "Unable to evaluate this interview."
      );
    } finally {
      setEvaluating(false);
    }
  };

  const retakeInterview = () => {
    if (!result) return;

    const params = new URLSearchParams({
      retake: "1",
      jobRole: result.jobRole || "Software Developer",
      interviewType: result.interviewType || "Technical Interview",
      difficulty: result.difficulty || "Beginner",
    });

    router.push(`/interview?${params.toString()}`);
  };

  const questions = asList(result?.questions);
  const answers = asList(result?.answers);
  const currentScore = asScore(evaluation?.overallScore);
  const previousScore = asScore(result?.score);

  const cardClass =
    "rounded-3xl border border-violet-100 bg-white shadow-xl shadow-violet-100/50";

  const secondaryButtonClass = primaryButtonClass;

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 px-4 text-slate-700">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-violet-100 border-t-violet-600" />
          <p className="text-sm font-medium text-slate-500">
            Loading interview results...
          </p>
        </div>
      </main>
    );
  }

  if (!result) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 px-4 py-12 text-slate-900">
        <section className="mx-auto max-w-2xl rounded-3xl border border-violet-100 bg-white p-6 shadow-xl shadow-violet-100/50 sm:p-8">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-fuchsia-100 text-2xl">
            ⚠️
          </div>

          <h1 className="text-2xl font-extrabold">
            Unable to load results
          </h1>

          <p className="mt-4 whitespace-pre-wrap leading-7 text-red-600">
            {error || "No interview result found."}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void loadResult()}
              className={primaryButtonClass}
            >
              Retry
            </button>

            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className={secondaryButtonClass}
            >
              Dashboard
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 text-slate-900">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <header className="mb-8">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-4 py-2 text-xs font-bold tracking-wide text-violet-700 shadow-sm">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white">
              ✦
            </span>
            MOCKMATE AI · YOUR RESULTS
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Interview{" "}
            <span className="bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
              Results
            </span>
          </h1>

          <p className="mt-3 leading-7 text-slate-500">
            Review your answers, understand your feedback, and identify
            opportunities to improve.
          </p>
        </header>

        {error && (
          <div
            role="alert"
            className="mb-6 whitespace-pre-wrap rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700"
          >
            {error}
          </div>
        )}

        {evaluationError && (
          <div
            role="alert"
            className="mb-6 whitespace-pre-wrap rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700"
          >
            {evaluationError}
          </div>
        )}

        {saveMessage && (
          <div
            role="status"
            className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800"
          >
            <span className="mr-2 font-bold">✓</span>
            {saveMessage}
          </div>
        )}

        <section className={`${cardClass} overflow-hidden`}>
          <div className="border-b border-violet-100 bg-gradient-to-r from-violet-50 via-purple-50 to-fuchsia-50 px-5 py-6 sm:px-8">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-xl text-white shadow-lg shadow-violet-200">
                🏆
              </div>

              <div>
                <h2 className="text-xl font-bold">Interview Overview</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Your practice session at a glance.
                </p>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-violet-600">
                  Interview role
                </p>

                <h2 className="mt-1 break-words text-2xl font-extrabold text-slate-900">
                  {asText(result.jobRole, "Mock Interview")}
                </h2>

                <p className="mt-2 text-slate-500">
                  {asText(result.interviewType, "Interview")}
                  {result.difficulty ? ` · ${result.difficulty}` : ""}
                </p>

                <p className="mt-3 text-xs font-medium text-slate-400">
                  Interview ID: {result.id}
                </p>
              </div>

              <div className="w-full shrink-0 rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-fuchsia-50 p-5 text-center sm:w-52">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {evaluation ? "Evaluation Score" : "Previous Saved Score"}
                </p>

                <p className="mt-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-5xl font-extrabold text-transparent">
                  {currentScore !== null
                    ? `${currentScore}%`
                    : previousScore !== null
                      ? `${previousScore}%`
                      : "—"}
                </p>

                {!evaluation && previousScore !== null && (
                  <p className="mt-3 text-xs leading-5 text-amber-700">
                    Previous result. The current evaluation has not completed.
                  </p>
                )}

                {evaluation?.mode && (
                  <span className="mt-3 inline-flex rounded-full border border-violet-200 bg-white px-3 py-1 text-xs font-semibold capitalize text-violet-700">
                    {evaluation.mode} evaluation
                  </span>
                )}
              </div>
            </div>

            {evaluation?.summary && (
              <div className="mt-7 rounded-2xl border border-violet-100 bg-violet-50/50 p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-100 to-fuchsia-100">
                    ✨
                  </span>
                  <h3 className="font-bold text-slate-900">
                    Evaluation Summary
                  </h3>
                </div>

                <p className="mt-3 whitespace-pre-wrap leading-7 text-slate-600">
                  {evaluation.summary}
                </p>
              </div>
            )}

            <div className="mt-7 flex flex-col gap-3 border-t border-violet-100 pt-6 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                onClick={retakeInterview}
                className={primaryButtonClass}
              >
                <span>↻</span>
                Retake Interview
              </button>

              <button
                type="button"
                onClick={() => void evaluateInterview()}
                disabled={evaluating}
                className={primaryButtonClass}
              >
                {evaluating && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                )}

                {evaluating
                  ? "Evaluating and saving..."
                  : evaluation
                    ? "Evaluate Again"
                    : "Evaluate Interview"}
              </button>

              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className={primaryButtonClass}
              >
                Dashboard
              </button>

              <button
                type="button"
                onClick={() => router.push("/interview")}
                className={primaryButtonClass}
              >
                New Interview
              </button>
            </div>
          </div>
        </section>

        <section className={`${cardClass} mt-6 overflow-hidden`}>
          <div className="border-b border-violet-100 bg-gradient-to-r from-white to-violet-50 px-5 py-5 sm:px-8">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-fuchsia-100 text-xl">
                📝
              </div>

              <div>
                <h2 className="text-xl font-bold">Questions and Answers</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Review your responses and personalized feedback.
                </p>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-8">
            {questions.length === 0 &&
            answers.length === 0 &&
            !evaluation?.answers?.length ? (
              <div className="rounded-2xl border border-violet-100 bg-violet-50/50 p-6 text-center">
                <p className="font-semibold text-slate-700">
                  No questions or answers found.
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  There is no interview content available to display.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {Array.from({
                  length: Math.max(
                    questions.length,
                    answers.length,
                    evaluation?.answers?.length ?? 0
                  ),
                }).map((_, index) => {
                  const question = questions[index];
                  const answer = answers[index];
                  const feedback = evaluation?.answers?.[index];

                  const questionText =
                    typeof question === "string"
                      ? question
                      : question &&
                          typeof question === "object" &&
                          "question" in question
                        ? asText(
                            (question as { question?: unknown }).question,
                            `Question ${index + 1}`
                          )
                        : feedback?.question || `Question ${index + 1}`;

                  const answerText =
                    typeof answer === "string"
                      ? answer
                      : answer &&
                          typeof answer === "object" &&
                          "answer" in answer
                        ? asText(
                            (answer as { answer?: unknown }).answer,
                            "No answer recorded."
                          )
                        : feedback?.answer || "No answer recorded.";

                  const answerScore = asScore(feedback?.score);

                  return (
                    <article
                      key={index}
                      className="overflow-hidden rounded-2xl border border-violet-100 bg-white transition duration-300 hover:border-violet-200 hover:shadow-lg hover:shadow-violet-100/50"
                    >
                      <div className="border-b border-violet-100 bg-gradient-to-r from-violet-50/80 to-fuchsia-50/50 p-5">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <span className="rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 py-1.5 text-xs font-bold text-white">
                            QUESTION {String(index + 1).padStart(2, "0")}
                          </span>

                          {answerScore !== null && (
                            <span className="rounded-full border border-violet-200 bg-white px-3 py-1.5 text-xs font-bold text-violet-700">
                              Score: {answerScore}/100
                            </span>
                          )}
                        </div>

                        <h3 className="font-bold leading-7 text-slate-900">
                          {questionText}
                        </h3>
                      </div>

                      <div className="space-y-5 p-5">
                        <div>
                          <h4 className="flex items-center gap-2 text-sm font-bold text-slate-700">
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-xs text-violet-700">
                              A
                            </span>
                            Your Answer
                          </h4>

                          <p className="mt-3 whitespace-pre-wrap leading-7 text-slate-600">
                            {answerText}
                          </p>
                        </div>

                        {evaluation && (
                          <>
                            <div className="rounded-xl border border-violet-100 bg-violet-50/40 p-4">
                              <h4 className="flex items-center gap-2 font-bold text-violet-800">
                                <span>💡</span>
                                Feedback
                              </h4>

                              <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                                {asText(
                                  feedback?.feedback,
                                  "No feedback provided."
                                )}
                              </p>
                            </div>

                            {feedback?.suggestedAnswer && (
                              <div className="rounded-xl border border-fuchsia-100 bg-fuchsia-50/40 p-4">
                                <h4 className="flex items-center gap-2 font-bold text-fuchsia-800">
                                  <span>✦</span>
                                  Suggested Answer
                                </h4>

                                <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                                  {feedback.suggestedAnswer}
                                </p>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section className="relative mt-6 overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 p-6 text-white shadow-xl shadow-violet-200 sm:p-8">
          <div className="absolute -right-8 -top-10 h-36 w-36 rounded-full bg-white/10" />
          <div className="absolute -bottom-12 -left-8 h-40 w-40 rounded-full bg-white/10" />

          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-2xl">
                🚀
              </div>

              <div>
                <h2 className="text-xl font-extrabold">
                  Keep learning. Keep improving.
                </h2>

                <p className="mt-2 max-w-xl text-sm leading-6 text-violet-100">
                  Use your feedback to identify what went well and what you
                  can improve in your next practice session.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={retakeInterview}
              className="shrink-0 rounded-xl bg-white px-5 py-3 font-bold text-violet-700 shadow-md transition hover:-translate-y-0.5 hover:bg-violet-50"
            >
              Practice Again →
            </button>
          </div>
        </section>

        <footer className="mt-8 border-t border-violet-100 pt-6 text-center text-xs text-slate-400">
          MockMate AI <span className="mx-1 text-violet-500">·</span>
          Practice today, prepare for tomorrow.
        </footer>
      </div>
    </main>
  );
}

export default function ResultPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 px-4 text-slate-700">
          <div className="text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-violet-100 border-t-violet-600" />
            <p className="text-sm font-medium text-slate-500">
              Loading interview results...
            </p>
          </div>
        </main>
      }
    >
      <ResultPageContent />
    </Suspense>
  );
}
