// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "@/app/api/triage/route";
import { MockTypeSafeClient } from "@/lib/mock-client";

describe("API Route: /api/triage", () => {
  beforeEach(() => {
    delete process.env.TYPESAFE_API_KEY;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should make exactly one systemOne call per bookmark, each with all 4 question IDs", async () => {
    const bookmarks = [
      {
        id: "1",
        text: "First bookmark about Next.js",
        author: "@user1",
        url: "https://example.com/1",
      },
      {
        id: "2",
        text: "Second bookmark about React",
        author: "@user2",
        url: "https://example.com/2",
      },
      {
        id: "3",
        text: "Third bookmark about TypeScript",
        author: "@user3",
        url: "https://example.com/3",
      },
    ];

    // Spy on the mock client's systemOne method
    const systemOneSpy = vi.spyOn(MockTypeSafeClient.prototype, "systemOne");

    const request = new Request("http://localhost:3000/api/triage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookmarks }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.results).toHaveLength(3);

    // Verify exactly 3 systemOne calls (one per bookmark)
    expect(systemOneSpy).toHaveBeenCalledTimes(3);

    // Verify each call has all 4 question IDs
    for (let i = 0; i < 3; i++) {
      const call = systemOneSpy.mock.calls[i];
      expect(call).toBeDefined();
      const questions = call[0].questions as Record<string, unknown>;
      expect(questions).toBeDefined();
      
      const questionKeys = Object.keys(questions);
      expect(questionKeys).toHaveLength(4);
      expect(questionKeys).toEqual(
        expect.arrayContaining(["category", "demoability", "has_primary_source", "stack_fit"])
      );
    }
  });

  it("should reject requests exceeding the 50 bookmark limit", async () => {
    const tooManyBookmarks = Array.from({ length: 51 }, (_, i) => ({
      id: `${i + 1}`,
      text: `Bookmark ${i + 1}`,
      author: `@user${i + 1}`,
      url: `https://example.com/${i + 1}`,
    }));

    const request = new Request("http://localhost:3000/api/triage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookmarks: tooManyBookmarks }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toContain("50 bookmarks");
  });

  it("should route validation failures to needs-review with confidence 0", async () => {
    const bookmarks = [
      {
        id: "valid",
        text: "Valid bookmark",
        author: "@user",
        url: "https://example.com/valid",
      },
    ];

    // Mock systemOne to return an invalid response (category: "none" should fail validation)
    vi.spyOn(MockTypeSafeClient.prototype, "systemOne").mockResolvedValueOnce({
      answers: {
        category: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          choice: "none" as any, // Invalid: "none" is not a valid category
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          probabilities: { none: 1.0 } as any,
          confidence: 0.8, // High confidence but invalid choice
        },
        demoability: {
          score: 2,
          probabilities: { "0": 0.1, "1": 0.2, "2": 0.6, "3": 0.1 },
          confidence: 0.8,
        },
        has_primary_source: {
          noul: 0.8,
        },
        stack_fit: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          choice: "none" as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          probabilities: { none: 1.0 } as any,
          confidence: 0.8,
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const request = new Request("http://localhost:3000/api/triage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookmarks }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.results).toHaveLength(1);
    
    // Item should be routed to needs-review due to confidence = 0
    expect(data.results[0].bucket).toBe("needs-review");
    expect(data.results[0].answers.category.confidence).toBe(0);
    
    // Rank should be finite (not NaN)
    expect(Number.isFinite(data.results[0].rank)).toBe(true);
    
    // Should include warning about validation error
    expect(data.warnings).toBeDefined();
    expect(data.warnings.validation_errors).toContain("valid");
  });
});
