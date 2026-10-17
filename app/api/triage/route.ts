import { NextResponse } from "next/server";
import { z } from "zod";
import { triageBookmark, ValidationError } from "@/lib/jev-client";
import { triageBookmarks } from "@/lib/triage";
import { BookmarkSchema } from "@/lib/validation";
import type { JevAnswers } from "@/lib/types";

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

    const answersMap = new Map<string, JevAnswers>();
    const validationErrors: string[] = [];

    for (const bookmark of bookmarks) {
      try {
        const answers = await triageBookmark(bookmark);
        answersMap.set(bookmark.id, answers);
      } catch (error) {
        if (error instanceof ValidationError) {
          console.error(`Validation error for bookmark ${bookmark.id}:`, error.message);
          validationErrors.push(bookmark.id);
          
          // Route to "needs-review" by providing neutral answers that will result in low confidence
          answersMap.set(bookmark.id, {
            category: {
              choice: "off-topic",
              probabilities: {
                "demoable-new-tech": 0.25,
                "how-to/opinion": 0.25,
                "hype/engagement-bait": 0.25,
                "off-topic": 0.25,
              },
              confidence: 0.0,
            },
            demoability: {
              score: 0,
              probabilities: { 0: 1, 1: 0, 2: 0, 3: 0 },
              confidence: 0.0,
            },
            has_primary_source: {
              noul: 0.5,
            },
            stack_fit: {
              choice: "none",
              probabilities: {
                "nextjs-react": 0.2,
                "supabase/postgres": 0.2,
                "vercel/deploy": 0.2,
                "ai-agents/automation": 0.2,
                "none": 0.2,
              },
              confidence: 0.0,
            },
          });
        } else {
          throw error;
        }
      }
    }

    const results = triageBookmarks(bookmarks, answersMap);

    return NextResponse.json({ 
      results,
      ...(validationErrors.length > 0 && { 
        warnings: {
          validation_errors: validationErrors,
          message: "Some bookmarks had validation errors and were routed to needs-review"
        }
      })
    });
  } catch (error) {
    console.error("Triage error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
