import { NextResponse } from "next/server";
import { z } from "zod";
import { triageBookmark } from "@/lib/jev-client";
import { triageBookmarks } from "@/lib/triage";
import { BookmarkSchema, JevAnswersSchema } from "@/lib/validation";

const MAX_BOOKMARKS = 50;

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const RequestSchema = z.object({
      bookmarks: z.array(BookmarkSchema).min(1).max(MAX_BOOKMARKS),
    });

    const parseResult = RequestSchema.safeParse(body);

    if (!parseResult.success) {
      if (body.bookmarks && body.bookmarks.length > MAX_BOOKMARKS) {
        return NextResponse.json(
          { error: `Maximum ${MAX_BOOKMARKS} bookmarks allowed per request` },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.issues },
        { status: 400 }
      );
    }

    const { bookmarks } = parseResult.data;

    const answersMap = new Map();

    for (const bookmark of bookmarks) {
      const rawAnswers = await triageBookmark(bookmark);

      const validationResult = JevAnswersSchema.safeParse(rawAnswers);
      if (!validationResult.success) {
        console.error("SDK response validation failed:", validationResult.error);
        return NextResponse.json(
          { error: "Invalid response from triage service", details: validationResult.error.issues },
          { status: 500 }
        );
      }

      answersMap.set(bookmark.id, validationResult.data);
    }

    const results = triageBookmarks(bookmarks, answersMap);

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Triage error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
