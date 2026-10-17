import { z } from "zod";

export const BookmarkSchema = z.object({
  id: z.string(),
  text: z.string(),
  author: z.string(),
  url: z.string().url(),
});

export const CategorySchema = z.enum([
  "demoable-new-tech",
  "how-to/opinion",
  "hype/engagement-bait",
  "off-topic",
]);

export const StackFitSchema = z.enum([
  "nextjs-react",
  "supabase/postgres",
  "vercel/deploy",
  "ai-agents/automation",
  "none",
]);

export const ChoiceAnswerSchema = z.object({
  choice: CategorySchema.or(StackFitSchema),
  probabilities: z.record(z.string(), z.number()),
  confidence: z.number(),
});

export const ScoreAnswerSchema = z.object({
  score: z.number(),
  probabilities: z.record(z.string(), z.number()),
  confidence: z.number(),
  legend: z.record(z.string(), z.string()).optional(),
});

export const NoulAnswerSchema = z.object({
  noul: z.number(),
});

export const JevAnswersSchema = z.object({
  category: ChoiceAnswerSchema,
  demoability: ScoreAnswerSchema,
  has_primary_source: NoulAnswerSchema,
  stack_fit: ChoiceAnswerSchema,
});
