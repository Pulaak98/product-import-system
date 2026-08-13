import {
  useEffect,
  useState,
} from "react";

import {
  getImportJobs,
} from "../services/import.service";

import type {
  ImportJobProgress,
} from "../types/import";

import ImportProgressPanel from "./ImportProgressPanel";

interface ImportJobsPanelProps {
  onClose: () => void;
}

function ImportJobsPanel({
  onClose,
}: ImportJobsPanelProps) {
  const [
    jobs,
    setJobs,
  ] =
    useState<ImportJobProgress[]>(
      [],
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    selectedJobId,
    setSelectedJobId,
  ] =
    useState<number | null>(
      null,
    );

  async function loadJobs() {
    try {
      setLoading(true);
      setError("");

      const result =
        await getImportJobs();

      setJobs(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load import jobs.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadJobs();

    const interval =
      window.setInterval(
        () => {
          void loadJobs();
        },
        5000,
      );

    return () => {
      window.clearInterval(
        interval,
      );
    };
  }, []);

  function getStatusLabel(
    status: string,
  ) {
    switch (status) {
      case "pending":
        return "Waiting to start";

      case "processing":
        return "Processing";

      case "completed":
        return "Completed";

      case "completed_with_errors":
        return "Completed with errors";

      case "failed":
        return "Failed";

      default:
        return status;
    }
  }

  function getStatusClass(
    status: string,
  ) {
    switch (status) {
      case "completed":
        return "border-green-200 bg-green-50 text-green-700";

      case "completed_with_errors":
        return "border-orange-200 bg-orange-50 text-orange-700";

      case "failed":
        return "border-red-200 bg-red-50 text-red-700";

      case "processing":
        return "border-blue-200 bg-blue-50 text-blue-700";

      case "pending":
        return "border-amber-200 bg-amber-50 text-amber-700";

      default:
        return "border-neutral-200 bg-neutral-50 text-neutral-700";
    }
  }

  function getProgressBarClass(
    status: string,
  ) {
    switch (status) {
      case "completed":
        return "bg-gradient-to-r from-green-500 to-emerald-400";

      case "completed_with_errors":
        return "bg-gradient-to-r from-orange-500 to-amber-400";

      case "failed":
        return "bg-gradient-to-r from-red-500 to-rose-400";

      case "processing":
        return "bg-gradient-to-r from-blue-500 to-cyan-400";

      case "pending":
        return "bg-gradient-to-r from-amber-400 to-yellow-300";

      default:
        return "bg-gradient-to-r from-neutral-400 to-neutral-300";
    }
  }

  function getProgressBackgroundClass(
    status: string,
  ) {
    switch (status) {
      case "completed":
        return "bg-green-100";

      case "completed_with_errors":
        return "bg-orange-100";

      case "failed":
        return "bg-red-100";

      case "processing":
        return "bg-blue-100";

      case "pending":
        return "bg-amber-100";

      default:
        return "bg-neutral-100";
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/55 p-4 backdrop-blur-sm">
        <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-3xl border border-white/60 bg-white shadow-2xl">
          {/* Header */}
          <div className="border-b border-neutral-200 bg-gradient-to-r from-indigo-50 via-white to-cyan-50 px-6 py-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-white shadow-lg shadow-indigo-200">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      className="h-5 w-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14"
                      />
                    </svg>
                  </div>

                  <div>
                    <h2 className="text-xl font-bold text-neutral-900">
                      Import Jobs
                    </h2>

                    <p className="mt-1 text-sm text-neutral-500">
                      Monitor imports running in the background.
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="rounded-xl p-2.5 text-neutral-400 transition hover:bg-white hover:text-neutral-700 hover:shadow-sm"
              >
                <span className="text-xl leading-none">
                  ×
                </span>
              </button>
            </div>

            {!loading && jobs.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                <div className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-600 shadow-sm">
                  {jobs.length}{" "}
                  {jobs.length === 1
                    ? "import job"
                    : "import jobs"}
                </div>

                <div className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700">
                  Auto-refreshing
                </div>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="max-h-[70vh] overflow-y-auto bg-neutral-50/70 p-6">
            {loading && (
              <div className="rounded-2xl border border-neutral-200 bg-white py-14 text-center shadow-sm">
                <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-4 border-neutral-200 border-t-indigo-500" />

                <p className="text-sm font-medium text-neutral-600">
                  Loading import jobs...
                </p>
              </div>
            )}

            {error && (
              <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700 shadow-sm">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100 font-bold text-red-600">
                  !
                </div>

                <div>
                  <p className="font-semibold">
                    Unable to load import jobs
                  </p>

                  <p className="mt-0.5 text-red-600">
                    {error}
                  </p>
                </div>
              </div>
            )}

            {!loading &&
              jobs.length === 0 && (
                <div className="rounded-2xl border border-dashed border-neutral-300 bg-white px-6 py-14 text-center shadow-sm">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      className="h-7 w-7"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M7 3h8l4 4v14H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"
                      />

                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 3v5h4"
                      />
                    </svg>
                  </div>

                  <p className="mt-4 font-semibold text-neutral-800">
                    No import jobs yet
                  </p>

                  <p className="mt-1 text-sm text-neutral-500">
                    Import jobs will appear here once you start an import.
                  </p>
                </div>
              )}

            {!loading &&
              jobs.length > 0 && (
                <div className="space-y-4">
                  {jobs.map((job) => (
                    <div
                      key={job.jobId}
                      className="group rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg"
                    >
                      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0 flex-1">
                          {/* Job title */}
                          <div className="flex flex-wrap items-center gap-2.5">
                            <div className="flex min-w-0 items-center gap-2">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-100 to-cyan-100 text-indigo-600">
                                <svg
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.7"
                                  className="h-4.5 w-4.5"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M7 3h8l4 4v14H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"
                                  />

                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M15 3v5h4"
                                  />
                                </svg>
                              </div>

                              <p className="truncate font-semibold text-neutral-900">
                                {job.fileName}
                              </p>
                            </div>

                            <span className="rounded-md bg-neutral-100 px-2 py-1 text-[11px] font-medium text-neutral-500">
                              #{job.jobId}
                            </span>

                            <span
                              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                                job.status,
                              )}`}
                            >
                              {getStatusLabel(
                                job.status,
                              )}
                            </span>
                          </div>

                          {/* Progress */}
                          <div className="mt-5">
                            <div className="mb-2 flex items-center justify-between text-xs">
                              <span className="font-medium text-neutral-500">
                                Import progress
                              </span>

                              <span className="font-bold text-neutral-800">
                                {job.progressPercentage}%
                              </span>
                            </div>

                            <div
                              className={`h-2.5 overflow-hidden rounded-full ${getProgressBackgroundClass(
                                job.status,
                              )}`}
                            >
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${getProgressBarClass(
                                  job.status,
                                )}`}
                                style={{
                                  width: `${Math.min(
                                    Math.max(
                                      job.progressPercentage,
                                      0,
                                    ),
                                    100,
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>

                          {/* Statistics */}
                          <div className="mt-4 grid grid-cols-3 gap-2 sm:max-w-xl">
                            <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5">
                              <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">
                                Processed
                              </p>

                              <p className="mt-1 text-sm font-bold text-neutral-800">
                                {job.processedRecords}
                                <span className="ml-1 font-normal text-neutral-400">
                                  / {job.totalRecords}
                                </span>
                              </p>
                            </div>

                            <div className="rounded-xl border border-green-100 bg-green-50 px-3 py-2.5">
                              <p className="text-[11px] font-medium uppercase tracking-wide text-green-600">
                                Successful
                              </p>

                              <p className="mt-1 text-sm font-bold text-green-700">
                                {job.successfulRecords}
                              </p>
                            </div>

                            <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2.5">
                              <p className="text-[11px] font-medium uppercase tracking-wide text-red-600">
                                Failed
                              </p>

                              <p className="mt-1 text-sm font-bold text-red-700">
                                {job.failedRecords}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Action */}
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedJobId(
                              job.jobId,
                            )
                          }
                          className="group/button flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-200 transition hover:from-indigo-600 hover:to-cyan-600 hover:shadow-lg hover:shadow-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            className="h-4 w-4 transition-transform group-hover/button:scale-110"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"
                            />

                            <circle
                              cx="12"
                              cy="12"
                              r="2.5"
                            />
                          </svg>

                          View Progress
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </div>

          {/* Footer */}
          <div className="flex justify-end border-t border-neutral-200 bg-white px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-neutral-300 bg-white px-5 py-2.5 text-sm font-semibold text-neutral-700 transition hover:border-neutral-400 hover:bg-neutral-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {selectedJobId !== null && (
        <ImportProgressPanel
          jobId={selectedJobId}
          onClose={() =>
            setSelectedJobId(null)
          }
        />
      )}
    </>
  );
}

export default ImportJobsPanel;