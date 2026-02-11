// Required for build time (public vars used in client code)
const BUILD_TIME_ENV = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
] as const

// Required for runtime (server-side only, checked in API routes)
const RUNTIME_ENV = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
] as const

export function validateEnv() {
  // Only validate public vars at build time to prevent build failures
  const missing = BUILD_TIME_ENV.filter(key => !process.env[key])
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`)
  }
}

export function validateRuntimeEnv() {
  // Validate all env vars at runtime (for API routes)
  const allRequired = [...BUILD_TIME_ENV, ...RUNTIME_ENV]
  const missing = allRequired.filter(key => !process.env[key])
  if (missing.length > 0) {
    throw new Error(`Missing runtime env vars: ${missing.join(', ')}`)
  }
}

export function getEnv(key: string): string {
  const value = process.env[key]
  if (!value) throw new Error(`Env var ${key} not set`)
  return value
}
