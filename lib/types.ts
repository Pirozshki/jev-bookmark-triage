export interface Bookmark {
  id: string;
  text: string;
  author: string;
  url: string;
}

export type Category = "demoable-new-tech" | "how-to/opinion" | "hype/engagement-bait" | "off-topic";

export type DemoabilityLevel = 0 | 1 | 2 | 3;

export type StackFit = "nextjs-react" | "supabase/postgres" | "vercel/deploy" | "ai-agents/automation" | "none";

export interface JevAnswers {
  category: {
    choice: Category;
    probabilities: Record<Category, number>;
    confidence: number;
  };
  demoability: {
    score: number;
    probabilities: Record<number, number>;
    confidence: number;
  };
  has_primary_source: {
    noul: number;
  };
  stack_fit: {
    choice: StackFit;
    probabilities: Record<StackFit, number>;
    confidence: number;
  };
}

export interface TriageResult {
  bookmark: Bookmark;
  answers: JevAnswers;
  rank: number;
  bucket: "top-picks" | "needs-review" | "skip";
}

export interface TriageWeights {
  category: Record<Category, number>;
  demoability: number;
  has_primary_source: number;
  stack_fit: Record<StackFit, number>;
}

export interface TriageConfig {
  weights: TriageWeights;
  confidenceThreshold: number;
}
