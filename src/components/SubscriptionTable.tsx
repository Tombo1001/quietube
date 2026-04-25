import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronUp, ChevronDown, ExternalLink, Trash2, Search, X, Undo2 } from 'lucide-react'
import type { ChannelInfo, SortColumn, SortDirection, PendingDelete, ToastMessage } from '../types'
import { deleteSubscription } from '../lib/youtube'
import { saveCache } from '../lib/cache'
import { AdSlot } from './AdSlot'
import { cn, formatDate, formatInactive, inactivityColor } from '../lib/utils'

interface Props {
  channels: ChannelInfo[]
  setChannels: React.Dispatch<React.SetStateAction<ChannelInfo[]>>
  token: string | null
}

const INACTIVITY_FILTERS = [
  { label: 'All', days: 0 },
  { label: '6+ mo', days: 180 },
  { label: '1+ yr', days: 365 },
  { label: '2+ yr', days: 730 },
]

export function SubscriptionTable({ channels, setChannels, token }: Props) {
  const [sort, setSort] = useState<{ col: SortColumn; dir: SortDirection }>({
    col: 'daysInactive',
    dir: 'desc',
  })
  const [minDays, setMinDays] = useState(0)
  const [search, setSearch] = useState('')
  const [pendingDeletes, setPendingDeletes] = useState<Map<string, PendingDelete>>(new Map())
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const channelsRef = useRef(channels)
  channelsRef.current = channels

  // Clear pending deletes on unmount
  useEffect(() => {
    return () => {
      pendingDeletes.forEach((p) => clearTimeout(p.timeoutId))
    }
  }, [pendingDeletes])

  const handleSort = useCallback((col: SortColumn) => {
    setSort((prev) =>
      prev.col === col
        ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { col, dir: col === 'daysInactive' ? 'desc' : 'asc' },
    )
  }, [])

  const handleUnsubscribe = useCallback(
    (channel: ChannelInfo) => {
      if (!token) return
      const { subscriptionId } = channel

      // Remove from view immediately
      setChannels((prev) => prev.filter((c) => c.subscriptionId !== subscriptionId))

      const timeoutId = setTimeout(async () => {
        try {
          await deleteSubscription(token, subscriptionId)
          saveCache(channelsRef.current)
        } catch {
          // Restore the channel if delete failed
          setChannels((prev) => {
            const next = [...prev, channel]
            saveCache(next)
            return next
          })
        } finally {
          setPendingDeletes((prev) => {
            const next = new Map(prev)
            next.delete(subscriptionId)
            return next
          })
          setToasts((prev) => prev.filter((t) => t.subscriptionId !== subscriptionId))
        }
      }, 5000)

      setPendingDeletes((prev) => new Map(prev).set(subscriptionId, { channel, timeoutId }))

      // Add toast, enforce max 3 (FIFO — drop oldest if over limit)
      setToasts((prev) => {
        const next = [...prev, { id: crypto.randomUUID(), channelTitle: channel.title, subscriptionId }]
        return next.length > 3 ? next.slice(next.length - 3) : next
      })

      // Auto-dismiss this toast after 5s regardless of API call timing
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.subscriptionId !== subscriptionId))
      }, 5000)
    },
    [token, setChannels],
  )

  const handleUndo = useCallback(
    (subscriptionId: string) => {
      const pending = pendingDeletes.get(subscriptionId)
      if (!pending) return
      clearTimeout(pending.timeoutId)
      setChannels((prev) => {
        const next = [...prev, pending.channel]
        saveCache(next)
        return next
      })
      setPendingDeletes((prev) => {
        const next = new Map(prev)
        next.delete(subscriptionId)
        return next
      })
      setToasts((prev) => prev.filter((t) => t.subscriptionId !== subscriptionId))
    },
    [pendingDeletes, setChannels],
  )

  const visible = useMemo(() => {
    const q = search.toLowerCase()
    return channels
      .filter((c) => {
        if (c.status === 'loading') return false
        if (minDays > 0 && (c.daysInactive === null || c.daysInactive < minDays)) return false
        if (q && !c.title.toLowerCase().includes(q)) return false
        return true
      })
      .sort((a, b) => {
        let diff = 0
        if (sort.col === 'title') {
          diff = a.title.localeCompare(b.title)
        } else if (sort.col === 'lastUpload') {
          const ta = a.lastUploadDate ? new Date(a.lastUploadDate).getTime() : 0
          const tb = b.lastUploadDate ? new Date(b.lastUploadDate).getTime() : 0
          diff = ta - tb
        } else {
          diff = (a.daysInactive ?? -1) - (b.daysInactive ?? -1)
        }
        return sort.dir === 'asc' ? diff : -diff
      })
  }, [channels, sort, minDays, search])

  const loading = channels.filter((c) => c.status === 'loading').length

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-500 text-sm">Show inactive for:</span>
          {INACTIVITY_FILTERS.map((f) => (
            <button
              key={f.days}
              onClick={() => setMinDays(f.days)}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer',
                minDays === f.days
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search channels…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-8 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-slate-500 w-48"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="text-slate-500 text-sm">
        {loading > 0 && <span className="mr-3 text-amber-500">{loading} still loading…</span>}
        Showing {visible.length} of {channels.length} subscriptions
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 border-b border-slate-800">
            <tr>
              <th className="w-12 px-3 py-3" />
              <SortHeader col="title" label="Channel" sort={sort} onSort={handleSort} />
              <SortHeader col="lastUpload" label="Last Upload" sort={sort} onSort={handleSort} />
              <SortHeader col="daysInactive" label="Inactive For" sort={sort} onSort={handleSort} />
              <th className="px-3 py-3 text-right text-slate-500 font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {visible.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-slate-600">
                  {search
                    ? 'No channels match your search.'
                    : 'No channels match the current filter.'}
                </td>
              </tr>
            ) : (
              visible.reduce<React.ReactNode[]>((rows, channel, i) => {
                rows.push(
                  <ChannelRow
                    key={channel.subscriptionId}
                    channel={channel}
                    onUnsubscribe={handleUnsubscribe}
                    disabled={!token}
                  />,
                )
                // Insert an in-feed ad after every 10th row, max 3 total
                const adNumber = Math.floor((i + 1) / 10)
                if ((i + 1) % 10 === 0 && adNumber <= 3) {
                  rows.push(
                    <tr key={`ad-${i}`} className="border-t border-slate-800/60">
                      <td colSpan={5} className="px-3 py-2">
                        <AdSlot variant="feed" />
                      </td>
                    </tr>,
                  )
                }
                return rows
              }, [])
            )}
          </tbody>
        </table>
      </div>

      {/* Toast stack */}
      {toasts.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex flex-col gap-2 z-50">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className="flex items-center gap-3 bg-slate-800 border border-slate-700 rounded-xl shadow-xl px-4 py-3 text-sm text-slate-200 min-w-72"
            >
              <Trash2 className="w-4 h-4 text-red-400 shrink-0" />
              <span className="flex-1 truncate">
                Unsubscribed from <strong>{toast.channelTitle}</strong>
              </span>
              <button
                onClick={() => handleUndo(toast.subscriptionId)}
                className="flex items-center gap-1 text-red-400 hover:text-red-300 font-medium shrink-0 cursor-pointer"
              >
                <Undo2 className="w-3.5 h-3.5" />
                Undo
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SortHeader({
  col,
  label,
  sort,
  onSort,
}: {
  col: SortColumn
  label: string
  sort: { col: SortColumn; dir: SortDirection }
  onSort: (col: SortColumn) => void
}) {
  const active = sort.col === col
  return (
    <th
      onClick={() => onSort(col)}
      className="px-3 py-3 text-left text-slate-500 font-medium cursor-pointer hover:text-slate-300 select-none"
    >
      <div className="flex items-center gap-1">
        {label}
        {active ? (
          sort.dir === 'asc' ? (
            <ChevronUp className="w-3.5 h-3.5 text-red-400" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-red-400" />
          )
        ) : (
          <ChevronDown className="w-3.5 h-3.5 opacity-20" />
        )}
      </div>
    </th>
  )
}

function ChannelRow({
  channel,
  onUnsubscribe,
  disabled,
}: {
  channel: ChannelInfo
  onUnsubscribe: (c: ChannelInfo) => void
  disabled: boolean
}) {
  const { title, thumbnailUrl, channelId, lastUploadDate, daysInactive, status } = channel

  return (
    <tr className="hover:bg-slate-900/50 transition-colors">
      {/* Thumbnail */}
      <td className="px-3 py-2.5">
        <img
          src={thumbnailUrl || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"%3E%3Crect width="40" height="40" fill="%231e293b"/%3E%3C/svg%3E'}
          alt=""
          className="w-8 h-8 rounded-full object-cover bg-slate-800"
          loading="lazy"
        />
      </td>

      {/* Channel name */}
      <td className="px-3 py-2.5 max-w-xs">
        <a
          href={`https://www.youtube.com/channel/${channelId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-slate-200 hover:text-white group"
        >
          <span className="truncate">{title}</span>
          <ExternalLink className="w-3 h-3 text-slate-600 group-hover:text-slate-400 shrink-0" />
        </a>
      </td>

      {/* Last upload */}
      <td className="px-3 py-2.5 text-slate-400">
        {status === 'loading' && <span className="text-slate-600 animate-pulse">Loading…</span>}
        {status === 'no-uploads' && <span className="text-slate-600 italic">Zero uploads</span>}
        {status === 'unavailable' && <span className="text-slate-600 italic">Unavailable</span>}
        {status === 'error' && <span className="text-red-800 italic">Error</span>}
        {status === 'loaded' && lastUploadDate && formatDate(lastUploadDate)}
      </td>

      {/* Days inactive */}
      <td className="px-3 py-2.5">
        {status === 'loaded' && daysInactive !== null ? (
          <span className={cn('font-medium tabular-nums', inactivityColor(daysInactive))}>
            {formatInactive(daysInactive)}
          </span>
        ) : status === 'no-uploads' ? (
          <span className="text-red-400 font-medium">Never</span>
        ) : (
          <span className="text-slate-700">—</span>
        )}
      </td>

      {/* Unsubscribe */}
      <td className="px-3 py-2.5 text-right">
        <button
          onClick={() => onUnsubscribe(channel)}
          disabled={disabled || status === 'loading'}
          className="flex items-center gap-1.5 ml-auto text-slate-600 hover:text-red-400 disabled:opacity-20 disabled:cursor-not-allowed transition-colors text-xs px-2 py-1 rounded hover:bg-red-950/30 cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Unsub
        </button>
      </td>
    </tr>
  )
}
