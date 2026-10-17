import { describe, it, expect } from "vitest";
import { calculateRank, determineBucket, triageBookmarks } from "@/lib/triage";
import type { JevAnswers, Bookmark, TriageConfig } from "@/lib/types";

describe("calculateRank", () => {
  it("should calculate high rank for demoable-new-tech with high demoability", () => {
    const answers: JevAnswers = {
      category: {
        choice: "demoable-new-tech",
        probabilities: {
          "demoable-new-tech": 0.9,
          "how-to/opinion": 0.05,
          "hype/engagement-bait": 0.03,
          "off-topic": 0.02,
        },
        confidence: 0.9,
      },
      demoability: {
        score: 3,
        probabilities: { 0: 0.05, 1: 0.05, 2: 0.1, 3: 0.8 },
        confidence: 0.8,
      },
      has_primary_source: {
        noul: 0.95,
      },
      stack_fit: {
        choice: "nextjs-react",
        probabilities: {
          "nextjs-react": 0.8,
          "supabase/postgres": 0.1,
          "vercel/deploy": 0.05,
          "ai-agents/automation": 0.03,
          "none": 0.02,
        },
        confidence: 0.8,
      },
    };

    const rank = calculateRank(answers);
    expect(rank).toBeGreaterThan(20);
  });

  it("should calculate negative rank for hype/engagement-bait", () => {
    const answers: JevAnswers = {
      category: {
        choice: "hype/engagement-bait",
        probabilities: {
          "demoable-new-tech": 0.05,
          "how-to/opinion": 0.05,
          "hype/engagement-bait": 0.85,
          "off-topic": 0.05,
        },
        confidence: 0.85,
      },
      demoability: {
        score: 0,
        probabilities: { 0: 0.9, 1: 0.05, 2: 0.03, 3: 0.02 },
        confidence: 0.9,
      },
      has_primary_source: {
        noul: 0.1,
      },
      stack_fit: {
        choice: "none",
        probabilities: {
          "nextjs-react": 0.05,
          "supabase/postgres": 0.05,
          "vercel/deploy": 0.05,
          "ai-agents/automation": 0.05,
          "none": 0.8,
        },
        confidence: 0.8,
      },
    };

    const rank = calculateRank(answers);
    expect(rank).toBeLessThan(0);
  });

  it("should respect custom weights", () => {
    const answers: JevAnswers = {
      category: {
        choice: "demoable-new-tech",
        probabilities: {
          "demoable-new-tech": 0.9,
          "how-to/opinion": 0.05,
          "hype/engagement-bait": 0.03,
          "off-topic": 0.02,
        },
        confidence: 0.9,
      },
      demoability: {
        score: 2,
        probabilities: { 0: 0.05, 1: 0.1, 2: 0.7, 3: 0.15 },
        confidence: 0.7,
      },
      has_primary_source: {
        noul: 0.8,
      },
      stack_fit: {
        choice: "nextjs-react",
        probabilities: {
          "nextjs-react": 0.7,
          "supabase/postgres": 0.1,
          "vercel/deploy": 0.1,
          "ai-agents/automation": 0.05,
          "none": 0.05,
        },
        confidence: 0.7,
      },
    };

    const defaultRank = calculateRank(answers);

    const customConfig: TriageConfig = {
      weights: {
        category: {
          "demoable-new-tech": 100,
          "how-to/opinion": 0,
          "hype/engagement-bait": 0,
          "off-topic": 0,
        },
        demoability: 0,
        has_primary_source: 0,
        stack_fit: {
          "nextjs-react": 0,
          "supabase/postgres": 0,
          "vercel/deploy": 0,
          "ai-agents/automation": 0,
          "none": 0,
        },
      },
      confidenceThreshold: 0.6,
      rankCutoffs: {
        topPicks: 15,
        skip: 0,
      },
    };

    const customRank = calculateRank(answers, customConfig);
    expect(customRank).toBeGreaterThan(defaultRank);
    expect(customRank).toBe(100);
  });
});

