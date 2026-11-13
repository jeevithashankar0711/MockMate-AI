"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (loading) return;

    setError("");

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName || !cleanEmail) {
      setError("Full name and email are required.");
      return;
    }

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match!");
      return;
    }

    setLoading(true);

    try {
      const apiBaseUrl =
        process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") ||
        "http://localhost:8080";

      const response = await fetch(`${apiBaseUrl}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "omit",
        body: JSON.stringify({
          fullName: cleanName,
          email: cleanEmail,
          password,
        }),
      });

      const responseText = await response.text();

      let data: {
        error?: string;
        message?: string;
      } = {};

      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch {
        // Backend response is not JSON.
      }

      if (!response.ok) {
        if (response.status === 409) {
          setError("Email already registered. Please login instead.");
        } else {
          setError(
            data.error ||
              data.message ||
              `Registration failed (HTTP ${response.status}). Check backend terminal.`
          );
        }
        return;
      }

      router.push("/login");
    } catch (err) {
      console.error("Registration request failed:", err);

      setError(
        "Cannot connect to the backend. Check that the Go server is running on port 8080 and CORS is configured."
      );
    } finally {
      setLoading(false);
    }
  };

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

            <span className="text-left">
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
            Create Account
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
            Create your account and start practicing.
          </p>
        </header>

        {/* Registration form */}
        <form
          onSubmit={handleRegister}
          className="rounded-3xl border border-violet-100 bg-white/95 p-6 shadow-xl shadow-violet-900/5 backdrop-blur-sm sm:p-8"
        >
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900">
              Get started for free
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Fill in your details to create your account.
            </p>
          </div>

          <label
            htmlFor="name"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Full Name
          </label>

          <input
            id="name"
            name="name"
            type="text"
            placeholder="Enter your full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
            disabled={loading}
            className="mb-5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-violet-300 focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-100 disabled:cursor-not-allowed disabled:opacity-60"
          />

          <label
            htmlFor="email"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Email Address
          </label>

          <input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
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
            placeholder="Create a password (minimum 8 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            disabled={loading}
            className="mb-5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-violet-300 focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-100 disabled:cursor-not-allowed disabled:opacity-60"
          />

          <label
            htmlFor="confirmPassword"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Confirm Password
          </label>

          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            placeholder="Confirm your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
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
                Creating Account...
              </>
            ) : (
              <>
                Create Account
                <span aria-hidden="true">→</span>
              </>
            )}
          </button>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-violet-100" />
            <span className="text-xs font-medium text-slate-400">
              ALREADY A MEMBER?
            </span>
            <div className="h-px flex-1 bg-violet-100" />
          </div>

          <p className="text-center text-sm text-slate-600">
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => router.push("/login")}
              disabled={loading}
              className="font-bold text-violet-700 underline-offset-4 transition hover:text-fuchsia-700 hover:underline focus:outline-none focus:ring-2 focus:ring-violet-300 disabled:opacity-50"
            >
              Login
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