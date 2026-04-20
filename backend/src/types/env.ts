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
  READ_ONLY_MODE?: string;
  JWT_SECRET: string;
  CLOUDFLARE_ACCOUNT_ID: string;
  EDU_APP_URL?: string;
  EXAM_APP_URL?: string;

  // R2 presigned URL credentials
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;

  // Cloudflare Images
  CLOUDFLARE_IMAGES_API_TOKEN?: string;
  PHOTO_3X4_AI_ENABLED?: string;
  PHOTO_3X4_GENERATIVE_ENABLED?: string;
  PHOTO_3X4_PIPELINE_VERSION?: string;
  PHOTO_3X4_PIPELINE_PROVIDER?: string;
  PHOTO_3X4_ALWAYS_GENERATE_FINAL?: string;
  PHOTO_3X4_ZONE_HOST?: string;
  PHOTO_3X4_MODEL_PRIMARY?: string;
  PHOTO_3X4_VARIANT_COUNT?: string;
  PHOTO_3X4_STYLE_REFERENCE_URL?: string;
  PHOTO_3X4_QUEUE?: Queue;

  // Google Calendar / Meet
  GOOGLE_ADMIN_EMAIL: string;
  GOOGLE_CLIENT_EMAIL: string;
  GOOGLE_PRIVATE_KEY: string;

  // Viettel Post
  VIETTEL_POST_TOKEN?: string;
  VIETTEL_POST_GROUPADDRESS_ID?: string;
  VIETTEL_POST_SENDER_NAME?: string;
  VIETTEL_POST_SENDER_PHONE?: string;
  VIETTEL_POST_SENDER_ADDRESS?: string;
  VIETTEL_POST_SENDER_PROVINCE_ID?: string;
  VIETTEL_POST_SENDER_DISTRICT_ID?: string;
  VIETTEL_POST_SENDER_WARD_ID?: string;
}

export interface JWTPayload {
  id?: number;
  userId?: string;
  sub?: string;
  sid?: string;
  aud?: 'edu' | 'exam';
  type?: 'admin' | 'student';
  user_type?: 'admin' | 'student';
  role?: string;
  username?: string;
  cccd?: string;
  teacher_code?: string;
  teacherCode?: string;
  phone?: string;
  email?: string;
  ho_ten?: string;
  display_name?: string;
  iat?: number;
  exp?: number;
  [key: string]: unknown;
}
