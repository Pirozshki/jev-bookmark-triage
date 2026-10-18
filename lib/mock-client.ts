import type { Bookmark, Category, StackFit, JevAnswers } from "./types";

/**
 * Mock TypeSafe client that returns deterministic results based on heuristics.
 * This allows the app to work without a real API key for development and testing.
 */
export class MockTypeSafeClient {
  public callCount = 0;
  public lastCall: { state: unknown; questions: unknown; model?: string } | null = null;

  async systemOne({
    state,
    questions,
    model,
  }: {
    state: { bookmark: Bookmark };
    questions: unknown;
    model?: string;
  }): Promise<{
    answers: JevAnswers;
  }> {
    this.callCount++;
    this.lastCall = { state, questions, model };

    const text = state.bookmark.text.toLowerCase();
    const url = state.bookmark.url.toLowerCase();

    const category = this.categorize(text);
    const demoability = this.scoreDemoability(text, url);
    const hasPrimarySource = this.checkPrimarySource(text, url);
    const stackFit = this.determineStackFit(text, url);

    return {
      answers: {
        category: {
          choice: category.choice,
          probabilities: category.probabilities,
          confidence: category.confidence,
        },
        demoability: {
          score: demoability.score,
          probabilities: demoability.probabilities,
          confidence: demoability.confidence,
        },
        has_primary_source: {
          noul: hasPrimarySource,
        },
        stack_fit: {
          choice: stackFit.choice,
          probabilities: stackFit.probabilities,
          confidence: stackFit.confidence,
        },
      },
    };
  }

  private categorize(text: string): {
    choice: Category;
    probabilities: Record<Category, number>;
    confidence: number;
  } {
    const scores: Record<Category, number> = {
      "demoable-new-tech": 0.1,
      "how-to/opinion": 0.1,
      "hype/engagement-bait": 0.1,
      "off-topic": 0.1,
    };

    if (
      text.includes("announcing") ||
      text.includes("released") ||
      text.includes("launched") ||
      text.includes("new feature") ||
      text.includes("now support")
    ) {
      scores["demoable-new-tech"] += 0.6;
    }

    if (
      text.includes("tutorial") ||
      text.includes("guide") ||
      text.includes("building") ||
      text.includes("how to") ||
      text.includes("blog post")
    ) {
      scores["how-to/opinion"] += 0.6;
    }

    if (
      text.includes("🚀") ||
      text.includes("🔥") ||
      text.includes("😱") ||
      text.includes("🤯") ||
      text.includes("thread 🧵") ||
      text.includes("secret") ||
      text.includes("hack") ||
      text.includes("blow your mind") ||
      text.includes("change your life")
    ) {
      scores["hype/engagement-bait"] += 0.7;
    }

    if (
      text.includes("bread") ||
      text.includes("baking") ||
      text.includes("podcast") ||
      text.includes("quit your job")
    ) {
      scores["off-topic"] += 0.6;
    }

    const total = Object.values(scores).reduce((a, b) => a + b, 0);
    const probabilities = Object.fromEntries(
      Object.entries(scores).map(([k, v]) => [k, v / total])
    ) as Record<Category, number>;

    const maxProb = Math.max(...Object.values(probabilities));
    const choice = Object.entries(probabilities).find(([, v]) => v === maxProb)![0] as Category;
    const confidence = Math.min(1, maxProb * 1.5);

    return { choice, probabilities, confidence };
  }

  private scoreDemoability(
    text: string,
    url: string
  ): {
    score: number;
    probabilities: Record<number, number>;
    confidence: number;
  } {
    let level = 0;

    const hasRepo = 
      url.includes("github.com") || 
      url.includes("code.example.com") ||
      text.includes("repo:") || 
      text.includes("open source");
    const hasDocs = url.includes("/docs/") || text.includes("docs here:");
    const hasDemo = text.includes("demo") || text.includes("built a");
    const isSmallScope =
      text.includes("lightweight") ||
      text.includes("simple") ||
      text.includes("200 loc") ||
      text.includes("no external dep");

    if (hasRepo && isSmallScope) {
      level = 3;
    } else if (hasRepo || (hasDocs && hasDemo)) {
      level = 2;
    } else if (hasDocs || hasDemo) {
      level = 1;
    } else {
      level = 0;
    }

    const probabilities: Record<number, number> = {
      0: level === 0 ? 0.7 : 0.1,
      1: level === 1 ? 0.7 : 0.1,
      2: level === 2 ? 0.7 : 0.1,
      3: level === 3 ? 0.7 : 0.1,
    };
    probabilities[level] = 0.7;
    const remaining = 0.3;
    const others = [0, 1, 2, 3].filter((l) => l !== level);
    others.forEach((l) => (probabilities[l] = remaining / others.length));

    const total = Object.values(probabilities).reduce((a, b) => a + b, 0);
    Object.keys(probabilities).forEach((k) => {
      probabilities[Number(k)] /= total;
    });

    return {
      score: level + (probabilities[level + 1] || 0) * 0.3,
      probabilities,
      confidence: 0.7,
    };
  }

  private checkPrimarySource(text: string, url: string): number {
    const hasDocs = url.includes("/docs/") || url.includes("/doc/") || url.includes("documentation");
    const hasRepo = 
      url.includes("github.com") || 
      url.includes("gitlab.com") ||
      url.includes("code.example.com");
    const hasOfficialAnnouncement = url.includes("blog") && (text.includes("announcing") || text.includes("released"));
    const isVideoOnly = url.includes("youtube.com") || url.includes("video");
    const isScreenshotOnly = url.includes("instagram.com") || text.includes("visualization showing");

    if (hasDocs || hasRepo) return 0.95;
    if (hasOfficialAnnouncement) return 0.75;
    if (isVideoOnly && !hasDocs && !hasRepo) return 0.15;
    if (isScreenshotOnly && !hasDocs && !hasRepo) return 0.1;

    return 0.4;
  }

  private determineStackFit(text: string, url: string): {
    choice: StackFit;
    probabilities: Record<StackFit, number>;
    confidence: number;
  } {
    const scores: Record<StackFit, number> = {
      "nextjs-react": 0.05,
      "supabase/postgres": 0.05,
      "vercel/deploy": 0.05,
      "ai-agents/automation": 0.05,
      "none": 0.2,
    };

    if (
      text.includes("next.js") ||
      text.includes("nextjs") ||
      text.includes("react") ||
      url.includes("nextjs.org") ||
      text.includes("shadcn")
    ) {
      scores["nextjs-react"] += 0.7;
    }

    if (
      text.includes("supabase") ||
      text.includes("postgres") ||
      text.includes("drizzle") ||
      text.includes("database")
    ) {
      scores["supabase/postgres"] += 0.7;
    }

    if (
      text.includes("vercel") ||
      text.includes("edge functions") ||
      text.includes("deployment") ||
      url.includes("vercel.com")
    ) {
      scores["vercel/deploy"] += 0.7;
    }

    if (
      text.includes("ai agents") ||
      text.includes("automation") ||
      text.includes("claude") ||
      text.includes("anthropic")
    ) {
      scores["ai-agents/automation"] += 0.7;
    }

    const total = Object.values(scores).reduce((a, b) => a + b, 0);
    const probabilities = Object.fromEntries(
      Object.entries(scores).map(([k, v]) => [k, v / total])
    ) as Record<StackFit, number>;

    const maxProb = Math.max(...Object.values(probabilities));
    const choice = Object.entries(probabilities).find(([, v]) => v === maxProb)![0] as StackFit;
    const confidence = Math.min(1, maxProb * 1.4);

    return { choice, probabilities, confidence };
  }
}
