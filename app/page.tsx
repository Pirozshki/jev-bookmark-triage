"use client";

import { useState, useEffect } from "react";
import type { TriageResult } from "@/lib/types";
import bookmarksData from "@/fixtures/bookmarks.json";

function BookmarkCard({ result }: { result: TriageResult }) {
  const { bookmark, answers, rank } = result;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-900 dark:text-gray-100 mb-1">{bookmark.text}</p>
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span>{bookmark.author}</span>
            <span>•</span>
            <a
              href={bookmark.url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-600 dark:hover:text-blue-400 truncate"
            >
              {bookmark.url}
            </a>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {rank.toFixed(1)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">rank</div>
        </div>
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-gray-600 dark:text-gray-300 font-medium">Category:</span>
          <div className="flex items-center gap-2">
            <span className="text-gray-900 dark:text-gray-100">{answers.category.choice}</span>
            <span className="text-gray-500 dark:text-gray-400">
              ({(answers.category.probabilities[answers.category.choice] * 100).toFixed(0)}%)
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-600 dark:text-gray-300 font-medium">Demoability:</span>
          <div className="flex items-center gap-2">
            <span className="text-gray-900 dark:text-gray-100">
              {answers.demoability.score.toFixed(1)}/3
            </span>
            <span className="text-gray-500 dark:text-gray-400">
              (conf: {(answers.demoability.confidence * 100).toFixed(0)}%)
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-600 dark:text-gray-300 font-medium">Primary source:</span>
          <span className="text-gray-900 dark:text-gray-100">
            {(answers.has_primary_source.noul * 100).toFixed(0)}%
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-600 dark:text-gray-300 font-medium">Stack fit:</span>
          <div className="flex items-center gap-2">
            <span className="text-gray-900 dark:text-gray-100">{answers.stack_fit.choice}</span>
            <span className="text-gray-500 dark:text-gray-400">
              ({(answers.stack_fit.probabilities[answers.stack_fit.choice] * 100).toFixed(0)}%)
            </span>
          </div>
        </div>

        <div className="pt-1 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-gray-600 dark:text-gray-300 font-medium">Avg confidence:</span>
            <span className="text-gray-900 dark:text-gray-100">
              {(
                ((answers.category.confidence +
                  answers.demoability.confidence +
                  answers.stack_fit.confidence) /
                  3) *
                100
              ).toFixed(0)}
              %
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [results, setResults] = useState<TriageResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"mock" | "real">("mock");

  useEffect(() => {
    async function triage() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/triage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookmarks: bookmarksData }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        setResults(data.results);

        const hasKey = typeof window !== "undefined" && document.cookie.includes("has_typesafe_key");
        setMode(hasKey ? "real" : "mock");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    triage();
  }, []);

  const topPicks = results.filter((r) => r.bucket === "top-picks");
  const needsReview = results.filter((r) => r.bucket === "needs-review");
  const skip = results.filter((r) => r.bucket === "skip");

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Bookmark Triage
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Powered by TypeSafe AI&apos;s Jev model
            {mode === "mock" && " (Mock Mode - no API key detected)"}
          </p>
          {loading && (
            <div className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <div className="animate-spin h-4 w-4 border-2 border-gray-600 dark:border-gray-400 border-t-transparent rounded-full"></div>
              <span>Triaging bookmarks...</span>
            </div>
          )}
          {error && <div className="text-red-600 dark:text-red-400">Error: {error}</div>}
        </div>

        {!loading && !error && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div>
              <div className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 px-4 py-3 mb-4 rounded">
                <h2 className="text-lg font-semibold text-green-900 dark:text-green-100">
                  Top Picks
                </h2>
                <p className="text-sm text-green-700 dark:text-green-300">
                  {topPicks.length} bookmark{topPicks.length !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="space-y-3">
                {topPicks.map((result) => (
                  <BookmarkCard key={result.bookmark.id} result={result} />
                ))}
              </div>
            </div>

            <div>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 px-4 py-3 mb-4 rounded">
                <h2 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100">
                  Needs Human Look
                </h2>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  {needsReview.length} bookmark{needsReview.length !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="space-y-3">
                {needsReview.map((result) => (
                  <BookmarkCard key={result.bookmark.id} result={result} />
                ))}
              </div>
            </div>

            <div>
              <div className="bg-gray-50 dark:bg-gray-800 border-l-4 border-gray-400 dark:border-gray-600 px-4 py-3 mb-4 rounded">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Skip</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {skip.length} bookmark{skip.length !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="space-y-3">
                {skip.map((result) => (
                  <BookmarkCard key={result.bookmark.id} result={result} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
