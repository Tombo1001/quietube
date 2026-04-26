export type SortColumn = 'title' | 'lastUpload' | 'daysInactive'
export type SortDirection = 'asc' | 'desc'
export type ChannelStatus = 'loading' | 'loaded' | 'no-uploads' | 'error' | 'unavailable'

export interface Subscription {
  subscriptionId: string
  channelId: string
  title: string
  thumbnailUrl: string
}

export interface ChannelInfo {
  subscriptionId: string
  channelId: string
  title: string
  thumbnailUrl: string
  uploadsPlaylistId: string | null
  lastUploadDate: string | null  // ISO 8601
  daysInactive: number | null
  status: ChannelStatus
}

export interface PendingDelete {
  channel: ChannelInfo
  timeoutId: ReturnType<typeof setTimeout>
}

export interface ToastMessage {
  id: string
  channelTitle: string
  subscriptionId: string
}

export interface UserProfile {
  name: string
  picture: string
  email: string
}
