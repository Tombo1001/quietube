import { AlertCircle, ChevronDown, Tv2 } from 'lucide-react'

interface Props {
  onSignIn: () => void
  gsiReady: boolean
  error: string | null
}

function scrollToLearnMore() {
  document.getElementById('learn-more')?.scrollIntoView({ behavior: 'smooth' })
}

export function LandingPage({ onSignIn, gsiReady, error }: Props) {
  return (
    <div className="bg-slate-950">
      {/* Hero — full viewport height */}
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="max-w-lg w-full text-center space-y-8">

          {/* Logo & name */}
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-3">
              <Tv2 className="w-10 h-10 text-red-500 opacity-60" />
              <h1 className="text-4xl font-bold text-slate-50 tracking-tight">QuieTube</h1>
            </div>
            <p className="text-slate-400 text-lg leading-relaxed">
              Find the YouTube channels that went silent.<br />
              Sort your subscriptions by last upload and quietly let go.
            </p>
          </div>

          {/* Feature bullets */}
          <ul className="text-slate-500 text-sm space-y-2 text-left max-w-xs mx-auto">
            {[
              'See every subscription sorted by last upload date',
              'One-click unsubscribe with a 5-second undo window',
              'Results cached for 24 hours to save your API quota',
              'No data ever leaves your browser',
            ].map((f) => (
              <li key={f} className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5 shrink-0">•</span>
                {f}
              </li>
            ))}
          </ul>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 bg-red-950/50 border border-red-800 rounded-lg p-3 text-red-300 text-sm text-left">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Sign-in button */}
          <button
            onClick={onSignIn}
            disabled={!gsiReady}
            className="w-full bg-red-600 hover:bg-red-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold py-3 px-6 rounded-xl transition-colors duration-150 cursor-pointer disabled:cursor-not-allowed"
          >
            {gsiReady ? 'Sign in with Google' : 'Loading…'}
          </button>

          <p className="text-slate-600 text-xs">
            Requires read access to your YouTube subscriptions and permission to unsubscribe.
            Your token is held in memory only and cleared when you leave.
          </p>

          {/* Learn More */}
          <button
            onClick={scrollToLearnMore}
            className="flex items-center gap-1.5 mx-auto border border-slate-600 hover:border-slate-400 text-slate-400 hover:text-slate-200 text-sm font-medium py-2 px-5 rounded-xl transition-colors duration-150 cursor-pointer"
          >
            Learn more
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Learn More section */}
      <div id="learn-more" className="max-w-5xl mx-auto px-6 py-20 scroll-mt-8">
        <div className="flex flex-col md:flex-row gap-10 items-start">

          {/* GIF — 60% on desktop, full width on mobile */}
          <div className="w-full md:w-3/5 rounded-xl overflow-hidden bg-slate-900 border border-slate-800 aspect-video">
            <img src="/quietube/demo.gif" alt="QuieTube in use" className="w-full h-full object-cover" />
          </div>

          {/* Features — 40% on desktop */}
          <div className="w-full md:w-2/5 space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-50 tracking-tight mb-2">
                Clean up your subscriptions
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                YouTube has no way to sort your subscriptions by activity. QuieTube fixes that — connect your account and instantly see which channels have gone quiet.
              </p>
            </div>

            <ul className="space-y-4">
              {[
                {
                  title: 'Sorted by silence',
                  detail: 'Your subscriptions ranked by days since last upload — the deadest channels surface first.',
                },
                {
                  title: 'One-click unsubscribe',
                  detail: 'Unsubscribe directly from the table with a 5-second undo in case you change your mind.',
                },
                {
                  title: 'Runs entirely in your browser',
                  detail: 'No account, no server, no data collection. Your YouTube token never leaves your device.',
                },
                {
                  title: 'Smart caching',
                  detail: 'Results are cached for 24 hours so you stay within YouTube\'s free API quota on repeat visits.',
                },
              ].map(({ title, detail }) => (
                <li key={title} className="flex items-start gap-3">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                  <div>
                    <p className="text-slate-200 text-sm font-medium">{title}</p>
                    <p className="text-slate-500 text-sm leading-relaxed">{detail}</p>
                  </div>
                </li>
              ))}
            </ul>

            <button
              onClick={onSignIn}
              disabled={!gsiReady}
              className="w-full bg-red-600 hover:bg-red-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold py-3 px-6 rounded-xl transition-colors duration-150 cursor-pointer disabled:cursor-not-allowed"
            >
              {gsiReady ? 'Sign in with Google' : 'Loading…'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
