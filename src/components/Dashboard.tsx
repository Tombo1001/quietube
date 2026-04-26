import { LogOut, RefreshCw, Tv2, AlertCircle } from 'lucide-react'
import type { ChannelInfo, UserProfile } from '../types'
import type { FetchPhase, FetchError, FetchProgress } from '../hooks/useChannelFetcher'
import { SubscriptionTable } from './SubscriptionTable'
import { formatRefreshAge } from '../lib/utils'

interface Props {
  channels: ChannelInfo[]
  setChannels: React.Dispatch<React.SetStateAction<ChannelInfo[]>>
  appPhase: 'loading-subs' | 'loading-channels' | 'dashboard'
  fetchPhase: FetchPhase
  fetchError: FetchError
  subCount: number
  progress: FetchProgress
  token: string | null
  userProfile: UserProfile | null
  dataTimestamp: number | null
  onSignOut: () => void
  onRefresh: () => void
}

export function Dashboard({
  channels,
  setChannels,
  appPhase,
  fetchPhase,
  fetchError,
  subCount,
  progress,
  token,
  userProfile,
  dataTimestamp,
  onSignOut,
  onRefresh,
}: Props) {
  const isLoading = appPhase !== 'dashboard'

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tv2 className="w-6 h-6 text-red-500 opacity-70" />
            <span className="font-bold text-slate-100 text-lg tracking-tight">QuieTube</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              disabled={isLoading}
              title="Refresh subscription data"
              className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed text-sm px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={onSignOut}
              title="Sign out"
              className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 text-sm px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Loading states */}
      {isLoading && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4">
          <LoadingView
            appPhase={appPhase}
            fetchPhase={fetchPhase}
            subCount={subCount}
            progress={progress}
          />
        </div>
      )}

      {/* Error state */}
      {fetchPhase === 'error' && fetchError && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4">
          <ErrorView error={fetchError} onRefresh={onRefresh} onSignOut={onSignOut} />
        </div>
      )}

      {/* Dashboard */}
      {!isLoading && fetchPhase !== 'error' && (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 space-y-4">
          <UserSummary userProfile={userProfile} channels={channels} dataTimestamp={dataTimestamp} />
          <SubscriptionTable
            channels={channels}
            setChannels={setChannels}
            token={token}
          />
        </main>
      )}
    </div>
  )
}

