import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "@/app/api/triage/route";
import * as jevClient from "@/lib/jev-client";

describe("API Route: /api/triage", () => {
  beforeEach(() => {
    delete process.env.TYPESAFE_API_KEY;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should make exactly one systemOne call per bookmark for multi-bookmark request", async () => {
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

    // Spy on triageBookmark to count calls
    const triageBookmarkSpy = vi.spyOn(jevClient, "triageBookmark");

    const request = new Request("http://localhost:3000/api/triage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookmarks }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.results).toHaveLength(3);

    // Verify exactly one call per bookmark (3 bookmarks = 3 calls)
    expect(triageBookmarkSpy).toHaveBeenCalledTimes(3);

    // Verify each call gets the correct bookmark
    expect(triageBookmarkSpy).toHaveBeenNthCalledWith(1, bookmarks[0]);
    expect(triageBookmarkSpy).toHaveBeenNthCalledWith(2, bookmarks[1]);
    expect(triageBookmarkSpy).toHaveBeenNthCalledWith(3, bookmarks[2]);

    // Each call internally makes one systemOne call with all 4 question IDs
    // (This is verified by the jev-client.test.ts tests)
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

    // Mock triageBookmark to throw ValidationError for this bookmark
    vi.spyOn(jevClient, "triageBookmark").mockRejectedValueOnce(
      new jevClient.ValidationError("Invalid SDK response")
    );

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
    
    // Should include warning about validation error
    expect(data.warnings).toBeDefined();
    expect(data.warnings.validation_errors).toContain("valid");
  });
});
