import { NextResponse } from "next/server";
import type { Bookmark } from "@/lib/types";
import { triageBookmark } from "@/lib/jev-client";
import { triageBookmarks } from "@/lib/triage";

export async function POST(request: Request) {
  try {
    const { bookmarks }: { bookmarks: Bookmark[] } = await request.json();

    if (!Array.isArray(bookmarks) || bookmarks.length === 0) {
      return NextResponse.json({ error: "Invalid bookmarks array" }, { status: 400 });
    }

    const answersMap = new Map();

    for (const bookmark of bookmarks) {
      const answers = await triageBookmark(bookmark);
      answersMap.set(bookmark.id, answers);
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
