// Application version and build metadata
// Auto-generated at build time

export const VERSION = {
  number: '0.2.0',
  buildTime: process.env.NEXT_PUBLIC_BUILD_TIME || 'dev',
  gitCommit: process.env.NEXT_PUBLIC_GIT_COMMIT || 'dev',
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV || 'development'
} as const

export function getVersionString(): string {
  return `v${VERSION.number}`
}

export function getBuildTimeString(): string {
  if (VERSION.buildTime === 'dev') return 'dev build'
  const date = new Date(VERSION.buildTime)
  return date.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC')
}

export function getShortCommit(): string {
  return VERSION.gitCommit.substring(0, 7)
}
