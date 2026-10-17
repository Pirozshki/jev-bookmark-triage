import type { Bookmark, JevAnswers, TriageResult, TriageConfig } from "./types";
import { DEFAULT_CONFIG } from "./config";

/**
 * Calculate a composite rank for a bookmark based on Jev's answers and configured weights.
 * This is a pure function that combines multiple signals into a single score.
 */
export function calculateRank(answers: JevAnswers, config: TriageConfig = DEFAULT_CONFIG): number {
  const categoryScore = config.weights.category[answers.category.choice];

  const normalizedDemoability = answers.demoability.score / 3;
  const demoabilityScore = normalizedDemoability * config.weights.demoability;

  const primarySourceScore = answers.has_primary_source.noul * config.weights.has_primary_source;

  const stackFitScore = config.weights.stack_fit[answers.stack_fit.choice];

  const totalRank = categoryScore + demoabilityScore + primarySourceScore + stackFitScore;

  return totalRank;
}

/**
 * Determine which bucket a triaged item belongs to based on confidence and rank.
 * Uses confidence-gated routing: low confidence items need human review.
 */
export function determineBucket(
  answers: JevAnswers,
  rank: number,
  config: TriageConfig = DEFAULT_CONFIG
): "top-picks" | "needs-review" | "skip" {
  const avgConfidence =
    (answers.category.confidence + answers.demoability.confidence + answers.stack_fit.confidence) / 3;

  if (avgConfidence < config.confidenceThreshold) {
    return "needs-review";
  }

  if (rank >= 15) {
    return "top-picks";
  } else if (rank >= 0) {
    return "needs-review";
  } else {
    return "skip";
  }
}

/**
 * Triage a set of bookmarks: calculate ranks and assign to buckets.
 */
export function triageBookmarks(
  bookmarks: Bookmark[],
  allAnswers: Map<string, JevAnswers>,
  config: TriageConfig = DEFAULT_CONFIG
): TriageResult[] {
  const results: TriageResult[] = [];

  for (const bookmark of bookmarks) {
    const answers = allAnswers.get(bookmark.id);
    if (!answers) continue;

    const rank = calculateRank(answers, config);
    const bucket = determineBucket(answers, rank, config);

    results.push({
      bookmark,
      answers,
      rank,
      bucket,
    });
  }

  results.sort((a, b) => b.rank - a.rank);

  return results;
}
