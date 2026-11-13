"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type User = {
  id: number;
  fullName: string;
  email: string;
};

type LoginResponse = {
  message?: string;
  error?: string;
  user?: User;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") ||
  "http://localhost:8080";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (loading) return;

    setError("");

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      setError("Email and password are required.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "omit",
        body: JSON.stringify({
          email: normalizedEmail,
          password,
        }),
      });

      const data: LoginResponse = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        setError(
          data.error ||
            data.message ||
            `Login failed (HTTP ${response.status}).`
        );
        return;
      }

      const user = data.user;

      if (
        !user ||
        !Number.isInteger(user.id) ||
        user.id <= 0 ||
        typeof user.email !== "string" ||
        !user.email.trim()
      ) {
        setError(
          "Invalid login response. Please check the Go backend /login response."
        );
        return;
      }

      const userToStore: User = {
        id: user.id,
        fullName: user.fullName ?? "",
        email: user.email,
      };

      try {
        sessionStorage.setItem(
          "mockmateUser",
          JSON.stringify(userToStore)
        );
      } catch {
        setError(
          "Browser storage is unavailable. Please enable site storage and try again."
        );
        return;
      }

      router.replace("/dashboard");
    } catch (err) {
      console.error("Login request failed:", err);

      setError(
        "Cannot connect to the backend. Check that the Go server is running on port 8080 and CORS is configured."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 px-5 py-10 text-slate-800">
      {/* Background decorations */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-violet-300/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-fuchsia-300/30 blur-3xl" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-200/20 blur-3xl" />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo and heading */}
        <header className="mb-8 text-center">
          <button
            type="button"
            onClick={() => router.push("/")}
            aria-label="Go to MockMate AI home page"
            className="mx-auto mb-6 inline-flex items-center gap-3 rounded-2xl text-left outline-none focus-visible:ring-4 focus-visible:ring-violet-200"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-600/25">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-8 w-8"
                aria-hidden="true"
              >
                <path d="M9 3.5a3.5 3.5 0 0 0-3 5.3A3.5 3.5 0 0 0 7 15.5a3.5 3.5 0 0 0 5 3V6.5A3 3 0 0 0 9 3.5Z" />
                <path d="M15 3.5a3.5 3.5 0 0 1 3 5.3 3.5 3.5 0 0 1-1 6.7 3.5 3.5 0 0 1-5 3V6.5a3 3 0 0 1 3-3Z" />
                <path d="M8 9h2M14 9h2M8 14h2M14 14h2" />
              </svg>
            </span>

            <span>
              <span className="block text-2xl font-extrabold tracking-tight text-slate-900">
                MockMate{" "}
                <span className="bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                  AI
                </span>
              </span>
              <span className="block text-xs font-medium tracking-wide text-slate-500">
                YOUR AI INTERVIEW COACH
              </span>
            </span>
          </button>

          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Welcome Back!
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
            Continue your journey towards your dream job.
          </p>
        </header>

        {/* Login form */}
        <form
          onSubmit={handleLogin}
          className="rounded-3xl border border-violet-100 bg-white/95 p-6 shadow-xl shadow-violet-900/5 backdrop-blur-sm sm:p-8"
        >
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900">
              Login to your account
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Enter your details to get started.
            </p>
          </div>

          <label
            htmlFor="email"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Email address
          </label>

          <input
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
            disabled={loading}
            className="mb-5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-violet-300 focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-100 disabled:cursor-not-allowed disabled:opacity-60"
          />

          <label
            htmlFor="password"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Password
          </label>

          <input
            id="password"
            name="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            autoComplete="current-password"
            required
            disabled={loading}
            className="mb-5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-violet-300 focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-100 disabled:cursor-not-allowed disabled:opacity-60"
          />

          {error && (
            <p
              role="alert"
              aria-live="polite"
              className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-5 text-red-700"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-3.5 font-semibold text-white shadow-lg shadow-violet-600/20 transition hover:from-violet-700 hover:to-fuchsia-700 focus:outline-none focus:ring-4 focus:ring-violet-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <svg
                  className="h-5 w-5 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="9"
                    stroke="currentColor"
                    strokeWidth="3"
                    opacity=".25"
                  />
                  <path
                    d="M21 12a9 9 0 0 0-9-9"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
                Logging in...
              </>
            ) : (
              <>
                Login
                <span aria-hidden="true">→</span>
              </>
            )}
          </button>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-violet-100" />
            <span className="text-xs font-medium text-slate-400">
              NEW TO MOCKMATE?
            </span>
            <div className="h-px flex-1 bg-violet-100" />
          </div>

          <p className="text-center text-sm text-slate-600">
            Don&apos;t have an account?{" "}
            <button
              type="button"
              onClick={() => router.push("/register")}
              disabled={loading}
              className="font-bold text-violet-700 underline-offset-4 transition hover:text-fuchsia-700 hover:underline focus:outline-none focus:ring-2 focus:ring-violet-300 disabled:opacity-50"
            >
              Create Account
            </button>
          </p>
        </form>

        <footer className="mt-6 text-center text-xs leading-5 text-slate-500">
          Practise smarter. Build confidence. Take the next step.
        </footer>
      </div>
    </main>
  );
}