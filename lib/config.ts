import type { TriageConfig } from "./types";

export const DEFAULT_CONFIG: TriageConfig = {
  weights: {
    category: {
      "demoable-new-tech": 10,
      "how-to/opinion": 4,
      "hype/engagement-bait": -5,
      "off-topic": -10,
    },
    demoability: 8,
    has_primary_source: 5,
    stack_fit: {
      "nextjs-react": 6,
      "supabase/postgres": 5,
      "vercel/deploy": 4,
      "ai-agents/automation": 7,
      "none": 0,
    },
  },
  confidenceThreshold: 0.6,
  rankCutoffs: {
    topPicks: 15,
    skip: 0,
  },
};
