import { TypeSafeClient, choice, score, noul } from "@typesafe-ai/sdk";
import type { Bookmark, JevAnswers } from "./types";
import { MockTypeSafeClient } from "./mock-client";

const MODEL = "jev-1.14.0";

export async function triageBookmark(bookmark: Bookmark): Promise<JevAnswers> {
  const useMock = !process.env.TYPESAFE_API_KEY;

  if (useMock) {
    const mockClient = new MockTypeSafeClient();
    const response = await mockClient.systemOne({
      state: { bookmark },
      questions: {},
      model: MODEL,
    });
    return response.answers;
  }

  const client = new TypeSafeClient({ defaultModel: MODEL });

  const response = await client.systemOne({
    state: { 
      bookmark: {
        text: bookmark.text,
        author: bookmark.author,
        url: bookmark.url,
      }
    },
    questions: {
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
    },
  });

  return response.answers as JevAnswers;
}
