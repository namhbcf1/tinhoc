import { Hono } from 'hono';
import type { Env } from '../types/env.js';
import { jsonResponse, errorResponse } from '../utils/helpers.js';
import {
  getHomepageSettings,
  updateHomepageSettings,
  getHomepageSetting,
  setHomepageSetting
} from '../db/homepage-queries.js';

const homepage = new Hono<{ Bindings: Env }>();

// ========================================
// GET /homepage/settings - Lấy tất cả cài đặt homepage
// ========================================
homepage.get('/settings', async (c) => {
  try {
    const settings = await getHomepageSettings(c.env.DB);

    return jsonResponse({
      success: true,
      data: settings
    });
  } catch (error: any) {
    console.error('Error fetching homepage settings:', error);
    return errorResponse('Lỗi lấy cài đặt homepage: ' + error.message, 500);
  }
});

// ========================================
// GET /homepage/settings/:key - Lấy một cài đặt cụ thể
// ========================================
homepage.get('/settings/:key', async (c) => {
  try {
    const { key } = c.req.param();
    const setting = await getHomepageSetting(c.env.DB, key);

    if (!setting) {
      return errorResponse('Không tìm thấy cài đặt', 404);
    }

    return jsonResponse({
      success: true,
      data: setting
    });
  } catch (error: any) {
    console.error('Error fetching setting:', error);
    return errorResponse('Lỗi lấy cài đặt: ' + error.message, 500);
  }
});

// ========================================
// POST /homepage/settings - Cập nhật cài đặt homepage (bulk update)
// ========================================
homepage.post('/settings', async (c) => {
  try {
    const settingsData = await c.req.json() as any;

    // Validate
    if (!settingsData || typeof settingsData !== 'object') {
      return errorResponse('Dữ liệu cài đặt không hợp lệ', 400);
    }

    await updateHomepageSettings(c.env.DB, settingsData);

    return jsonResponse({
      success: true,
      message: 'Cập nhật cài đặt thành công'
    });
  } catch (error: any) {
    console.error('Error updating settings:', error);
    return errorResponse('Lỗi cập nhật cài đặt: ' + error.message, 500);
  }
});

// ========================================
// PUT /homepage/settings/:key - Cập nhật một cài đặt cụ thể
// ========================================
homepage.put('/settings/:key', async (c) => {
  try {
    const { key } = c.req.param();
    const { value } = await c.req.json() as any;

    if (value === undefined) {
      return errorResponse('Thiếu giá trị cài đặt', 400);
    }

    await setHomepageSetting(c.env.DB, key, value);

    return jsonResponse({
      success: true,
      message: 'Cập nhật cài đặt thành công'
    });
  } catch (error: any) {
    console.error('Error updating setting:', error);
    return errorResponse('Lỗi cập nhật cài đặt: ' + error.message, 500);
  }
});

export default homepage;
