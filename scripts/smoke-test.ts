#!/usr/bin/env node
import { triageBookmark } from "../lib/jev-client.js";

async function smokeTest() {
  const hasKey = !!process.env.TYPESAFE_API_KEY;

  if (!hasKey) {
    console.log("✓ TYPESAFE_API_KEY not set - skipping real API test (this is expected in mock mode)");
    process.exit(0);
  }

  console.log("Running smoke test with real TypeSafe API...");

  const testBookmark = {
    id: "smoke-test",
    text: "Announcing Next.js 15 with new caching improvements. Full docs at https://nextjs.org/docs",
    author: "@nextjs",
    url: "https://nextjs.org/docs",
  };

  const start = Date.now();

  try {
    const answers = await triageBookmark(testBookmark);
    const elapsed = Date.now() - start;

    console.log("\n✓ Smoke test passed!");
    console.log(`  Latency: ${elapsed}ms`);
    console.log(`  Category: ${answers.category.choice} (confidence: ${(answers.category.confidence * 100).toFixed(0)}%)`);
    console.log(`  Demoability: ${answers.demoability.score.toFixed(1)}/3 (confidence: ${(answers.demoability.confidence * 100).toFixed(0)}%)`);
    console.log(`  Primary source: ${(answers.has_primary_source.noul * 100).toFixed(0)}%`);
    console.log(`  Stack fit: ${answers.stack_fit.choice} (confidence: ${(answers.stack_fit.confidence * 100).toFixed(0)}%)`);
    
    process.exit(0);
  } catch (error) {
    console.error("\n✗ Smoke test failed!");
    console.error(error);
    process.exit(1);
  }
}

smokeTest();
