import { config as loadEnv } from 'dotenv'

loadEnv()

export const config = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  jwtSecret: process.env.JWT_SECRET ?? 'aripan-dev-secret-change-me',
  adminEmail: process.env.ADMIN_EMAIL ?? 'admin@aripan.art',
  adminPassword: process.env.ADMIN_PASSWORD ?? 'admin123',
  allowedOrigins: (process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173,http://127.0.0.1:5173').split(',').map((value) => value.trim()).filter(Boolean),
  dbPath: process.env.DATABASE_PATH ?? './data/aripan.db',
  supabaseUrl: process.env.SUPABASE_URL ?? '',
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  emailJsPublicKey: process.env.EMAILJS_PUBLIC_KEY ?? '',
  emailJsServiceId: process.env.EMAILJS_SERVICE_ID ?? '',
  emailJsTemplateId: process.env.EMAILJS_TEMPLATE_ID ?? '',
} as const
