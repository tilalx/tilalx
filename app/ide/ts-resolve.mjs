// Lets plain `node --experimental-strip-types` resolve extensionless relative
// imports (bundler-style) — only used by the *.check.ts self-checks.
import { register } from 'node:module'

register('data:text/javascript,' + encodeURIComponent(`
export async function resolve(spec, ctx, next) {
  try { return await next(spec, ctx) }
  catch (e) { if (spec.startsWith('.') && !spec.endsWith('.ts')) return next(spec + '.ts', ctx); throw e }
}`))
