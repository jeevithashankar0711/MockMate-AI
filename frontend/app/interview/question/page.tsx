
"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type AnswerFeedback = {
  question: string;
  answer: string;
  score: number;
  feedback: string;
  suggestedAnswer: string;
};

type EvaluationResult = {
  overallScore: number;
  summary: string;
  answers: AnswerFeedback[];
  mode?: "ai" | "demo";
};

type StoredUser = {
  id?: number | string;
  userId?: number | string;
};

type ApiResponse = {
  error?: string;
  message?: string;
  id?: number | string;
  interview?: { id?: number | string };
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") ||
  "http://localhost:8080";

const QUESTION_BANK: Record<string, string[]> = {
  "Software Developer": [
    "What is Object-Oriented Programming? Explain its main principles.",
    "What is the difference between an array and a linked list?",
    "What is inheritance in an object-oriented language?",
    "What is polymorphism, and where would you use it?",
    "What is the difference between SQL and NoSQL databases?",
    "How do you handle errors in an application?",
    "What is the difference between a stack and a queue?",
    "Why is writing unit tests important?",
    "How would you debug a program that produces incorrect output?",
    "Explain a software project you have worked on.",
  ],
  "Frontend Developer": [
    "What is the difference between HTML, CSS, and JavaScript?",
    "Explain the difference between React props and state.",
    "What is the Virtual DOM?",
    "How do you make a web page responsive?",
    "How would you improve page loading performance?",
    "What are React hooks?",
    "What is the difference between let, const, and var?",
    "How do you validate a form?",
    "How do you handle API errors in a frontend application?",
    "Tell me about a frontend project you have built.",
  ],
  "Backend Developer": [
    "What is a REST API?",
    "What is the difference between authentication and authorization?",
    "How do database indexes improve query performance?",
    "What is the purpose of HTTP status codes?",
    "How would you handle errors in a backend service?",
    "What is the difference between GET and POST?",
    "What is database normalization?",
    "How would you secure an API?",
    "How do you investigate a slow database query?",
    "Describe a backend project you have worked on.",
  ],
  "Full Stack Developer": [
    "How does a frontend communicate with a backend?",
    "What happens when a user submits a web form?",
    "How would you design a login system?",
    "How do you validate data on frontend and backend?",
    "How would you investigate a slow web application?",
    "What is the purpose of an API?",
    "How would you store user data securely?",
    "What is the difference between client-side and server-side rendering?",
    "How do you debug an issue across frontend and backend?",
    "Describe a full-stack project you have built.",
  ],
  "Java Developer": [
    "What are the four main principles of OOP?",
    "What is the difference between an interface and an abstract class?",
    "What is the difference between == and equals()?",
    "What is exception handling in Java?",
    "What is the difference between ArrayList and LinkedList?",
    "What is method overloading?",
    "What is method overriding?",
    "What is the Java Collections Framework?",
    "How does garbage collection work in Java?",
    "Tell me about a Java project you have built.",
  ],
  "Python Developer": [
    "What are the main features of Python?",
    "What is the difference between a list and a tuple?",
    "What are Python dictionaries used for?",
    "Explain exception handling in Python.",
    "What is the difference between a module and a package?",
    "What are Python decorators?",
    "What is a list comprehension?",
    "How do you read and write files in Python?",
    "How do you debug a Python program?",
    "Describe a Python project you have worked on.",
  ],
  "Data Analyst": [
    "What is the difference between data analysis and data visualization?",
    "How would you handle missing values in a dataset?",
    "Explain the difference between WHERE and HAVING in SQL.",
    "What is the difference between mean and median?",
    "How would you explain a business trend using data?",
    "What is a SQL JOIN?",
    "How would you identify duplicate records?",
    "Which charts would you use to compare categories?",
    "How do you check data quality?",
    "Describe a time you used data to answer a question.",
  ],
  "AI/ML Engineer": [
    "What is the difference between supervised and unsupervised learning?",
    "What is overfitting, and how can it be reduced?",
    "Why split data into training and testing sets?",
    "What is the difference between classification and regression?",
    "How would you evaluate a machine learning model?",
    "What is feature engineering?",
    "What is a confusion matrix?",
    "What is the purpose of cross-validation?",
    "How would you handle an imbalanced dataset?",
    "Describe an AI or machine learning project you have built.",
  ],
};

const HR_QUESTIONS = [
  "Tell me about yourself and your background.",
  "Why are you interested in this role?",
  "What are your strengths?",
  "Describe a challenge you faced and how you handled it.",
  "Why should we consider you for this position?",
  "What skills would you like to improve?",
  "How do you respond to constructive feedback?",
  "How do you manage competing priorities?",
  "Describe a time you worked with others to solve a problem.",
  "What are your career goals?",
];

const MIXED_QUESTIONS = [
  "Tell me about yourself and your technical interests.",
  "Explain a project you have worked on and your contribution.",
  "What is the difference between an array and a linked list?",
  "Describe a difficult problem you solved.",
  "How would you improve a slow web application?",
  "Why are you interested in this job role?",
  "How do you test your code before releasing it?",
  "How would you handle a disagreement within a team?",
  "Explain how you would debug an application error.",
  "What skills make you suitable for this role?",
];

function getQuestions(
  role: string,
  type: string,
  difficulty: string
): string[] {
  const source =
    type === "HR Interview"
      ? HR_QUESTIONS
      : type === "Mixed Interview"
        ? MIXED_QUESTIONS
        : QUESTION_BANK[role] ?? QUESTION_BANK["Software Developer"];

  return source.slice(0, 5).map((question) =>
    difficulty === "Advanced"
      ? `${question} Include your reasoning and relevant examples.`
      : question
  );
}

function getUserId(): number | null {
  try {
    const raw = sessionStorage.getItem("mockmateUser");
    if (!raw) return null;

    const user = JSON.parse(raw) as StoredUser;
    const id = Number(user.id ?? user.userId);

    return Number.isSafeInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

async function apiRequest(
  path: string,
  body: unknown,
  action: string
): Promise<any> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(
      `Cannot connect to the backend at ${API_BASE_URL}. Check whether your Go server is running.`
    );
  }

  const responseText = await response.text();
  let data: any = {};

  if (responseText.trim()) {
    try {
      data = JSON.parse(responseText);
    } catch {
      throw new Error(`${action}: the server returned invalid JSON.`);
    }
  }

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error(
        "Gemini AI quota limit reached. Please wait and try again."
      );
    }

    if (response.status === 401 || response.status === 403) {
      throw new Error(
        "The AI service rejected the request. Check your backend API configuration."
      );
    }

    throw new Error(
      data.error ||
        data.message ||
        `${action} failed (HTTP ${response.status}).`
    );
  }

  return data;
}

