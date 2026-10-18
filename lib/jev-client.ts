import "server-only";
import { TypeSafeClient, choice, score, noul } from "@typesafe-ai/sdk";
import type { Bookmark, JevAnswers } from "./types";
import { MockTypeSafeClient } from "./mock-client";
import { RawJevResponseSchema } from "./validation";

const MODEL = "jev-1.14.0";

export const QUESTIONS = {
  category: choice("What category does this post belong to?", {
    "demoable-new-tech": "A new technology, tool, or library that could be demoed in a practical project",
    "how-to/opinion": "Tutorial, guide, blog post, or opinion piece about building software",
    "hype/engagement-bait": "Clickbait, listicle, or engagement farming with little technical substance",
    "off-topic": "Not related to software engineering or technical projects",
  }),
  demoability: score("How demoable is this content?", [
    "Not demoable - just discussion, opinion, or requires extensive setup",
    "Could be demoed but would take days or require extensive dependencies",
    "Demoable in a few hours with moderate setup",
    "Easily demoable in an afternoon as a self-contained app",
  ]),
  has_primary_source: noul(
    "Does this post link to primary sources like documentation, a repository, or official release notes (vs only videos, screenshots, or commentary)?"
  ),
  stack_fit: choice("Which stack or domain does this fit best?", {
    "nextjs-react": "Next.js, React, or frontend UI frameworks",
    "supabase/postgres": "Supabase, PostgreSQL, databases, or backend data",
    "vercel/deploy": "Vercel, deployment, edge computing, or infrastructure",
    "ai-agents/automation": "AI agents, automation, or LLM-powered tools",
    "none": "Does not fit any of the above categories",
  }),
};

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export async function triageBookmark(bookmark: Bookmark): Promise<JevAnswers> {
  const useMock = !process.env.TYPESAFE_API_KEY;

  if (useMock) {
    const mockClient = new MockTypeSafeClient();
    const response = await mockClient.systemOne({
      state: {
        bookmark: {
          id: bookmark.id,
          text: bookmark.text,
          author: bookmark.author,
          url: bookmark.url,
        },
      },
      questions: QUESTIONS,
      model: MODEL,
    });

    // Validate mock response through the same schema
    const validationResult = RawJevResponseSchema.safeParse(response.answers);
    if (!validationResult.success) {
      throw new ValidationError(
        `Invalid Jev response for bookmark ${bookmark.id}: ${validationResult.error.message}`
      );
    }

    return validationResult.data;
  }

  const client = new TypeSafeClient({ 
    defaultModel: MODEL,
  });

  const response = await client.systemOne({
    state: {
      bookmark: {
        id: bookmark.id,
        text: bookmark.text,
        author: bookmark.author,
        url: bookmark.url,
      },
    },
    questions: QUESTIONS,
  });

  // Validate raw SDK response before mapping
  const validationResult = RawJevResponseSchema.safeParse(response.answers);

  if (!validationResult.success) {
    throw new ValidationError(
      `Invalid SDK response: ${validationResult.error.message}`
    );
  }

  const validated = validationResult.data;

  // Map to our internal type, carrying through the legend
  return {
    category: {
      choice: validated.category.choice,
      probabilities: validated.category.probabilities,
      confidence: validated.category.confidence,
    },
    demoability: {
      score: validated.demoability.score,
      probabilities: validated.demoability.probabilities,
      confidence: validated.demoability.confidence,
      legend: validated.demoability.legend,
    },
    has_primary_source: {
      noul: validated.has_primary_source.noul,
    },
    stack_fit: {
      choice: validated.stack_fit.choice,
      probabilities: validated.stack_fit.probabilities,
      confidence: validated.stack_fit.confidence,
    },
  };
}
