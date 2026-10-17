import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { triageBookmark, QUESTIONS } from "@/lib/jev-client";
import { MockTypeSafeClient } from "@/lib/mock-client";
import type { Bookmark } from "@/lib/types";

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

  it("should pass all 4 questions to mock client", async () => {
    const bookmark: Bookmark = {
      id: "test2",
      text: "Another test",
      author: "@test",
      url: "https://test.com",
    };

    const mockClient = new MockTypeSafeClient();
    await mockClient.systemOne({
      state: {
        bookmark: {
          id: bookmark.id,
          text: bookmark.text,
          author: bookmark.author,
          url: bookmark.url,
        },
      },
      questions: QUESTIONS,
      model: "jev-1.14.0",
    });

    expect(mockClient.callCount).toBe(1);
    expect(mockClient.lastCall).toBeDefined();
    expect(mockClient.lastCall?.questions).toBe(QUESTIONS);
  });
});
