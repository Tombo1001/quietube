import { useCallback, useRef, useState } from 'react'
import type { ChannelInfo, Subscription } from '../types'
import { fetchUploadPlaylistIds, fetchLastUploadDate, AuthError, QuotaError } from '../lib/youtube'
import { saveCache } from '../lib/cache'
import { daysAgo } from '../lib/utils'

const PLAYLIST_CHUNK = 50  // channels.list supports up to 50 IDs
const CONCURRENT = 10       // playlistItems fetches in parallel

export type FetchPhase = 'idle' | 'playlists' | 'uploads' | 'done' | 'error'
export type FetchError = 'auth' | 'quota' | 'unknown' | null

export interface FetchProgress {
  total: number
  loaded: number
}

export function useChannelFetcher() {
  const [channels, setChannels] = useState<ChannelInfo[]>([])
  const [phase, setPhase] = useState<FetchPhase>('idle')
  const [progress, setProgress] = useState<FetchProgress>({ total: 0, loaded: 0 })
  const [fetchError, setFetchError] = useState<FetchError>(null)
  const abortRef = useRef(false)

  const fetchChannels = useCallback(async (subs: Subscription[], token: string) => {
    abortRef.current = false
    setFetchError(null)
    setPhase('playlists')

    const working: ChannelInfo[] = subs.map((s) => ({
      ...s,
      uploadsPlaylistId: null,
      lastUploadDate: null,
      daysInactive: null,
      status: 'loading',
    }))
    setChannels([...working])
    setProgress({ total: subs.length, loaded: 0 })

    try {
      // Phase 1: batch-fetch all upload playlist IDs (50 at a time)
      const playlistMap = new Map<string, string>()

      for (let i = 0; i < subs.length; i += PLAYLIST_CHUNK) {
        if (abortRef.current) return
        const ids = subs.slice(i, i + PLAYLIST_CHUNK).map((s) => s.channelId)
        const map = await fetchUploadPlaylistIds(token, ids)
        for (const [cid, pid] of map) playlistMap.set(cid, pid)
      }

      // Phase 2: fetch last upload per channel (CONCURRENT at a time)
      setPhase('uploads')
      let loaded = 0

      for (let i = 0; i < subs.length; i += CONCURRENT) {
        if (abortRef.current) return
        const batch = subs.slice(i, i + CONCURRENT)

        await Promise.all(
          batch.map(async (sub, bi) => {
            const idx = i + bi
            const playlistId = playlistMap.get(sub.channelId)

            if (!playlistId) {
              working[idx] = { ...working[idx], status: 'unavailable' }
            } else {
              try {
                const date = await fetchLastUploadDate(token, playlistId)
                working[idx] = {
                  ...working[idx],
                  uploadsPlaylistId: playlistId,
                  lastUploadDate: date,
                  daysInactive: date ? daysAgo(date) : null,
                  status: date ? 'loaded' : 'no-uploads',
                }
              } catch (err) {
                if (err instanceof AuthError || err instanceof QuotaError) throw err
                working[idx] = { ...working[idx], uploadsPlaylistId: playlistId, status: 'error' }
              }
            }

            loaded++
            setProgress({ total: subs.length, loaded })
          }),
        )

        setChannels([...working])
      }

      saveCache(working)
      setPhase('done')
    } catch (err) {
      if (err instanceof AuthError) setFetchError('auth')
      else if (err instanceof QuotaError) setFetchError('quota')
      else setFetchError('unknown')
      setPhase('error')
    }
  }, [])

  const reportError = useCallback((err: unknown) => {
    if (err instanceof AuthError) setFetchError('auth')
    else if (err instanceof QuotaError) setFetchError('quota')
    else setFetchError('unknown')
    setPhase('error')
  }, [])

  const abort = useCallback(() => {
    abortRef.current = true
    setPhase('idle')
  }, [])

  const loadFromCache = useCallback((cached: ChannelInfo[]) => {
    setChannels(cached)
    setPhase('done')
    setProgress({ total: cached.length, loaded: cached.length })
  }, [])

  return {
    channels,
    setChannels,
    phase,
    progress,
    fetchError,
    fetchChannels,
    reportError,
    abort,
    loadFromCache,
  }
}
