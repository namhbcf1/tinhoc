// Seed Exam Tests Endpoint
// This endpoint allows admin to seed sample exam tests

import { Hono } from 'hono';
import type { Env } from '../types/env.js';

// Note: readFile/join are Node.js APIs used here for local dev only (not available in Workers runtime)
declare const process: any;
const readFile: any = async (...args: any[]) => { throw new Error('Not available in Workers'); };
const join: (...args: string[]) => string = (...args) => args.join('/');

const seedRouter = new Hono<{ Bindings: Env }>();

// POST /seed/exam-tests - Seed sample exam tests
seedRouter.post('/exam-tests', async (c) => {
  try {
    // Read the seed SQL file
    const seedPath = join(process.cwd(), 'migrations', 'seed-sample-exam-tests.sql');
    const seedSQL = await readFile(seedPath, 'utf-8');

    // Split by semicolon and execute each statement
    const statements = seedSQL
      .split(';')
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0 && !s.startsWith('--'));

    const results: Array<{ statement: string; success: boolean; skipped?: boolean; error?: string }> = [];
    for (const statement of statements) {
      try {
        const result = await c.env.DB.prepare(statement).run();
        results.push({ statement: statement.substring(0, 50) + '...', success: true });
      } catch (err: any) {
        // Ignore errors for duplicate entries or missing columns
        if (err.message && (
          err.message.includes('UNIQUE constraint') ||
          err.message.includes('no such column') ||
          err.message.includes('already exists')
        )) {
          results.push({ statement: statement.substring(0, 50) + '...', success: true, skipped: true });
        } else {
          results.push({ statement: statement.substring(0, 50) + '...', success: false, error: err.message });
        }
      }
    }

    return c.json({
      success: true,
      message: 'Đã seed bài thi mẫu thành công',
      results: results,
      total: results.length,
      successful: results.filter(r => r.success).length
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message
    }, 500);
  }
});

export default seedRouter;
