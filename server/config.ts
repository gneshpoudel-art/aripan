import { config as loadEnv } from 'dotenv'

loadEnv()

const defaultOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4000',
  'http://127.0.0.1:4000',
  // Render frontend (both spellings to be safe)
  'https://aripan-frontend.onrender.com',
  'https://aripan-frontendd.onrender.com',
  // Vercel preview/production domains
  'https://aripan.vercel.app',
  'https://aripan-two.vercel.app',
  // Dynamic env vars set by Render and Vercel at runtime
  process.env.RENDER_EXTERNAL_URL ?? '',
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '',
  process.env.FRONTEND_URL ?? '',
]

const envOrigins = (process.env.ALLOWED_ORIGINS ?? '').split(',').map((v) => v.trim()).filter(Boolean)

export const config = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  jwtSecret: process.env.JWT_SECRET ?? 'aripan-dev-secret-change-me',
  adminEmail: process.env.ADMIN_EMAIL ?? 'admin@aripan.art',
  adminPassword: process.env.ADMIN_PASSWORD ?? 'admin123',
  allowedOrigins: Array.from(new Set([...defaultOrigins, ...envOrigins])).filter(Boolean),
  dbPath: process.env.DATABASE_PATH ?? './data/aripan.db',
  supabaseUrl: process.env.SUPABASE_URL ?? '',
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  emailJsPublicKey: process.env.EMAILJS_PUBLIC_KEY ?? '',
  emailJsServiceId: process.env.EMAILJS_SERVICE_ID ?? '',
  emailJsTemplateId: process.env.EMAILJS_TEMPLATE_ID ?? '',
} as const
