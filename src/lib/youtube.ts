import type { Subscription } from '../types'

const YT = 'https://www.googleapis.com/youtube/v3'

export class AuthError extends Error {
  override name = 'AuthError'
}

export class QuotaError extends Error {
  override name = 'QuotaError'
}

async function ytFetch<T>(url: string, token: string): Promise<T> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })

  if (res.status === 401) throw new AuthError('Session expired — please sign in again')

  if (res.status === 403) {
    let body: { error?: { errors?: { reason?: string }[] } } = {}
    try { body = await res.json() } catch { /* ignore */ }
    if (body.error?.errors?.[0]?.reason === 'quotaExceeded') {
      throw new QuotaError('YouTube API daily quota exhausted — try again tomorrow')
    }
    throw new Error('YouTube API access forbidden (403)')
  }

  if (!res.ok) throw new Error(`YouTube API error ${res.status}`)
  return res.json() as Promise<T>
}

interface SubscriptionsListResponse {
  nextPageToken?: string
  items: {
    id: string
    snippet: {
      title: string
      resourceId: { channelId: string }
      thumbnails?: { default?: { url: string } }
    }
  }[]
}

interface ChannelsListResponse {
  items?: {
    id: string
    contentDetails?: { relatedPlaylists?: { uploads?: string } }
  }[]
}

interface PlaylistItemsListResponse {
  items?: { snippet: { publishedAt: string } }[]
}

export async function fetchAllSubscriptions(
  token: string,
  onPage: (subs: Subscription[]) => void,
): Promise<Subscription[]> {
  const all: Subscription[] = []
  let pageToken: string | undefined

  do {
    const params = new URLSearchParams({
      part: 'snippet',
      mine: 'true',
      maxResults: '50',
      ...(pageToken ? { pageToken } : {}),
    })

    const data = await ytFetch<SubscriptionsListResponse>(
      `${YT}/subscriptions?${params}`,
      token,
    )

    const page: Subscription[] = data.items.map((item) => ({
      subscriptionId: item.id,
      channelId: item.snippet.resourceId.channelId,
      title: item.snippet.title,
      thumbnailUrl: item.snippet.thumbnails?.default?.url ?? '',
    }))

    all.push(...page)
    onPage(page)
    pageToken = data.nextPageToken
  } while (pageToken)

  return all
}

export async function fetchUploadPlaylistIds(
  token: string,
  channelIds: string[],
): Promise<Map<string, string>> {
  const params = new URLSearchParams({
    part: 'contentDetails',
    id: channelIds.join(','),
    maxResults: '50',
  })

  const data = await ytFetch<ChannelsListResponse>(`${YT}/channels?${params}`, token)
  const result = new Map<string, string>()

  for (const item of data.items ?? []) {
    const pid = item.contentDetails?.relatedPlaylists?.uploads
    if (pid) result.set(item.id, pid)
  }

  return result
}

export async function fetchLastUploadDate(
  token: string,
  playlistId: string,
): Promise<string | null> {
  const params = new URLSearchParams({
    part: 'snippet',
    playlistId,
    maxResults: '1',
  })

  const res = await fetch(`${YT}/playlistItems?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (res.status === 401) throw new AuthError('Session expired')
  if (res.status === 403) {
    let body: { error?: { errors?: { reason?: string }[] } } = {}
    try { body = await res.json() } catch { /* ignore */ }
    if (body.error?.errors?.[0]?.reason === 'quotaExceeded') {
      throw new QuotaError('Quota exhausted')
    }
    return null  // forbidden but not quota — treat as zero uploads
  }
  if (!res.ok) return null  // 404 empty playlist — treat as zero uploads

  const data = await res.json() as PlaylistItemsListResponse
  return data.items?.[0]?.snippet.publishedAt ?? null
}

export async function deleteSubscription(token: string, subscriptionId: string): Promise<void> {
  const res = await fetch(`${YT}/subscriptions?id=${subscriptionId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })

  if (res.status === 401) throw new AuthError('Session expired')
  if (res.status === 403) {
    let body: { error?: { errors?: { reason?: string }[] } } = {}
    try { body = await res.json() } catch { /* ignore */ }
    if (body.error?.errors?.[0]?.reason === 'quotaExceeded') {
      throw new QuotaError('Quota exhausted — cannot unsubscribe right now')
    }
    throw new Error('Unsubscribe forbidden — check YouTube scope')
  }
  if (!res.ok && res.status !== 204) throw new Error(`Unsubscribe failed: ${res.status}`)
}
