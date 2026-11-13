"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type ResumeDetails = {
  fileName: string;
  wordCount: number;
  skills: string[];
  education: string[];
  experience: string[];
  projects: string[];
  text: string;
};

type ResumeResponse = Partial<ResumeDetails> & {
  error?: string;
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".txt"];

function getApiUrl(): string {
  return (
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"
  ).replace(/\/+$/, "");
}

function cleanList(items: unknown): string[] {
  if (!Array.isArray(items)) return [];

  return items
    .filter(
      (item): item is string =>
        typeof item === "string" && item.trim().length > 0
    )
    .map((item) => item.trim());
}

function DetailsCard({
  title,
  items,
  emptyMessage,
}: {
  title: string;
  items: string[];
  emptyMessage: string;
}) {
  return (
    <section className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm transition hover:shadow-md hover:shadow-violet-900/5">
      <h3 className="text-lg font-semibold text-slate-900">
        {title}
      </h3>

      {items.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {items.map((item, index) => (
            <li
              key={`${title}-${index}`}
              className="flex items-start gap-2 text-sm leading-6 text-slate-700"
            >
              <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600" />
              <span className="min-w-0 break-words">{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm leading-6 text-slate-500">
          {emptyMessage}
        </p>
      )}
    </section>
  );
}

export default function ResumePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ResumeDetails | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showFullText, setShowFullText] = useState(false);

  async function handleExtractResume() {
    setError("");
    setResult(null);
    setShowFullText(false);

    if (!file) {
      setError("Please select your resume first.");
      return;
    }

    const validExtension = ALLOWED_EXTENSIONS.some((extension) =>
      file.name.toLowerCase().endsWith(extension)
    );

    if (!validExtension) {
      setError("Please upload a PDF, DOCX, or TXT file.");
      return;
    }

    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      setError("Your file must be non-empty and no larger than 5 MB.");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("resume", file);

      const response = await fetch(
        `${getApiUrl()}/resume-extract`,
        {
          method: "POST",
          body: formData,
        }
      );

      const responseText = await response.text();

      let data: ResumeResponse;

      try {
        data = JSON.parse(responseText) as ResumeResponse;
      } catch {
        throw new Error(
          "The server returned an invalid response. Check that your Go backend is running."
        );
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
            `Resume extraction failed (HTTP ${response.status}).`
        );
      }

      if (
        typeof data.wordCount !== "number" ||
        !Number.isFinite(data.wordCount) ||
        typeof data.text !== "string"
      ) {
        throw new Error(
          "The backend response is missing resume text or word count. Check your /resume-extract handler."
        );
      }

      const extractedText = data.text.trim();

      if (!extractedText) {
        throw new Error(
          "No readable text was found. If this is a scanned PDF, OCR may be required."
        );
      }

      setResult({
        fileName:
          typeof data.fileName === "string"
            ? data.fileName
            : file.name,
        wordCount: data.wordCount,
        skills: cleanList(data.skills),
        education: cleanList(data.education),
        experience: cleanList(data.experience),
        projects: cleanList(data.projects),
        text: extractedText,
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

  function handlePrepareInterview() {
    if (!result) return;

    try {
      sessionStorage.setItem(
        "mockmateResumeContext",
        JSON.stringify({
          fileName: result.fileName,
          skills: result.skills,
          education: result.education,
          experience: result.experience,
          projects: result.projects,
          text: result.text,
        })
      );

      router.push("/interview");
    } catch {
      setError(
        "Could not save the resume details in this browser. Please try again."
      );
    }
  }

  function resetResume() {
    setFile(null);
    setResult(null);
    setError("");
    setShowFullText(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 px-4 py-8 text-slate-900 sm:px-8">
      {/* Background decorations */}
      <div className="pointer-events-none absolute -left-32 top-20 h-80 w-80 rounded-full bg-violet-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 bottom-10 h-80 w-80 rounded-full bg-fuchsia-200/30 blur-3xl" />

      <div className="relative z-10 mx-auto max-w-6xl">
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="mb-6 rounded-xl border border-violet-200 bg-white px-4 py-2.5 text-sm font-semibold text-violet-700 shadow-sm transition hover:border-violet-300 hover:bg-violet-50 focus:outline-none focus:ring-4 focus:ring-violet-100"
        >
          ← Back to Dashboard
        </button>

        <header className="rounded-3xl border border-violet-100 bg-gradient-to-r from-white via-violet-50/80 to-fuchsia-50/80 p-6 shadow-sm sm:p-8">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-violet-700">
            MockMate AI
          </p>

          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Resume{" "}
            <span className="bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
              Analyzer
            </span>
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            Upload your resume to extract its text, identify skills,
            and organize your education, experience, and projects.
            You can then use the information to prepare for a mock
            interview.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            {[
              "Resume Text",
              "Skills",
              "Education",
              "Experience",
              "Projects",
            ].map((label) => (
              <span
                key={label}
                className="rounded-full border border-violet-100 bg-white px-3 py-1.5 text-xs font-medium text-violet-700 shadow-sm"
              >
                {label}
              </span>
            ))}
          </div>
        </header>

        <section className="mt-7 grid items-start gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          {/* Upload panel */}
          <div className="rounded-3xl border border-violet-100 bg-white p-6 shadow-lg shadow-violet-900/5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-fuchsia-100 text-2xl">
              📄
            </div>

            <h2 className="mt-4 text-xl font-bold text-slate-900">
              Upload your resume
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Supported formats: PDF, DOCX, and TXT. Maximum file
              size: 5 MB.
            </p>

            <label
              htmlFor="resume-file"
              className="mt-5 block cursor-pointer rounded-2xl border-2 border-dashed border-violet-200 bg-gradient-to-br from-violet-50/80 to-fuchsia-50/60 p-6 text-center transition hover:border-violet-400 hover:from-violet-50 hover:to-fuchsia-50"
            >
              <span
                className="text-3xl"
                aria-hidden="true"
              >
                ⬆️
              </span>
              <span className="mt-3 block font-semibold text-violet-800">
                Choose a resume file
              </span>
              <span className="mt-1 block text-xs text-slate-500">
                Select a file from your device
              </span>
            </label>

            <input
              ref={fileInputRef}
              id="resume-file"
              name="resume"
              type="file"
              accept=".pdf,.docx,.txt"
              disabled={loading}
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setResult(null);
                setError("");
                setShowFullText(false);
              }}
              className="sr-only"
            />

            {file && (
              <div className="mt-4 rounded-xl border border-violet-100 bg-violet-50/70 p-4">
                <p className="break-all text-sm font-semibold text-violet-900">
                  {file.name}
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
            )}

            {error && (
              <div
                role="alert"
                aria-live="polite"
                className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-700"
              >
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleExtractResume}
              disabled={loading}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-3 font-semibold text-white shadow-lg shadow-violet-600/20 transition hover:from-violet-700 hover:to-fuchsia-700 focus:outline-none focus:ring-4 focus:ring-violet-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Analyzing Resume...
                </>
              ) : (
                "Analyze Resume →"
              )}
            </button>

            <p className="mt-3 text-xs leading-5 text-slate-500">
              Your selected file is sent to your configured backend
              for processing. Only upload a document you are
              comfortable sharing with that server.
            </p>

            <div className="mt-6 border-t border-violet-100 pt-5">
              <h3 className="font-semibold text-slate-900">
                What will be extracted?
              </h3>

              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                {[
                  "Readable resume text",
                  "Potential skills and technologies",
                  "Education details",
                  "Experience and project sections",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="font-bold text-violet-600">
                      ✓
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Results panel */}
          <div className="min-w-0 rounded-3xl border border-violet-100 bg-white p-6 shadow-lg shadow-violet-900/5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-violet-700">
                  Analysis Results
                </p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  Your resume details
                </h2>
              </div>

              {result && (
                <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                  Extraction complete
                </span>
              )}
            </div>

            {!result && !loading && (
              <div className="mt-5 flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-violet-200 bg-gradient-to-br from-violet-50/60 to-fuchsia-50/60 p-6 text-center">
                <span className="text-5xl" aria-hidden="true">
                  📝
                </span>
                <h3 className="mt-4 font-semibold text-slate-900">
                  Your results will appear here
                </h3>
                <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                  Select your resume and click Analyze Resume to view
                  the extracted information.
                </p>
              </div>
            )}

            {loading && (
              <div
                role="status"
                className="flex min-h-72 flex-col items-center justify-center text-center"
              >
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-100 border-t-violet-600" />
                <p className="mt-4 font-semibold text-slate-900">
                  Reading your resume...
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Extracting text and organizing the available details.
                </p>
              </div>
            )}

            {result && (
              <div className="mt-5 space-y-5">
                <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-fuchsia-50/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">
                    Uploaded file
                  </p>
                  <p className="mt-1 break-all font-semibold text-slate-900">
                    {result.fileName}
                  </p>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-violet-100 bg-white p-3">
                      <p className="text-xs text-slate-500">
                        Word count
                      </p>
                      <p className="mt-1 text-2xl font-extrabold text-violet-700">
                        {result.wordCount.toLocaleString()}
                      </p>
                    </div>

                    <div className="rounded-xl border border-fuchsia-100 bg-white p-3">
                      <p className="text-xs text-slate-500">
                        Skills detected
                      </p>
                      <p className="mt-1 text-2xl font-extrabold text-fuchsia-700">
                        {result.skills.length}
                      </p>
                    </div>
                  </div>
                </div>

                <DetailsCard
                  title="Skills & Technologies"
                  items={result.skills}
                  emptyMessage="No skills were detected automatically. Check the extracted text below."
                />

                <DetailsCard
                  title="Education"
                  items={result.education}
                  emptyMessage="No education details were identified automatically."
                />

                <DetailsCard
                  title="Work Experience"
                  items={result.experience}
                  emptyMessage="No experience details were identified automatically."
                />

                <DetailsCard
                  title="Projects"
                  items={result.projects}
                  emptyMessage="No project details were identified automatically."
                />

                <section className="rounded-2xl border border-violet-100 bg-white p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold text-slate-900">
                      Extracted Resume Text
                    </h3>
                    <button
                      type="button"
                      onClick={() =>
                        setShowFullText((current) => !current)
                      }
                      className="rounded-lg border border-violet-200 px-3 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-50 focus:outline-none focus:ring-4 focus:ring-violet-100"
                    >
                      {showFullText ? "Show Less" : "View Full Text"}
                    </button>
                  </div>

                  <p className="mt-2 text-sm text-slate-500">
                    Use this to verify the extracted content. Automatic
                    section detection may not be perfect.
                  </p>

                  {showFullText && (
                    <pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-violet-100 bg-violet-50/50 p-4 font-sans text-sm leading-6 text-slate-700">
                      {result.text}
                    </pre>
                  )}
                </section>

                <button
                  type="button"
                  onClick={handlePrepareInterview}
                  className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-3 font-semibold text-white shadow-lg shadow-violet-600/20 transition hover:from-violet-700 hover:to-fuchsia-700 focus:outline-none focus:ring-4 focus:ring-violet-200"
                >
                  Prepare Mock Interview →
                </button>

                <button
                  type="button"
                  onClick={resetResume}
                  className="w-full rounded-xl border border-violet-200 bg-white px-5 py-3 font-semibold text-violet-700 transition hover:bg-violet-50 focus:outline-none focus:ring-4 focus:ring-violet-100"
                >
                  Upload Another Resume
                </button>

                <p className="text-xs leading-5 text-slate-500">
                  Extracted details are automated estimates. Review
                  them for accuracy. Preparing an interview saves
                  the resume context in this browser session; your
                  interview page must read that context to use it
                  when generating questions.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}