describe("determineBucket", () => {
  const highConfidenceAnswers: JevAnswers = {
    category: {
      choice: "demoable-new-tech",
      probabilities: {
        "demoable-new-tech": 0.9,
        "how-to/opinion": 0.05,
        "hype/engagement-bait": 0.03,
        "off-topic": 0.02,
      },
      confidence: 0.9,
    },
    demoability: {
      score: 2.5,
      probabilities: { 0: 0.05, 1: 0.1, 2: 0.3, 3: 0.55 },
      confidence: 0.8,
    },
    has_primary_source: {
      noul: 0.9,
    },
    stack_fit: {
      choice: "nextjs-react",
      probabilities: {
        "nextjs-react": 0.85,
        "supabase/postgres": 0.05,
        "vercel/deploy": 0.05,
        "ai-agents/automation": 0.03,
        "none": 0.02,
      },
      confidence: 0.85,
    },
  };

  it("should put high-rank items in top-picks", () => {
    const bucket = determineBucket(highConfidenceAnswers, 25);
    expect(bucket).toBe("top-picks");
  });

  it("should put low-rank items in skip", () => {
    const bucket = determineBucket(highConfidenceAnswers, -10);
    expect(bucket).toBe("skip");
  });

  it("should put rank exactly at topPicks cutoff in top-picks", () => {
    const bucket = determineBucket(highConfidenceAnswers, 15);
    expect(bucket).toBe("top-picks");
  });

  it("should put rank exactly at skip cutoff in needs-review", () => {
    const bucket = determineBucket(highConfidenceAnswers, 0);
    expect(bucket).toBe("needs-review");
  });

  it("should put rank just below topPicks cutoff in needs-review", () => {
    const bucket = determineBucket(highConfidenceAnswers, 14.9);
    expect(bucket).toBe("needs-review");
  });

  it("should put rank just below skip cutoff in skip", () => {
    const bucket = determineBucket(highConfidenceAnswers, -0.1);
    expect(bucket).toBe("skip");
  });

  it("should put confidence exactly at threshold with high rank in top-picks", () => {
    const exactThresholdAnswers: JevAnswers = {
      ...highConfidenceAnswers,
      category: { ...highConfidenceAnswers.category, confidence: 0.6 },
      demoability: { ...highConfidenceAnswers.demoability, confidence: 0.6 },
      stack_fit: { ...highConfidenceAnswers.stack_fit, confidence: 0.6 },
    };
    const bucket = determineBucket(exactThresholdAnswers, 20);
    expect(bucket).toBe("top-picks");
  });

  it("should put confidence just below threshold in needs-review regardless of rank", () => {
    const belowThresholdAnswers: JevAnswers = {
      ...highConfidenceAnswers,
      category: { ...highConfidenceAnswers.category, confidence: 0.59 },
      demoability: { ...highConfidenceAnswers.demoability, confidence: 0.6 },
      stack_fit: { ...highConfidenceAnswers.stack_fit, confidence: 0.6 },
    };
    const bucket = determineBucket(belowThresholdAnswers, 25);
    expect(bucket).toBe("needs-review");
  });

  it("should put low-confidence items in needs-review regardless of rank", () => {
    const lowConfidenceAnswers: JevAnswers = {
      ...highConfidenceAnswers,
      category: { ...highConfidenceAnswers.category, confidence: 0.3 },
      demoability: { ...highConfidenceAnswers.demoability, confidence: 0.4 },
      stack_fit: { ...highConfidenceAnswers.stack_fit, confidence: 0.3 },
    };

    const bucket = determineBucket(lowConfidenceAnswers, 25);
    expect(bucket).toBe("needs-review");
  });

  it("should respect custom confidence threshold", () => {
    const customConfig: TriageConfig = {
      weights: {
        category: {
          "demoable-new-tech": 10,
          "how-to/opinion": 4,
          "hype/engagement-bait": -5,
          "off-topic": -10,
        },
        demoability: 8,
        has_primary_source: 5,
        stack_fit: {
          "nextjs-react": 6,
          "supabase/postgres": 5,
          "vercel/deploy": 4,
          "ai-agents/automation": 7,
          "none": 0,
        },
      },
      confidenceThreshold: 0.95,
      rankCutoffs: {
        topPicks: 15,
        skip: 0,
      },
    };

    const bucket = determineBucket(highConfidenceAnswers, 25, customConfig);
    expect(bucket).toBe("needs-review");
  });

  it("should respect custom rank cutoffs", () => {
    const customConfig: TriageConfig = {
      weights: {
        category: {
          "demoable-new-tech": 10,
          "how-to/opinion": 4,
          "hype/engagement-bait": -5,
          "off-topic": -10,
        },
        demoability: 8,
        has_primary_source: 5,
        stack_fit: {
          "nextjs-react": 6,
          "supabase/postgres": 5,
          "vercel/deploy": 4,
          "ai-agents/automation": 7,
          "none": 0,
        },
      },
      confidenceThreshold: 0.6,
      rankCutoffs: {
        topPicks: 30,
        skip: 10,
      },
    };

    expect(determineBucket(highConfidenceAnswers, 25, customConfig)).toBe("needs-review");
    expect(determineBucket(highConfidenceAnswers, 30, customConfig)).toBe("top-picks");
    expect(determineBucket(highConfidenceAnswers, 10, customConfig)).toBe("needs-review");
    expect(determineBucket(highConfidenceAnswers, 9.9, customConfig)).toBe("skip");
  });
});

