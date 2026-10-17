import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { triageBookmark, QUESTIONS, ValidationError } from "@/lib/jev-client";
import { MockTypeSafeClient } from "@/lib/mock-client";
import type { Bookmark } from "@/lib/types";
import { TypeSafeClient } from "@typesafe-ai/sdk";

describe("jev-client", () => {
  beforeEach(() => {
    delete process.env.TYPESAFE_API_KEY;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should make exactly ONE systemOne call per bookmark with all 4 question IDs", async () => {
    const bookmark: Bookmark = {
      id: "test",
      text: "Test bookmark about Next.js",
      author: "@tester",
      url: "https://example.com",
    };

    const mockClient = new MockTypeSafeClient();
    const systemOneSpy = vi.spyOn(mockClient, "systemOne");

    vi.spyOn(MockTypeSafeClient.prototype, "systemOne").mockImplementation(
      mockClient.systemOne.bind(mockClient)
    );

    await triageBookmark(bookmark);

    expect(systemOneSpy).toHaveBeenCalledTimes(1);

    const call = systemOneSpy.mock.calls[0][0];
    expect(call.questions).toBeDefined();
    expect(call.questions).toBe(QUESTIONS);

    const questionKeys = Object.keys(call.questions as object);
    expect(questionKeys).toEqual(
      expect.arrayContaining(["category", "demoability", "has_primary_source", "stack_fit"])
    );
    expect(questionKeys).toHaveLength(4);
  });

  it("should throw ValidationError in real mode when SDK returns invalid category enum", async () => {
    const bookmark: Bookmark = {
      id: "invalid",
      text: "Test bookmark",
      author: "@test",
      url: "https://example.com",
    };

    // Enable real mode
    process.env.TYPESAFE_API_KEY = "test-key";

    // Mock TypeSafeClient to return invalid category "none"
    vi.spyOn(TypeSafeClient.prototype, "systemOne").mockResolvedValueOnce({
      answers: {
        category: {
          choice: "none", // Invalid: "none" is not a valid category
          probabilities: { none: 1.0 },
          confidence: 1.0,
        },
        demoability: {
          score: 1,
          probabilities: { "0": 0.1, "1": 0.7, "2": 0.15, "3": 0.05 },
          confidence: 0.7,
        },
        has_primary_source: {
          noul: 0.5,
        },
        stack_fit: {
          choice: "none",
          probabilities: { none: 1.0 },
          confidence: 1.0,
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    await expect(triageBookmark(bookmark)).rejects.toThrow(ValidationError);

    delete process.env.TYPESAFE_API_KEY;
  });

  it("should throw ValidationError in real mode when SDK response is missing stack_fit", async () => {
    const bookmark: Bookmark = {
      id: "missing-field",
      text: "Test bookmark",
      author: "@test",
      url: "https://example.com",
    };

    // Enable real mode
    process.env.TYPESAFE_API_KEY = "test-key";

    // Mock TypeSafeClient to return response missing stack_fit
    vi.spyOn(TypeSafeClient.prototype, "systemOne").mockResolvedValueOnce({
      answers: {
        category: {
          choice: "demoable-new-tech",
          probabilities: { "demoable-new-tech": 1.0 },
          confidence: 1.0,
        },
        demoability: {
          score: 1,
          probabilities: { "0": 0.1, "1": 0.7, "2": 0.15, "3": 0.05 },
          confidence: 0.7,
        },
        has_primary_source: {
          noul: 0.5,
        },
        // stack_fit missing
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    await expect(triageBookmark(bookmark)).rejects.toThrow(ValidationError);

    delete process.env.TYPESAFE_API_KEY;
  });
});
