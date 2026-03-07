export interface Env {
  // D1 Database
  DB: D1Database;

  // R2 Storage
  R2: R2Bucket;
  VIDEO_BUCKET: R2Bucket;

  // AI binding
  AI: Ai;

  // Environment variables
  ENVIRONMENT: string;
  JWT_SECRET: string;
  CLOUDFLARE_ACCOUNT_ID: string;

  // R2 presigned URL credentials
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;

  // Cloudflare Images
  CLOUDFLARE_IMAGES_API_TOKEN: string;

  // Google Calendar / Meet
  GOOGLE_ADMIN_EMAIL: string;
  GOOGLE_CLIENT_EMAIL: string;
  GOOGLE_PRIVATE_KEY: string;
}

export interface JWTPayload {
  userId: string;
  type: 'admin' | 'teacher' | 'student';
  role?: string;
  teacherCode?: string;
  phone?: string;
  iat?: number;
  exp?: number;
}
