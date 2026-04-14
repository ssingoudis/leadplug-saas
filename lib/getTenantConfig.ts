import { promises as fs } from 'fs'
import path from 'path'
import type { TenantConfig } from '@/types'

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-_]*$/

export async function getTenantConfig(
  slug: string,
): Promise<TenantConfig | null> {
  if (!slug || slug.startsWith('_') || !SLUG_PATTERN.test(slug)) {
    return null
  }

  const filePath = path.join(process.cwd(), 'tenants', `${slug}.json`)

  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(raw) as TenantConfig
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return null
    }
    throw err
  }
}