function UserSummary({
  userProfile,
  channels,
  dataTimestamp,
}: {
  userProfile: UserProfile | null
  channels: ChannelInfo[]
  dataTimestamp: number | null
}) {
  const resolved = channels.filter((c) => c.status !== 'loading')
  const total = channels.length
  const n = resolved.length || 1 // avoid div-by-zero during progressive load

  const active = resolved.filter(
    (c) => c.status === 'loaded' && c.daysInactive !== null && c.daysInactive < 180,
  ).length
  const quiet = resolved.filter(
    (c) =>
      c.status === 'loaded' &&
      c.daysInactive !== null &&
      c.daysInactive >= 180 &&
      c.daysInactive < 730,
  ).length
  const dark = resolved.filter(
    (c) =>
      c.status === 'no-uploads' ||
      c.status === 'unavailable' ||
      (c.status === 'loaded' && (c.daysInactive === null || c.daysInactive >= 730)),
  ).length

  const activePct = (active / n) * 100
  const quietPct = (quiet / n) * 100
  const darkPct = (dark / n) * 100

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 flex items-center gap-5">
      {/* Profile */}
      <div className="flex items-center gap-3 shrink-0">
        {userProfile?.picture ? (
          <img
            src={userProfile.picture}
            alt=""
            referrerPolicy="no-referrer"
            className="w-9 h-9 rounded-full ring-1 ring-slate-700 object-cover"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-slate-800" />
        )}
        <div>
          <div className="text-slate-200 text-sm font-medium leading-tight">
            {userProfile?.name ?? '—'}
          </div>
          <div className="text-slate-500 text-xs">{total} subscriptions</div>
          {dataTimestamp && (
            <div className="relative group mt-0.5 flex items-center gap-1 cursor-default w-fit">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
              <span className="text-slate-600 text-xs">{formatRefreshAge(dataTimestamp)}</span>
              <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block bg-slate-800 border border-slate-700 text-slate-400 text-xs rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-lg pointer-events-none z-10">
                Displaying cached sub data from{' '}
                {new Date(dataTimestamp).toLocaleString('en-GB', {
                  day: 'numeric', month: 'short', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="w-px self-stretch bg-slate-800 shrink-0" />

      {/* RAG breakdown */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="h-2 rounded-full overflow-hidden bg-slate-800 flex">
          {activePct > 0 && (
            <div
              className="h-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${activePct}%` }}
            />
          )}
          {quietPct > 0 && (
            <div
              className="h-full bg-amber-400 transition-all duration-500"
              style={{ width: `${quietPct}%` }}
            />
          )}
          {darkPct > 0 && (
            <div
              className="h-full bg-red-500 transition-all duration-500"
              style={{ width: `${darkPct}%` }}
            />
          )}
        </div>
        <div className="flex items-center gap-4 text-xs flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span className="text-slate-300 font-medium tabular-nums">{active}</span>
            <span className="text-slate-600">active</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
            <span className="text-slate-300 font-medium tabular-nums">{quiet}</span>
            <span className="text-slate-600">quiet (6mo–2yr)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
            <span className="text-slate-300 font-medium tabular-nums">{dark}</span>
            <span className="text-slate-600">gone dark (2yr+)</span>
          </span>
        </div>
      </div>

      <div className="w-px self-stretch bg-slate-800 shrink-0" />

      {/* Buy Me a Coffee */}
      <div className="shrink-0 flex items-center">
        <a
          href="https://www.buymeacoffee.com/exit"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img
            src="https://img.buymeacoffee.com/button-api/?text=Buy+me+a+coffee&emoji=%E2%98%95&slug=exit&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff"
            alt="Buy me a coffee"
            style={{ height: '38px', borderRadius: '8px' }}
          />
        </a>
      </div>
    </div>
  )
}

function LoadingView({
  appPhase,
  fetchPhase,
  subCount,
  progress,
}: {
  appPhase: 'loading-subs' | 'loading-channels' | 'dashboard'
  fetchPhase: FetchPhase
  subCount: number
  progress: FetchProgress
}) {
  const pct =
    progress.total > 0 ? Math.round((progress.loaded / progress.total) * 100) : 0

  return (
    <>
      <div className="text-center space-y-2">
        <div className="text-slate-300 text-lg font-medium">
          {appPhase === 'loading-subs' && `Loading subscriptions… ${subCount > 0 ? `(${subCount} so far)` : ''}`}
          {appPhase === 'loading-channels' && fetchPhase === 'playlists' && 'Resolving upload playlists…'}
          {appPhase === 'loading-channels' && fetchPhase === 'uploads' && 'Fetching last upload dates…'}
        </div>
        <div className="text-slate-500 text-sm">
          {appPhase === 'loading-channels' && progress.total > 0 &&
            `${progress.loaded} / ${progress.total} channels`}
        </div>
      </div>

      {appPhase === 'loading-channels' && progress.total > 0 && (
        <div className="w-full max-w-md">
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-red-500 rounded-full transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="text-right text-slate-600 text-xs mt-1">{pct}%</div>
        </div>
      )}

      <p className="text-slate-600 text-sm text-center max-w-sm">
        Large subscription lists can take a minute — each channel needs a separate API call.
      </p>
    </>
  )
}

function ErrorView({
  error,
  onRefresh,
  onSignOut,
}: {
  error: FetchError
  onRefresh: () => void
  onSignOut: () => void
}) {
  return (
    <div className="max-w-md text-center space-y-4">
      <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
      {error === 'auth' && (
        <>
          <p className="text-slate-300 font-medium">Session expired</p>
          <p className="text-slate-500 text-sm">Your Google session timed out mid-fetch.</p>
          <button onClick={onSignOut} className="btn-primary">Sign in again</button>
        </>
      )}
      {error === 'quota' && (
        <>
          <p className="text-slate-300 font-medium">Service requests can't be completed right now</p>
          <p className="text-slate-500 text-sm">
            Bookmark this page and try again later.
          </p>
          <button onClick={onSignOut} className="btn-secondary">Sign out</button>
        </>
      )}
      {error === 'unknown' && (
        <>
          <p className="text-slate-300 font-medium">Something went wrong</p>
          <p className="text-slate-500 text-sm">An unexpected error occurred while loading channel data.</p>
          <button onClick={onRefresh} className="btn-secondary">Retry</button>
        </>
      )}
    </div>
  )
}
