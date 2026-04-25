import type { ChannelInfo } from '../types'

const KEY = 'quietube_v1'
const TTL = 24 * 60 * 60 * 1000 // 24 hours

interface Entry {
  channels: ChannelInfo[]
  savedAt: number
}

export function loadCache(): { channels: ChannelInfo[]; ageMs: number } | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const entry = JSON.parse(raw) as Entry
    const ageMs = Date.now() - entry.savedAt
    if (ageMs > TTL) {
      localStorage.removeItem(KEY)
      return null
    }
    return { channels: entry.channels, ageMs }
  } catch {
    return null
  }
}

export function saveCache(channels: ChannelInfo[]): void {
  try {
    const entry: Entry = { channels, savedAt: Date.now() }
    localStorage.setItem(KEY, JSON.stringify(entry))
  } catch {
    // localStorage full or unavailable — not fatal
  }
}

export function clearCache(): void {
  localStorage.removeItem(KEY)
}
