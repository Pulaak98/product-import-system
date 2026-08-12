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
        return "bg-green-100 text-green-700";

      case "completed_with_errors":
        return "bg-yellow-100 text-yellow-700";

      case "failed":
        return "bg-red-100 text-red-700";

      case "processing":
        return "bg-neutral-900 text-white";

      default:
        return "bg-neutral-100 text-neutral-700";
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-xl">
          <div className="flex items-start justify-between border-b border-neutral-200 px-6 py-5">
            <div>
              <h2 className="text-xl font-semibold text-neutral-900">
                Import Jobs
              </h2>

              <p className="mt-1 text-sm text-neutral-500">
                Monitor imports running in the background.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-2 text-xl text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
            >
              ×
            </button>
          </div>

          <div className="max-h-[70vh] overflow-y-auto p-6">
            {loading && (
              <div className="py-10 text-center text-sm text-neutral-500">
                Loading import jobs...
              </div>
            )}

            {error && (
              <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {!loading &&
              jobs.length === 0 && (
                <div className="rounded-xl border border-neutral-200 p-10 text-center text-sm text-neutral-500">
                  No import jobs found.
                </div>
              )}

            {!loading &&
              jobs.length > 0 && (
                <div className="space-y-3">
                  {jobs.map((job) => (
                    <div
                      key={job.jobId}
                      className="rounded-xl border border-neutral-200 p-5"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-neutral-900">
                              {job.fileName}
                            </p>

                            <span className="text-xs text-neutral-400">
                              #{job.jobId}
                            </span>

                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClass(
                                job.status,
                              )}`}
                            >
                              {getStatusLabel(
                                job.status,
                              )}
                            </span>
                          </div>

                          <div className="mt-3">
                            <div className="mb-1.5 flex justify-between text-xs text-neutral-500">
                              <span>
                                {job.processedRecords} /{" "}
                                {job.totalRecords} records
                              </span>

                              <span>
                                {job.progressPercentage}%
                              </span>
                            </div>

                            <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
                              <div
                                className="h-full rounded-full bg-neutral-900 transition-all duration-300"
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

                          <div className="mt-3 flex flex-wrap gap-4 text-xs text-neutral-500">
                            <span>
                              Successful:{" "}
                              <strong className="text-green-700">
                                {
                                  job.successfulRecords
                                }
                              </strong>
                            </span>

                            <span>
                              Failed:{" "}
                              <strong className="text-red-700">
                                {
                                  job.failedRecords
                                }
                              </strong>
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setSelectedJobId(
                              job.jobId,
                            )
                          }
                          className="shrink-0 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                        >
                          View Progress
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </div>

          <div className="flex justify-end border-t border-neutral-200 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-neutral-300 bg-white px-5 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
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