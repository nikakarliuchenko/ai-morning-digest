/**
 * GitHub Actions entry point.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/run-pipeline.ts
 *   npx tsx --env-file=.env.local scripts/run-pipeline.ts 2026-03-25
 */

import { runPipeline } from '@/lib/pipeline';

const date = process.argv[2] ?? new Date().toISOString().slice(0, 10);

runPipeline(date)
  .then((result) => {
    console.log('\n' + JSON.stringify(result, null, 2));
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n[pipeline] fatal:', err);
    process.exit(1);
  });
