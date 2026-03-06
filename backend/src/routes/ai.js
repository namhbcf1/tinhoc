import { Hono } from 'hono';
import { z } from 'zod';
import { createPostEndpoint } from '../lib/api-templates.js';
import * as AIService from '../services/ai-service.js';
import { errorResponse } from '../utils/helpers.js';

const ai = new Hono();

ai.post('/query', async (c) => {
    const user = c.get('user');
    if (!user || !user.cccd) {
        return errorResponse('Bạn cần đăng nhập để sử dụng tính năng này', 401);
    }

    try {
        const { message } = await c.req.json();
        if (!message) return errorResponse('Thiếu nội dung tin nhắn', 400);

        const response = await AIService.queryAI(c, user.cccd, message);
        return c.json({ success: true, response });
    } catch (err) {
        return errorResponse(err.message, 500);
    }
});

export default ai;