function QuestionPageContent() {
  const router = useRouter();
  const params = useSearchParams();

  const jobRole = params.get("jobRole") || "Software Developer";
  const interviewType =
    params.get("interviewType") || "Technical Interview";
  const difficulty = params.get("difficulty") || "Beginner";

  const questions = getQuestions(jobRole, interviewType, difficulty);

  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [answers, setAnswers] = useState<string[]>(
    () => Array(questions.length).fill("")
  );
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const progress = ((index + 1) / questions.length) * 100;

  function submitAnswer() {
    if (busy) return;

    const cleanAnswer = answer.trim();

    if (!cleanAnswer) {
      setError("Please type your answer before submitting.");
      return;
    }

    const updatedAnswers = [...answers];
    updatedAnswers[index] = cleanAnswer;

    setAnswers(updatedAnswers);
    setError("");
    setSubmitted(true);
  }

  function nextQuestion() {
    if (index >= questions.length - 1) return;

    const next = index + 1;

    setIndex(next);
    setAnswer(answers[next] || "");
    setSubmitted(false);
    setError("");
  }

  async function finishInterview() {
    if (busy) return;

    const finalAnswers = [...answers];
    finalAnswers[index] = answer.trim();

    if (finalAnswers.some((item) => !item.trim())) {
      setError("Please answer every question before finishing.");
      return;
    }

    if (questions.length !== 5 || finalAnswers.length !== 5) {
      setError(
        "This interview must contain exactly 5 questions and 5 answers. Please restart the interview."
      );
      return;
    }

    const userId = getUserId();

    if (userId === null) {
      setError("Login information not found. Please log in again.");
      return;
    }

    setAnswers(finalAnswers);
    setBusy(true);
    setError("");

    try {
      const evaluation = (await apiRequest(
        "/evaluate",
        {
          userId,
          jobRole,
          interviewType,
          difficulty,
          questions,
          answers: finalAnswers,
        },
        "Final interview evaluation"
      )) as EvaluationResult;

      if (
        typeof evaluation.overallScore !== "number" ||
        !Array.isArray(evaluation.answers) ||
        evaluation.answers.length !== 5
      ) {
        throw new Error(
          "The final evaluation response is invalid. Check the Go /evaluate endpoint."
        );
      }

      const saved = (await apiRequest(
        "/interviews",
        {
          userId,
          jobRole,
          interviewType,
          difficulty,
          questions,
          answers: finalAnswers,
          score: evaluation.overallScore,
          evaluation,
        },
        "Saving interview"
      )) as ApiResponse;

      const interviewId = saved.id ?? saved.interview?.id;

      if (interviewId === undefined || interviewId === null) {
        throw new Error("The backend did not return a saved interview ID.");
      }

      try {
        sessionStorage.setItem(
          `mockmate-evaluation-${interviewId}`,
          JSON.stringify(evaluation)
        );
      } catch {
        // The result page can retrieve the saved evaluation from the backend.
      }

      router.push(
        `/interview/result?id=${encodeURIComponent(String(interviewId))}`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not evaluate or save the interview."
      );
    } finally {
      setBusy(false);
    }
  }

  const cardClass =
    "overflow-hidden rounded-3xl border border-violet-100 bg-white shadow-xl shadow-violet-100/50";

  const secondaryButtonClass =
    "rounded-xl border border-violet-200 bg-white px-5 py-3 font-semibold text-slate-600 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-50";

  const primaryButtonClass =
    "inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3.5 font-semibold text-white shadow-lg shadow-violet-200 transition duration-300 hover:-translate-y-0.5 hover:from-violet-700 hover:to-fuchsia-700 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-violet-200 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0";

  return (
    <main className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 px-4 py-8 text-slate-900 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <header className="mb-8">
          <button
            type="button"
            onClick={() => router.push("/interview")}
            disabled={busy}
            className="mb-6 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-violet-600 transition hover:bg-white hover:text-fuchsia-600 disabled:opacity-50"
          >
            <span aria-hidden="true">←</span>
            Back to Interview Setup
          </button>

          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/90 px-4 py-2 text-xs font-bold tracking-wide text-violet-700 shadow-sm">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white">
              ✦
            </span>
            MOCKMATE AI · PRACTICE SESSION
          </div>

          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                {interviewType}
              </h1>

              <p className="mt-2 text-slate-500">
                {jobRole}
                <span className="mx-2 text-violet-300">·</span>
                {difficulty} level
              </p>
            </div>

            <div className="rounded-2xl border border-violet-100 bg-white px-5 py-3 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Your Progress
              </p>

              <p className="mt-1 font-bold text-slate-800">
                Question {index + 1}{" "}
                <span className="font-medium text-slate-400">
                  of {questions.length}
                </span>
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div
            className="mt-6 h-2.5 overflow-hidden rounded-full bg-violet-100"
            role="progressbar"
            aria-label="Interview progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress)}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="mt-2 text-right text-xs font-semibold text-violet-500">
            {Math.round(progress)}% completed
          </p>
        </header>

        {/* Main interview card */}
        <section className={cardClass}>
          <div className="flex items-center justify-between gap-3 border-b border-violet-100 bg-gradient-to-r from-violet-50 via-purple-50 to-fuchsia-50 px-5 py-5 sm:px-8">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-xl text-white shadow-md shadow-violet-200">
                💬
              </div>

              <div>
                <h2 className="font-bold text-slate-900">
                  Interview Question
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Take your time and explain your thinking.
                </p>
              </div>
            </div>

            <span className="shrink-0 rounded-full border border-violet-200 bg-white px-3 py-1.5 text-xs font-bold text-violet-700">
              {difficulty}
            </span>
          </div>

          <div className="p-5 sm:p-8">
            {/* Question */}
            <div className="mb-5 flex items-center gap-3">
              <span className="rounded-xl bg-gradient-to-r from-violet-100 to-fuchsia-100 px-3 py-1.5 text-sm font-extrabold text-violet-700">
                Q{String(index + 1).padStart(2, "0")}
              </span>

              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Question {index + 1}
              </span>
            </div>

            <h3 className="text-xl font-bold leading-relaxed text-slate-900 sm:text-2xl">
              {questions[index]}
            </h3>

            <div className="mt-8">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <label
                  htmlFor="answer"
                  className="text-sm font-bold text-slate-700"
                >
                  Your Answer
                </label>

                <span className="text-xs text-slate-400">
                  Explain clearly and include examples where possible.
                </span>
              </div>

              <textarea
                id="answer"
                value={answer}
                onChange={(event) => {
                  setAnswer(event.target.value);
                  setError("");
                }}
                placeholder="Start typing your answer here..."
                disabled={submitted || busy}
                rows={8}
                maxLength={10000}
                className="mt-3 w-full resize-y rounded-2xl border border-violet-100 bg-violet-50/40 p-4 leading-7 text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-violet-300 focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
              />

              <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-400">
                <span>
                  {submitted
                    ? "Your answer has been saved for the final evaluation."
                    : "Review your answer before submitting."}
                </span>

                <span className="shrink-0 font-medium">
                  {answer.trim().length} characters
                </span>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div
                className="mt-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700"
                role="alert"
              >
                <span
                  aria-hidden="true"
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100 font-bold"
                >
                  !
                </span>
                <p>{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="mt-8 flex flex-col-reverse gap-3 border-t border-violet-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => router.push("/interview")}
                disabled={busy}
                className={secondaryButtonClass}
              >
                Exit Interview
              </button>

              {!submitted ? (
                <button
                  type="button"
                  onClick={submitAnswer}
                  disabled={!answer.trim() || busy}
                  className={primaryButtonClass}
                >
                  Save Answer
                  <span aria-hidden="true">→</span>
                </button>
              ) : index < questions.length - 1 ? (
                <button
                  type="button"
                  onClick={nextQuestion}
                  disabled={busy}
                  className={primaryButtonClass}
                >
                  Next Question
                  <span aria-hidden="true">→</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={finishInterview}
                  disabled={busy}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3.5 font-semibold text-white shadow-lg shadow-emerald-100 transition duration-300 hover:-translate-y-0.5 hover:from-emerald-700 hover:to-teal-700 focus:outline-none focus:ring-4 focus:ring-emerald-200 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                >
                  {busy ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      Evaluating and Saving...
                    </>
                  ) : (
                    <>
                      Finish Interview
                      <span aria-hidden="true">✓</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Encouragement card */}
        <section className="relative mt-6 overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 p-5 text-white shadow-xl shadow-violet-200 sm:p-6">
          <div className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/10" />
          <div className="absolute -bottom-12 -left-8 h-36 w-36 rounded-full bg-white/10" />

          <div className="relative flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-xl">
              ✨
            </div>

            <div>
              <h2 className="font-bold">You&apos;re making progress!</h2>
              <p className="mt-1 text-sm leading-6 text-violet-100">
                Focus on explaining your reasoning, using examples, and
                expressing your ideas clearly. Every question is an
                opportunity to learn.
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-violet-100 pt-6 text-center text-xs text-slate-400 sm:flex-row sm:text-left">
          <p>
            MockMate AI <span className="mx-1 text-violet-500">·</span>
            Practice today, prepare for tomorrow.
          </p>

          <p>
            Your final report is generated and saved after all 5 answers
            are evaluated.
          </p>
        </footer>
      </div>
    </main>
  );
}

export default function QuestionPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 px-4 text-slate-700">
          <div className="text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-violet-100 border-t-violet-600" />
            <p className="text-sm font-medium text-slate-500">
              Loading interview questions...
            </p>
          </div>
        </main>
      }
    >
      <QuestionPageContent />
    </Suspense>
  );
}
