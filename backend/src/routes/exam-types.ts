import { Hono } from 'hono';
import type { Env, JWTPayload } from '../types/env.js';
import { jsonResponse, errorResponse } from '../utils/helpers.js';
import { getExamTypes } from '../lib/repositories/exam-type-repository.js';

const examTypes = new Hono<{ Bindings: Env; Variables: { user: JWTPayload } }>();

// GET /exam-types — public taxonomy feed for schedule setup and filtering
examTypes.get('/', async (c) => {
  try {
    const rows = await getExamTypes(c.env.DB);

    return jsonResponse({
      success: true,
      data: rows,
    });
  } catch (error: any) {
    return errorResponse('Lỗi lấy danh sách loại đề thi: ' + error.message, 500);
  }
});

export default examTypes;
