import { useCallback, useEffect, useRef, useState } from 'react'
import { initAuth, requestToken, revokeToken } from './lib/auth'
import { fetchAllSubscriptions, fetchUserProfile, QuotaError, AuthError } from './lib/youtube'
import { loadCache, clearCache } from './lib/cache'
import type { Subscription, UserProfile } from './types'
import { useChannelFetcher } from './hooks/useChannelFetcher'
import { LandingPage } from './components/LandingPage'
import { Dashboard } from './components/Dashboard'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

type AppPhase = 'landing' | 'loading-subs' | 'loading-channels' | 'dashboard'

export function App() {
  const [appPhase, setAppPhase] = useState<AppPhase>('landing')
  const [authError, setAuthError] = useState<string | null>(null)
  const [gsiReady, setGsiReady] = useState(false)
  const [subCount, setSubCount] = useState(0)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [dataTimestamp, setDataTimestamp] = useState<number | null>(null)
  const tokenRef = useRef<string | null>(null)

  const {
    channels,
    setChannels,
    phase: fetchPhase,
    progress,
    fetchError,
    fetchChannels,
    reportError,
    abort,
    loadFromCache,
  } = useChannelFetcher()

  // Poll for Google Identity Services to finish loading
  useEffect(() => {
    if (window.google?.accounts?.oauth2) {
      setGsiReady(true)
      return
    }
    const id = setInterval(() => {
      if (window.google?.accounts?.oauth2) {
        setGsiReady(true)
        clearInterval(id)
      }
    }, 100)
    return () => clearInterval(id)
  }, [])

  // Stable ref so the GIS callback always calls the latest handleTokenReceived
  const onTokenRef = useRef<((token: string) => Promise<void>) | undefined>(undefined)

  const handleTokenReceived = useCallback(
    async (token: string) => {
      tokenRef.current = token
      setAuthError(null)

      fetchUserProfile(token).then(setUserProfile).catch(() => {/* non-fatal */})

      const cached = loadCache()
      if (cached) {
        loadFromCache(cached.channels)
        setSubCount(cached.channels.length)
        setDataTimestamp(cached.savedAt)
        setAppPhase('dashboard')
        return
      }

      setAppPhase('loading-subs')
      const allSubs: Subscription[] = []

      try {
        await fetchAllSubscriptions(token, (page) => {
          allSubs.push(...page)
          setSubCount(allSubs.length)
        })
      } catch (err) {
        if (err instanceof QuotaError || err instanceof AuthError) {
          reportError(err)
          setAppPhase('dashboard')
        } else {
          setAuthError('Failed to load subscriptions — please sign in again.')
          setAppPhase('landing')
        }
        return
      }

      setAppPhase('loading-channels')
      await fetchChannels(allSubs, token)
      setDataTimestamp(Date.now())
      setAppPhase('dashboard')
    },
    [fetchChannels, loadFromCache],
  )

  onTokenRef.current = handleTokenReceived

  // Initialise GIS once the script is ready
  useEffect(() => {
    if (!gsiReady) return
    initAuth(
      CLIENT_ID,
      (token) => onTokenRef.current!(token),
      (msg) => setAuthError(msg),
    )
  }, [gsiReady])

  const handleSignIn = useCallback(() => {
    if (!gsiReady) {
      setAuthError('Google Sign-In is still loading — please wait a moment.')
      return
    }
    setAuthError(null)
    requestToken()
  }, [gsiReady])

  const handleSignOut = useCallback(async () => {
    abort()
    if (tokenRef.current) {
      await revokeToken(tokenRef.current)
      tokenRef.current = null
    }
    clearCache()
    setChannels([])
    setSubCount(0)
    setUserProfile(null)
    setDataTimestamp(null)
    setAppPhase('landing')
  }, [abort, setChannels])

  const handleRefresh = useCallback(() => {
    clearCache()
    if (tokenRef.current) {
      onTokenRef.current!(tokenRef.current)
    } else {
      requestToken()
    }
  }, [])

  if (appPhase === 'landing') {
    return <LandingPage onSignIn={handleSignIn} gsiReady={gsiReady} error={authError} />
  }

  return (
    <Dashboard
      channels={channels}
      setChannels={setChannels}
      appPhase={appPhase}
      fetchPhase={fetchPhase}
      fetchError={fetchError}
      subCount={subCount}
      progress={progress}
      token={tokenRef.current}
      userProfile={userProfile}
      dataTimestamp={dataTimestamp}
      onSignOut={handleSignOut}
      onRefresh={handleRefresh}
    />
  )
}