describe("triageBookmarks", () => {
  it("should triage multiple bookmarks and sort by rank", () => {
    const bookmarks: Bookmark[] = [
      { id: "1", text: "Low value post", author: "@user1", url: "https://example.com/1" },
      { id: "2", text: "High value post", author: "@user2", url: "https://example.com/2" },
    ];

    const answersMap = new Map<string, JevAnswers>();

    answersMap.set("1", {
      category: {
        choice: "off-topic",
        probabilities: {
          "demoable-new-tech": 0.05,
          "how-to/opinion": 0.05,
          "hype/engagement-bait": 0.1,
          "off-topic": 0.8,
        },
        confidence: 0.8,
      },
      demoability: {
        score: 0,
        probabilities: { 0: 0.9, 1: 0.05, 2: 0.03, 3: 0.02 },
        confidence: 0.9,
      },
      has_primary_source: {
        noul: 0.1,
      },
      stack_fit: {
        choice: "none",
        probabilities: {
          "nextjs-react": 0.05,
          "supabase/postgres": 0.05,
          "vercel/deploy": 0.05,
          "ai-agents/automation": 0.05,
          "none": 0.8,
        },
        confidence: 0.8,
      },
    });

    answersMap.set("2", {
      category: {
        choice: "demoable-new-tech",
        probabilities: {
          "demoable-new-tech": 0.9,
          "how-to/opinion": 0.05,
          "hype/engagement-bait": 0.03,
          "off-topic": 0.02,
        },
        confidence: 0.9,
      },
      demoability: {
        score: 3,
        probabilities: { 0: 0.05, 1: 0.05, 2: 0.1, 3: 0.8 },
        confidence: 0.8,
      },
      has_primary_source: {
        noul: 0.95,
      },
      stack_fit: {
        choice: "ai-agents/automation",
        probabilities: {
          "nextjs-react": 0.05,
          "supabase/postgres": 0.05,
          "vercel/deploy": 0.05,
          "ai-agents/automation": 0.8,
          "none": 0.05,
        },
        confidence: 0.8,
      },
    });

    const results = triageBookmarks(bookmarks, answersMap);

    expect(results).toHaveLength(2);
    expect(results[0].bookmark.id).toBe("2");
    expect(results[1].bookmark.id).toBe("1");
    expect(results[0].rank).toBeGreaterThan(results[1].rank);
  });

  it("should reorder results when weights change", () => {
    const bookmarks: Bookmark[] = [
      { id: "tech", text: "Tech post", author: "@tech", url: "https://example.com/tech" },
      { id: "howto", text: "How-to post", author: "@howto", url: "https://example.com/howto" },
    ];

    const answersMap = new Map<string, JevAnswers>();

    const techAnswers: JevAnswers = {
      category: {
        choice: "demoable-new-tech",
        probabilities: {
          "demoable-new-tech": 0.9,
          "how-to/opinion": 0.05,
          "hype/engagement-bait": 0.03,
          "off-topic": 0.02,
        },
        confidence: 0.9,
      },
      demoability: {
        score: 1,
        probabilities: { 0: 0.1, 1: 0.7, 2: 0.15, 3: 0.05 },
        confidence: 0.7,
      },
      has_primary_source: {
        noul: 0.5,
      },
      stack_fit: {
        choice: "none",
        probabilities: {
          "nextjs-react": 0.05,
          "supabase/postgres": 0.05,
          "vercel/deploy": 0.05,
          "ai-agents/automation": 0.05,
          "none": 0.8,
        },
        confidence: 0.8,
      },
    };

    const howtoAnswers: JevAnswers = {
      category: {
        choice: "how-to/opinion",
        probabilities: {
          "demoable-new-tech": 0.05,
          "how-to/opinion": 0.85,
          "hype/engagement-bait": 0.05,
          "off-topic": 0.05,
        },
        confidence: 0.85,
      },
      demoability: {
        score: 2,
        probabilities: { 0: 0.05, 1: 0.1, 2: 0.75, 3: 0.1 },
        confidence: 0.75,
      },
      has_primary_source: {
        noul: 0.9,
      },
      stack_fit: {
        choice: "nextjs-react",
        probabilities: {
          "nextjs-react": 0.8,
          "supabase/postgres": 0.05,
          "vercel/deploy": 0.05,
          "ai-agents/automation": 0.05,
          "none": 0.05,
        },
        confidence: 0.8,
      },
    };

    answersMap.set("tech", techAnswers);
    answersMap.set("howto", howtoAnswers);

    // With default config, howto has higher rank due to better demoability,
    // primary source, and stack fit
    const defaultResults = triageBookmarks(bookmarks, answersMap);
    expect(defaultResults[0].bookmark.id).toBe("howto");

    // Config heavily favoring category "demoable-new-tech" should reorder
    const configFavoringTech: TriageConfig = {
      weights: {
        category: {
          "demoable-new-tech": 50,
          "how-to/opinion": 1,
          "hype/engagement-bait": -5,
          "off-topic": -10,
        },
        demoability: 1,
        has_primary_source: 1,
        stack_fit: {
          "nextjs-react": 1,
          "supabase/postgres": 1,
          "vercel/deploy": 1,
          "ai-agents/automation": 1,
          "none": 0,
        },
      },
      confidenceThreshold: 0.6,
      rankCutoffs: {
        topPicks: 15,
        skip: 0,
      },
    };

    const reorderedResults = triageBookmarks(bookmarks, answersMap, configFavoringTech);
    expect(reorderedResults[0].bookmark.id).toBe("tech");
    expect(reorderedResults[0].rank).toBeGreaterThan(reorderedResults[1].rank);
  });

  it("should handle empty bookmarks array", () => {
    const results = triageBookmarks([], new Map());
    expect(results).toHaveLength(0);
  });
});
