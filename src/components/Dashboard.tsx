import { LogOut, RefreshCw, Tv2, AlertCircle } from 'lucide-react'
import type { ChannelInfo } from '../types'
import type { FetchPhase, FetchError, FetchProgress } from '../hooks/useChannelFetcher'
import { SubscriptionTable } from './SubscriptionTable'
import { AdSlot } from './AdSlot'

interface Props {
  channels: ChannelInfo[]
  setChannels: React.Dispatch<React.SetStateAction<ChannelInfo[]>>
  appPhase: 'loading-subs' | 'loading-channels' | 'dashboard'
  fetchPhase: FetchPhase
  fetchError: FetchError
  subCount: number
  progress: FetchProgress
  token: string | null
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
          <AdSlot variant="banner" />
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
          <p className="text-slate-300 font-medium">YouTube API quota exhausted</p>
          <p className="text-slate-500 text-sm">
            You've hit the daily YouTube API limit. Cached data will be used for 24 hours —
            come back tomorrow for a fresh load.
          </p>
          <button onClick={onRefresh} className="btn-secondary">Try cached data</button>
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
